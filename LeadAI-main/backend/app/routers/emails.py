from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import socket
import smtplib
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
from app.security_utils import decrypt_credential
from app.config import settings

router = APIRouter(prefix="/emails", tags=["emails"])

def resolve_ipv4_host(host: str) -> str:
    """
    Resolves a hostname (e.g., smtp.gmail.com) directly to an IPv4 IP address.
    Prevents IPv6 socket timeouts on dual-stack Windows/ISP networks.
    """
    try:
        infos = socket.getaddrinfo(host, None, socket.AF_INET, socket.SOCK_STREAM)
        if infos and len(infos) > 0:
            return infos[0][4][0]
    except Exception:
        pass
    return host


def create_smtp_server(host: str, port: int, encryption: str = "TLS", timeout: float = 10.0):
    """
    Creates an SMTP or SMTP_SSL connection enforcing IPv4 resolution and host SSL verification.
    """
    enc_upper = (encryption or "TLS").upper()
    target_ip = resolve_ipv4_host(host)

    orig_getaddrinfo = socket.getaddrinfo

    def forced_ipv4_getaddrinfo(h, p, family=0, type=0, proto=0, flags=0):
        if h == host:
            return orig_getaddrinfo(target_ip, p, socket.AF_INET, type, proto, flags)
        return orig_getaddrinfo(h, p, family, type, proto, flags)

    socket.getaddrinfo = forced_ipv4_getaddrinfo
    try:
        if port == 465 or enc_upper == "SSL":
            server = smtplib.SMTP_SSL(host, port or 465, timeout=timeout)
        else:
            server = smtplib.SMTP(host, port or 587, timeout=timeout)
            server.ehlo()
            if enc_upper != "NONE":
                server.starttls()
                server.ehlo()
        return server
    finally:
        socket.getaddrinfo = orig_getaddrinfo



