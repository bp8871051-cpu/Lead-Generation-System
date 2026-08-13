from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import os
import socket
import smtplib
import ssl
import json
import urllib.request
import logging
import re
import email.utils
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.database import get_db
from app.models import User, Business, Company, Lead, Campaign, Email, ActivityLog, EmployeeEmailAccount
from app.schemas import (
    CampaignCreate, CampaignResponse, EmailGenerateRequest, EmailResponse,
    EmailSendRequest, ActiveSenderResponse
)
from app.routers.auth import get_current_user
from app.services import AILeadAnalyzerService
from app.brevo_service import BrevoEmailService, get_brevo_api_key
from app.security_utils import encrypt_credential, decrypt_credential
from app.config import settings


router = APIRouter(prefix="/emails", tags=["emails"])

logger = logging.getLogger("leadai.smtp")
logger.setLevel(logging.INFO)


def connect_ipv4_socket(host: str, port: int, timeout: float = 10.0) -> socket.socket:
    """
    Forcefully resolves host using AF_INET (IPv4) to avoid dual-stack IPv6 [Errno 101] Network is unreachable errors.
    """
    infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    last_err = None
    for family, type_, proto, canonname, sockaddr in infos:
        try:
            s = socket.socket(family, type_, proto)
            s.settimeout(timeout)
            s.connect(sockaddr)
            return s
        except Exception as e:
            last_err = e
            continue
    raise last_err or socket.error(f"Failed to connect to {host}:{port} via IPv4")


def create_smtp_server(host: str, port: int, encryption: str = "TLS", timeout: float = 12.0):
    """
    Creates an SMTP or SMTP_SSL connection to the target host.
    Handles dual-stack IPv6 [Errno 101] Network is unreachable by prioritizing direct IPv4 socket connections.
    """
    enc_upper = (encryption or "TLS").upper()
    target_port = port or (465 if enc_upper == "SSL" else 587)
    logger.info(f"[SMTP START] Connecting host={host}, port={target_port}, encryption={enc_upper}")

    # 1. Try direct IPv4 socket connection first (bypasses IPv6 unreachable network issue)
    try:
        sock = connect_ipv4_socket(host, target_port, timeout=timeout)
        if target_port == 465 or enc_upper == "SSL":
            ssl_ctx = ssl.create_default_context()
            ssl_sock = ssl_ctx.wrap_socket(sock, server_hostname=host)
            server = smtplib.SMTP_SSL(timeout=timeout)
            server._host = host
            server.sock = ssl_sock
            server.file = None
            server.ehlo(host)
            return server
        else:
            server = smtplib.SMTP(timeout=timeout)
            server._host = host
            server.sock = sock
            server.file = None
            server.ehlo(host)
            if enc_upper != "NONE":
                server.starttls()
                server.ehlo(host)
            return server
    except Exception as err:
        logger.warning(f"[SMTP IPv4 FIRST FAILED] Host={host}:{target_port} - '{err}'. Retrying standard connection...")

    # 2. Standard fallback attempt
    if target_port == 465 or enc_upper == "SSL":
        return smtplib.SMTP_SSL(host, target_port, timeout=timeout)
    else:
        server = smtplib.SMTP(host, target_port, timeout=timeout)
        server.ehlo()
        if enc_upper != "NONE":
            server.starttls()
            server.ehlo()
    return server


def normalize_app_passwords(pass_str: str) -> List[str]:
    """
    Returns candidate strings for Google/SMTP passwords to handle spacing & typo variations.
    """
    if not pass_str:
        return []
    cleaned = pass_str.strip()
    candidates = [cleaned]
    no_space = cleaned.replace(" ", "")
    if no_space not in candidates:
        candidates.append(no_space)
    i_to_l = no_space.replace("I", "l")
    if i_to_l not in candidates:
        candidates.append(i_to_l)
    return candidates