def test_smtp_connection_for_account(account: EmployeeEmailAccount, db: Session) -> dict:
    """
    Validates credentials by attempting a real SMTP connection for a specific employee email account.
    Includes multi-port fallback (Port 465 SSL & Port 587 TLS) to prevent timeout failures on cloud hosts/ISPs.
    """
    if not account or not account.smtp_host or not account.smtp_username:
        status_msg = "Connection Failed: Missing host or username configuration"
        account.last_tested_at = datetime.utcnow()
        account.last_test_status = status_msg
        db.commit()
        return {"status": "failed", "message": status_msg, "last_test_status": status_msg}

    decrypted_pw = decrypt_credential(account.encrypted_smtp_password or "")
    if not decrypted_pw:
        status_msg = "Connection Failed: Password not configured"
        account.last_tested_at = datetime.utcnow()
        account.last_test_status = status_msg
        db.commit()
        return {"status": "failed", "message": status_msg, "last_test_status": status_msg}

    primary_port = account.smtp_port or (465 if (account.encryption or "").upper() == "SSL" else 587)
    primary_enc = account.encryption or ("SSL" if primary_port == 465 else "TLS")

    ports_to_try = [
        (primary_port, primary_enc),
        (465 if primary_port != 465 else 587, "SSL" if primary_port != 465 else "TLS")
    ]

    last_error = ""
    for port, enc in ports_to_try:
        try:
            server = create_smtp_server(
                host=account.smtp_host,
                port=port,
                encryption=enc,
                timeout=6.0
            )
            server.login(account.smtp_username, decrypted_pw.strip())
            server.quit()

            # Auto-save working port & encryption if alternate port succeeded
            if port != account.smtp_port or enc != account.encryption:
                account.smtp_port = port
                account.encryption = enc

            status_msg = "Connected"
            account.last_tested_at = datetime.utcnow()
            account.last_test_status = status_msg
            db.commit()
            return {
                "status": "success",
                "message": f"Successfully authenticated with {account.smtp_host}:{port} ({enc})",
                "last_tested_at": account.last_tested_at.isoformat(),
                "last_test_status": status_msg
            }
        except smtplib.SMTPAuthenticationError:
            status_msg = "Connection Failed: Invalid credentials / auth error (Use Gmail 16-char App Password)"
            account.last_tested_at = datetime.utcnow()
            account.last_test_status = status_msg
            db.commit()
            return {"status": "failed", "message": status_msg, "last_test_status": status_msg}
        except Exception as e:
            last_error = str(e)

    status_msg = f"Connection Failed: {last_error or 'timed out'}"
    account.last_tested_at = datetime.utcnow()
    account.last_test_status = status_msg
    db.commit()
    return {"status": "failed", "message": status_msg, "last_test_status": status_msg}



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
    Sends an outreach email dynamically using the selected employee's authenticated email account.
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

    # Load Employee's Email Account
    email_account = target_user.email_account
    
    # Check if configured
    if not email_account or not email_account.is_active or not email_account.smtp_host or not email_account.smtp_username:
        # Fallback ONLY if current_user doesn't have an account and global .env is populated
        if settings.SMTP_USER and settings.SMTP_PASS and not req.employee_id:
            # Temporary fallback for unconfigured single admin user
            sender_email = settings.EMAIL_FROM or settings.SMTP_USER
            provider_name = "Global ENV SMTP"
            smtp_host = settings.SMTP_HOST
            smtp_port = settings.SMTP_PORT
            smtp_user = settings.SMTP_USER
            smtp_pass = settings.SMTP_PASS
            encryption = "TLS"
            sender_name = settings.DEFAULT_SENDER_NAME or target_user.full_name or "BLUEBOXX Team"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"No verified sending email account is available for employee '{target_user.full_name or target_user.email}'. Configure an employee email account first."
            )
    else:
        sender_email = email_account.email
        provider_name = email_account.provider or "Employee SMTP"
        smtp_host = email_account.smtp_host
        smtp_port = email_account.smtp_port or 587
        smtp_user = email_account.smtp_username
        smtp_pass = decrypt_credential(email_account.encrypted_smtp_password or "")
        encryption = email_account.encryption or "TLS"
        sender_name = email_account.sender_name or target_user.full_name or target_user.email

    if not smtp_pass:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or missing password for employee account '{sender_email}'. Please test connection & re-enter password."
        )

    # Attach HTML footer signoff
    final_body = req.body
    if "table" not in final_body.lower() and company.company_name not in final_body:
        footer_html = generate_html_email_footer(target_user, company)
        final_body = f"{final_body}<br/>{footer_html}"

    sent_successfully = False
    last_smtp_error = ""

    primary_port = smtp_port or (465 if (encryption or "").upper() == "SSL" else 587)
    primary_enc = encryption or ("SSL" if primary_port == 465 else "TLS")
    ports_to_try = [
        (primary_port, primary_enc),
        (465 if primary_port != 465 else 587, "SSL" if primary_port != 465 else "TLS")
    ]

    for port, enc in ports_to_try:
        try:
            msg = MIMEMultipart('alternative')
            from_formatted = f"{sender_name} <{sender_email}>"
            msg['From'] = from_formatted
            msg['To'] = req.recipient_email
            msg['Subject'] = req.subject
            msg.attach(MIMEText(final_body, 'html'))

            server = create_smtp_server(smtp_host, port, encryption=enc, timeout=7.0)
            server.login(smtp_user, smtp_pass.strip())
            server.sendmail(sender_email, req.recipient_email, msg.as_string())
            server.quit()
            sent_successfully = True
            break
        except smtplib.SMTPAuthenticationError:
            last_smtp_error = f"Authentication failed for user '{smtp_user}' on host '{smtp_host}'. If using Gmail, please use a 16-character App Password."
            break
        except Exception as e:
            last_smtp_error = str(e)


    default_campaign = db.query(Campaign).filter(Campaign.name == "Direct Outreach").first()
    if not default_campaign:
        default_campaign = Campaign(name="Direct Outreach", user_id=target_user.id)
        db.add(default_campaign)
        db.commit()
        db.refresh(default_campaign)
        
    email_status = "Sent" if sent_successfully else "Failed"

    new_email = Email(
        campaign_id=default_campaign.id,
        lead_id=req.lead_id,
        sender_id=target_user.id,
        sender_email=sender_email,
        recipient_email=req.recipient_email,
        provider=provider_name,
        error_message=last_smtp_error if not sent_successfully else None,
        generated_body=final_body,
        subject=req.subject,
        status=email_status,
        sent_at=datetime.utcnow()
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
            "sender_email": sender_email
        }
    else:
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email using account '{sender_email}' via {smtp_host}: {last_smtp_error or 'Connection timed out'}"
        )