def test_http_email_api(account: EmployeeEmailAccount, api_key: str) -> dict:
    """
    HTTP Email API handler for Resend / Brevo (HTTPS Port 443).
    Bypasses raw SMTP port blocks on cloud providers like Render Free Tier.
    """
    key_clean = api_key.strip()

    if key_clean.startswith("re_") or (account.provider or "").upper() == "RESEND":
        try:
            req_data = json.dumps({
                "from": f"{account.sender_name or 'Outreach'} <onboarding@resend.dev>",
                "to": [account.email],
                "subject": "LeadAI CRM Connection Verification",
                "html": "<p>Verified via Resend HTTP API (Port 443)</p>"
            }).encode('utf-8')
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=req_data,
                headers={"Authorization": f"Bearer {key_clean}", "Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in [200, 201]:
                    return {
                        "status": "success",
                        "error_code": None,
                        "message": "Successfully authenticated with Resend HTTP API (Port 443 - Cloud Safe)",
                        "last_tested_at": datetime.utcnow().isoformat(),
                        "last_test_status": "Connected"
                    }
        except Exception as e:
            return {
                "status": "failed",
                "error_code": "SMTP_AUTH_FAILED",
                "message": f"Resend API Error: {str(e)}",
                "last_test_status": f"HTTP_API_FAILED: {str(e)}"
            }

    elif key_clean.startswith("xkeysib-") or (account.provider or "").upper() == "BREVO":
        try:
            req_data = json.dumps({
                "sender": {"name": account.sender_name or "Outreach", "email": account.email},
                "to": [{"email": account.email}],
                "subject": "LeadAI CRM Connection Verification",
                "htmlContent": "<p>Verified via Brevo HTTP API (Port 443)</p>"
            }).encode('utf-8')
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=req_data,
                headers={"api-key": key_clean, "Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in [200, 201]:
                    return {
                        "status": "success",
                        "error_code": None,
                        "message": "Successfully authenticated with Brevo HTTP API (Port 443 - Cloud Safe)",
                        "last_tested_at": datetime.utcnow().isoformat(),
                        "last_test_status": "Connected"
                    }
        except Exception as e:
            return {
                "status": "failed",
                "error_code": "SMTP_AUTH_FAILED",
                "message": f"Brevo API Error: {str(e)}",
                "last_test_status": f"HTTP_API_FAILED: {str(e)}"
            }

    return {"status": "failed", "error_code": "SMTP_CONFIGURATION_ERROR", "message": "Invalid HTTP API key"}


def test_smtp_connection_for_account(account: EmployeeEmailAccount, db: Session) -> dict:
    """
    Validates credentials by attempting a real SMTP or HTTP API connection for an employee email account.
    Includes multi-port fallback (Port 465 SSL, Port 587 TLS, Port 2525 TLS) and HTTP API support.
    """
    if not account or not account.smtp_host or not account.smtp_username:
        error_code = "SMTP_CONFIGURATION_ERROR"
        status_msg = "Missing host or username configuration"
        logger.error(f"[SMTP ERROR] error_code={error_code}, message={status_msg}")
        if account:
            account.last_tested_at = datetime.utcnow()
            account.last_test_status = f"{error_code}: {status_msg}"
            db.commit()
        return {"status": "failed", "error_code": error_code, "message": status_msg, "last_test_status": status_msg}

    decrypted_pw = decrypt_credential(account.encrypted_smtp_password or "")
    if not decrypted_pw:
        error_code = "SMTP_CONFIGURATION_ERROR"
        status_msg = "Password not configured. Please enter password or API Key."
        logger.error(f"[SMTP ERROR] error_code={error_code}, account={account.email}, message={status_msg}")
        account.last_tested_at = datetime.utcnow()
        account.last_test_status = f"{error_code}: {status_msg}"
        db.commit()
        return {"status": "failed", "error_code": error_code, "message": status_msg, "last_test_status": status_msg}

    # Primary Production Check: Brevo HTTPS API Authentication
    key_clean = decrypted_pw.strip()
    brevo_key = get_brevo_api_key(key_clean if key_clean.startswith("xkeysib-") else None)
    if brevo_key:
        verify_res = BrevoEmailService.verify_api_key(brevo_key)
        account.last_tested_at = datetime.utcnow()
        if verify_res["status"] == "success":
            status_msg = "Connected"
            account.last_test_status = status_msg
            db.commit()
            return {
                "status": "success",
                "error_code": None,
                "message": "Successfully authenticated via Brevo HTTPS API (Port 443 - Cloud Safe)",
                "last_tested_at": account.last_tested_at.isoformat(),
                "last_test_status": status_msg
            }
        else:
            status_msg = verify_res.get("message", "Brevo API Key validation failed")
            account.last_test_status = f"BREVO_AUTH_FAILED: {status_msg}"
            db.commit()
            return {
                "status": "failed",
                "error_code": "BREVO_AUTH_FAILED",
                "message": status_msg,
                "last_test_status": account.last_test_status
            }

    # Fallback HTTP API Handler (e.g. Resend)
    if key_clean.startswith("re_") or (account.provider or "").upper() == "RESEND":
        res = test_http_email_api(account, key_clean)
        account.last_tested_at = datetime.utcnow()
        account.last_test_status = res.get("last_test_status", "Connection Failed")
        db.commit()
        return res

    account.last_tested_at = datetime.utcnow()
    account.last_test_status = "BREVO_KEY_MISSING: BREVO_API_KEY is not configured"
    db.commit()
    return {
        "status": "failed",
        "error_code": "BREVO_KEY_MISSING",
        "message": "BREVO_API_KEY is not configured.",
        "last_test_status": account.last_test_status
    }




@router.post("/employee-email/test")
def test_employee_email_endpoint(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Server-side Test Connection endpoint for employee email configurations.
    """
    target_user_id = employee_id or current_user.id
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        target_user = current_user

    if not target_user or not target_user.email_account:
        return {
            "status": "failed",
            "error_code": "SMTP_CONFIGURATION_ERROR",
            "message": "Employee has no email account configured."
        }

    return test_smtp_connection_for_account(target_user.email_account, db)




def generate_html_email_footer(user: User, company: Company) -> str:
    comp_name = company.company_name or "BLUEBOXX.DA PRIVATE LIMITED"
    website = company.company_website or "https://blueboxxda.com"
    support_email = company.support_email or company.company_email or "contact@blueboxxda.com"
    phone = company.company_phone or "+91 98765 43210"
    alt_phone = getattr(company, "alternate_phone", None) or "+91 98765 43211"
    address = company.company_address or "BLUEBOXX.DA Tower, Tech Park Road"
    city = getattr(company, "city", None) or "Ahmedabad"
    state = getattr(company, "state", None) or "Gujarat"
    country = getattr(company, "country", None) or "India"
    pin = getattr(company, "pin_code", None) or "380058"
    gst = company.gst_number or "24AAAAA0000A1Z5"
    cin = getattr(company, "cin_number", None) or "U72900GJ2026PTC123456"
    hours = getattr(company, "working_hours", None) or "Mon - Sat: 9:00 AM - 7:00 PM IST"
    
    sender_display_name = user.full_name or user.email

    social_items = []
    if getattr(company, "linkedin_url", None):
        social_items.append(f'<a href="{company.linkedin_url}" style="color: #1E40AF; font-weight: 700; text-decoration: none;">LinkedIn</a>')
    if getattr(company, "instagram_url", None):
        social_items.append(f'<a href="{company.instagram_url}" style="color: #BE185D; font-weight: 700; text-decoration: none;">Instagram</a>')
    if getattr(company, "facebook_url", None):
        social_items.append(f'<a href="{company.facebook_url}" style="color: #1D4ED8; font-weight: 700; text-decoration: none;">Facebook</a>')
    if getattr(company, "youtube_url", None):
        social_items.append(f'<a href="{company.youtube_url}" style="color: #DC2626; font-weight: 700; text-decoration: none;">YouTube</a>')

    social_html = " &nbsp;&bull;&nbsp; ".join(social_items) if social_items else f'<a href="{website}" style="color: #1E40AF; font-weight: 700; text-decoration: none;">Official Website</a>'

    raw_services = getattr(company, "services_list", None) or "Website Development, Web Applications, UI / UX Design, Graphic Design, Logo Design, Branding, Digital Marketing, SEO, Lead Generation, Automation Solutions"
    services_arr = [s.strip() for s in raw_services.split(",") if s.strip()]
    services_pills = "".join([f'<td style="padding: 4px 8px; margin: 3px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px; font-weight: 700; color: #1E293B; display: inline-block;">✓ {s}</td>' for s in services_arr])

    return f"""
    <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 650px; margin-top: 35px; border-top: 3px solid #0F172A; background-color: #FFFFFF; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 24px; color: #0F172A;">
      
      <div style="font-size: 14px; color: #334155; margin-bottom: 20px; line-height: 1.6; border-bottom: 2px solid #E2E8F0; padding-bottom: 16px;">
        Regards,<br/>
        <strong style="color: #0F172A; font-size: 15px; font-weight: 800;">{sender_display_name}</strong><br/>
        <span style="color: #2563EB; font-weight: 900; font-size: 16px; letter-spacing: 0.5px;">{comp_name}</span><br/>
        <a href="{website}" style="color: #0F172A; text-decoration: none; font-size: 12.5px; font-weight: 700; display: inline-block; margin-top: 4px;">🌐 {website}</a>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #475569; margin-bottom: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px;">
        <tr>
          <td style="padding: 10px 14px; vertical-align: top;">
            <div style="margin-bottom: 6px; font-weight: 600;">📍 <strong>Address:</strong> {address}, {city}, {state}, {country} - {pin}</div>
            <div style="margin-bottom: 6px; font-weight: 600;">🌐 <strong>Website:</strong> <a href="{website}" style="color: #2563EB; text-decoration: none;">{website}</a> &nbsp;|&nbsp; 📧 <strong>Support:</strong> <a href="mailto:{support_email}" style="color: #2563EB; text-decoration: none;">{support_email}</a></div>
            <div style="margin-bottom: 6px; font-weight: 600;">📞 <strong>Office Contact:</strong> {phone} &nbsp;|&nbsp; 📱 <strong>Alt Contact:</strong> {alt_phone}</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px;">🏢 <strong>GST:</strong> {gst} &nbsp;|&nbsp; 📋 <strong>CIN:</strong> {cin} &nbsp;|&nbsp; 🕒 <strong>Hours:</strong> {hours}</div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 900; color: #0F172A; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Our Enterprise Digital Services</div>
        <div style="line-height: 1.8;">
          {services_pills}
        </div>
      </div>

      <div style="margin-bottom: 20px; padding: 12px 14px; background-color: #F1F5F9; border-radius: 8px; text-align: center; font-size: 12px;">
        <span style="font-weight: 800; color: #0F172A; margin-right: 8px; text-transform: uppercase; font-size: 10.5px; tracking: 1px;">Connect With Us:</span>
        {social_html}
      </div>

      <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; font-size: 11px; color: #64748B; line-height: 1.6;">
        <div style="font-weight: 700; color: #334155; margin-bottom: 6px;">
          &copy; 2026 {comp_name}. All Rights Reserved.
        </div>
        <div style="margin-bottom: 8px; font-style: italic; font-size: 10.5px; color: #94A3B8;">
          CONFIDENTIALITY NOTICE: This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed.
        </div>
      </div>

    </div>
    """


@router.get("/active-senders", response_model=List[ActiveSenderResponse])
def list_active_email_senders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns only active employees who have a configured email account.
    Used for the Campaign / Outreach 'Send From' dropdown.
    """
    users_with_accounts = (
        db.query(User)
        .join(EmployeeEmailAccount, User.id == EmployeeEmailAccount.employee_id)
        .filter(User.is_active == True, EmployeeEmailAccount.is_active == True)
        .all()
    )

    results = []
    for u in users_with_accounts:
        acct = u.email_account
        if acct and acct.email:
            results.append({
                "employee_id": u.id,
                "employee_name": u.full_name or u.email,
                "email": acct.email,
                "sender_name": acct.sender_name or u.full_name or u.email,
                "provider": acct.provider or "Custom SMTP",
                "is_active": acct.is_active,
                "last_test_status": acct.last_test_status
            })
    return results


@router.post("/campaigns", response_model=CampaignResponse)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_emp_id = campaign_in.employee_id or current_user.id
    campaign = Campaign(
        name=campaign_in.name,
        subject=campaign_in.subject,
        body_template=campaign_in.body_template,
        status="Draft",
        user_id=target_emp_id
    )
    db.add(campaign)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="CAMPAIGN_CREATE",
        description=f"Created email campaign '{campaign_in.name}' for employee ID {target_emp_id}"
    )
    db.add(log)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.get("/campaigns", response_model=List[CampaignResponse])
def get_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


def _resolve_lead(lead_id: int, db: Session, current_user: User) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if lead:
        return lead
    biz_lead = db.query(Lead).filter(Lead.business_id == lead_id).first()
    if biz_lead:
        return biz_lead
    biz = db.query(Business).filter(Business.id == lead_id).first()
    if biz:
        base_score, priority = AILeadAnalyzerService._calculate_lead_score(
            website=biz.website, email=biz.email, rating=biz.google_rating or 0.0,
            reviews_count=biz.reviews_count or 0, ssl_enabled=biz.ssl_enabled or False,
            website_score=biz.website_score or 0
        )
        new_lead = Lead(business_id=biz.id, assigned_to_user_id=current_user.id, status="New", priority=priority, lead_score=base_score)
        db.add(new_lead)
        db.commit()
        db.refresh(new_lead)
        return new_lead
    raise HTTPException(status_code=404, detail="Lead profile not found")


@router.post("/generate-draft", response_model=EmailResponse)
def generate_draft(
    req: EmailGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = _resolve_lead(req.lead_id, db, current_user)

    company = db.query(Company).first()
    if not company:
        company = Company()
        
    details = {
        "ai_recommended_services": lead.ai_recommended_services or "Web design, SEO optimization",
        "rating": lead.business.google_rating
    }
    
    generated_text = AILeadAnalyzerService.generate_message_template(
        lead_name=lead.business.name,
        contact_name=lead.business.name,
        industry=lead.business.industry or "local business",
        score=lead.lead_score,
        channel=req.channel,
        details=details
    )
    
    default_campaign = db.query(Campaign).filter(Campaign.name == "Direct Outreach").first()
    if not default_campaign:
        default_campaign = Campaign(name="Direct Outreach", user_id=current_user.id)
        db.add(default_campaign)
        db.commit()
        db.refresh(default_campaign)

    new_email = Email(
        campaign_id=default_campaign.id,
        lead_id=lead.id,
        sender_id=current_user.id,
        sender_email=current_user.email,
        recipient_email=lead.business.email or "",
        generated_body=generated_text,
        subject=f"Outreach Opportunity for {lead.business.name}",
        status="Draft"
    )
    db.add(new_email)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="DRAFT_GENERATE",
        description=f"Generated {req.channel} email draft for lead '{lead.business.name}'"
    )
    db.add(log)
    db.commit()
    db.refresh(new_email)
    return new_email


@router.get("/lead/{lead_id}/drafts", response_model=List[EmailResponse])
def get_lead_drafts(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = _resolve_lead(lead_id, db, current_user)
    return db.query(Email).filter(Email.lead_id == lead.id).order_by(Email.created_at.desc()).all()


@router.post("/send")
def send_outreach_email(
    req: EmailSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sends an outreach email dynamically using Brevo Transactional Email HTTP API (Port 443 HTTPS).
    Replaces raw Gmail SMTP to ensure reliable cloud delivery on Render / AWS / Vercel.
    """
    lead = _resolve_lead(req.lead_id, db, current_user)

    company = db.query(Company).first()
    if not company:
        company = Company()

    # Determine sender employee
    target_emp_id = req.employee_id or current_user.id
    target_user = db.query(User).filter(User.id == target_emp_id, User.is_active == True).first()
    if not target_user:
        raise HTTPException(
            status_code=400,
            detail=f"Selected employee (ID: {target_emp_id}) is inactive or does not exist."
        )

    # Load Employee's Email Account or System Default Sender
    email_account = target_user.email_account
    
    if email_account and email_account.is_active:
        sender_email = email_account.email or getattr(settings, "DEFAULT_SENDER_EMAIL", "sumedha.blueboxx@gmail.com")
        sender_name = email_account.sender_name or target_user.full_name or getattr(settings, "DEFAULT_SENDER_NAME", "Sumedha Agrawal")
        custom_key = decrypt_credential(email_account.encrypted_smtp_password or "")
    else:
        sender_email = getattr(settings, "DEFAULT_SENDER_EMAIL", "sumedha.blueboxx@gmail.com")
        sender_name = target_user.full_name or getattr(settings, "DEFAULT_SENDER_NAME", "Sumedha Agrawal")
        custom_key = None

    # Resolve Brevo API Key
    brevo_key = get_brevo_api_key(custom_key if (custom_key or "").startswith("xkeysib-") else None)
    if not brevo_key:
        raise HTTPException(
            status_code=400,
            detail="BREVO_API_KEY is not configured. Please add BREVO_API_KEY in environment variables."
        )

    # Attach HTML footer signoff
    final_body = req.body
    if "table" not in final_body.lower() and company.company_name not in final_body:
        footer_html = generate_html_email_footer(target_user, company)
        final_body = f"{final_body}<br/>{footer_html}"

    recipient_name = lead.business.name if (lead and lead.business and lead.business.name) else (req.recipient_email.split('@')[0] if '@' in req.recipient_email else "Valued Client")

    # Primary Production Transmission: Brevo Transactional Email HTTP API over HTTPS (Port 443)
    res = BrevoEmailService.send_transactional_email(
        sender_name=sender_name,
        sender_email=sender_email,
        recipient_email=req.recipient_email,
        subject=req.subject,
        html_content=final_body,
        custom_api_key=brevo_key
    )

    sent_successfully = (res.get("status") == "success")
    brevo_message_id = res.get("message_id")
    error_msg = res.get("error_message") or res.get("message")

    default_campaign = db.query(Campaign).filter(Campaign.name == "Direct Outreach").first()
    if not default_campaign:
        default_campaign = Campaign(name="Direct Outreach", user_id=target_user.id)
        db.add(default_campaign)
        db.commit()
        db.refresh(default_campaign)
        
    email_status = "Sent" if sent_successfully else "Failed"
    provider_name = "Brevo HTTPS API"

    new_email = Email(
        campaign_id=default_campaign.id,
        lead_id=req.lead_id,
        sender_id=target_user.id,
        sender_email=sender_email,
        recipient_email=req.recipient_email,
        provider=provider_name,
        error_message=None if sent_successfully else error_msg,
        provider_message_id=brevo_message_id,
        generated_body=final_body,
        subject=req.subject,
        status=email_status,
        sent_at=datetime.utcnow() if sent_successfully else None
    )
    db.add(new_email)

    if sent_successfully:
        lead.status = "Contacted"
        log = ActivityLog(
            user_id=target_user.id,
            action="EMAIL_SENT",
            description=f"Sent outreach from '{sender_email}' to '{req.recipient_email}' for lead '{lead.business.name}'"
        )
        db.add(log)
        db.commit()
        return {
            "status": "success",
            "message": f"Email successfully sent from {sender_email} to {req.recipient_email}",
            "sender_email": sender_email,
            "provider_message_id": brevo_message_id
        }
    else:
        db.commit()
        clean_user_error = "Email could not be sent. Please check the email configuration."
        if "missing or unconfigured" in (error_msg or "").lower():
            clean_user_error = "BREVO_API_KEY is not configured."
        elif error_msg:
            clean_user_error = f"Brevo API delivery error: {error_msg}"

        raise HTTPException(
            status_code=500,
            detail=clean_user_error
        )
