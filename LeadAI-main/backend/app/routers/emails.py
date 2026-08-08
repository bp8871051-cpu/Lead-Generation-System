from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
import socket
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.database import get_db
from app.models import User, Business, Company, Lead, Campaign, Email, ActivityLog
from app.schemas import CampaignCreate, CampaignResponse, EmailGenerateRequest, EmailResponse
from app.routers.auth import get_current_user
from app.services import AILeadAnalyzerService
from app.config import settings

router = APIRouter(prefix="/emails", tags=["emails"])

def create_smtp_server(host: str, port: int, timeout: float = 12.0):
    """
    Creates an SMTP or SMTP_SSL connection enforcing IPv4 socket resolution.
    This prevents [Errno 101] Network is unreachable errors on cloud platforms like Render/Docker.
    """
    orig_getaddrinfo = socket.getaddrinfo

    def ipv4_getaddrinfo(h, p, family=0, type=0, proto=0, flags=0):
        return orig_getaddrinfo(h, p, socket.AF_INET, type, proto, flags)

    socket.getaddrinfo = ipv4_getaddrinfo
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, 465, timeout=timeout)
        else:
            server = smtplib.SMTP(host, port, timeout=timeout)
            server.ehlo()
            server.starttls()
            server.ehlo()
        return server
    finally:
        socket.getaddrinfo = orig_getaddrinfo


def generate_html_email_footer(user: User, company: Company) -> str:
    # Resolve company fields with BLUEBOXX.DA PRIVATE LIMITED fallbacks
    comp_name = company.company_name or "BLUEBOXX.DA PRIVATE LIMITED"
    brand_name = getattr(company, "brand_name", None) or "BLUEBOXX.DA"
    tagline = getattr(company, "tagline", None) or "Turning Ideas Into Digital Excellence"
    logo_path = company.company_logo or "/blueboxx_logo.png"
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
    
    # Social links
    social_items = []
    if getattr(company, "linkedin_url", None):
        social_items.append(f'<a href="{company.linkedin_url}" style="color: #1E40AF; font-weight: 700; text-decoration: none;">LinkedIn</a>')
    if getattr(company, "instagram_url", None):
        social_items.append(f'<a href="{company.instagram_url}" style="color: #BE185D; font-weight: 700; text-decoration: none;">Instagram</a>')
    if getattr(company, "facebook_url", None):
        social_items.append(f'<a href="{company.facebook_url}" style="color: #1D4ED8; font-weight: 700; text-decoration: none;">Facebook</a>')
    if getattr(company, "youtube_url", None):
        social_items.append(f'<a href="{company.youtube_url}" style="color: #DC2626; font-weight: 700; text-decoration: none;">YouTube</a>')
    if getattr(company, "behance_url", None):
        social_items.append(f'<a href="{company.behance_url}" style="color: #2563EB; font-weight: 700; text-decoration: none;">Behance</a>')
    if getattr(company, "dribbble_url", None):
        social_items.append(f'<a href="{company.dribbble_url}" style="color: #EA4C89; font-weight: 700; text-decoration: none;">Dribbble</a>')
    if getattr(company, "twitter_url", None):
        social_items.append(f'<a href="{company.twitter_url}" style="color: #0F172A; font-weight: 700; text-decoration: none;">X (Twitter)</a>')
    if getattr(company, "whatsapp_number", None):
        wa_num = company.whatsapp_number.replace(" ", "").replace("+", "")
        social_items.append(f'<a href="https://wa.me/{wa_num}" style="color: #16A34A; font-weight: 700; text-decoration: none;">WhatsApp Business</a>')

    social_html = " &nbsp;&bull;&nbsp; ".join(social_items) if social_items else '<a href="https://blueboxxda.com" style="color: #1E40AF; font-weight: 700; text-decoration: none;">Official Website</a>'

    # Official Company Services Grid
    raw_services = getattr(company, "services_list", None) or "Website Development, Web Applications, UI / UX Design, Graphic Design, Logo Design, Branding, Motion Graphics, Animation, Video Editing, Digital Marketing, SEO, Social Media Marketing, Lead Generation, CRM Development, Automation Solutions"
    services_arr = [s.strip() for s in raw_services.split(",") if s.strip()]
    services_pills = "".join([f'<td style="padding: 4px 8px; margin: 3px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 11px; font-weight: 700; color: #1E293B; display: inline-block;">✓ {s}</td>' for s in services_arr])

    return f"""
    <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 650px; margin-top: 35px; border-top: 3px solid #0F172A; background-color: #FFFFFF; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 24px; color: #0F172A;">
      
      <!-- CEO & Founder Signoff with Company Name & Website URL -->
      <div style="font-size: 14px; color: #334155; margin-bottom: 20px; line-height: 1.6; border-bottom: 2px solid #E2E8F0; padding-bottom: 16px;">
        Regards,<br/>
        <strong style="color: #0F172A; font-size: 15px; font-weight: 800;">CEO & Founder</strong><br/>
        <span style="color: #2563EB; font-weight: 900; font-size: 16px; letter-spacing: 0.5px;">{comp_name}</span><br/>
        <a href="{website}" style="color: #0F172A; text-decoration: none; font-size: 12.5px; font-weight: 700; display: inline-block; margin-top: 4px;">🌐 {website}</a>
      </div>

      <!-- Company Contact Details Grid -->
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

      <!-- Our Services Section -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 900; color: #0F172A; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Our Enterprise Digital Services</div>
        <div style="line-height: 1.8;">
          {services_pills}
        </div>
      </div>

      <!-- Social Media Links -->
      <div style="margin-bottom: 20px; padding: 12px 14px; background-color: #F1F5F9; border-radius: 8px; text-align: center; font-size: 12px;">
        <span style="font-weight: 800; color: #0F172A; margin-right: 8px; text-transform: uppercase; font-size: 10.5px; tracking: 1px;">Connect With Us:</span>
        {social_html}
      </div>

      <!-- Footer & Legal Disclaimer -->
      <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; font-size: 11px; color: #64748B; line-height: 1.6;">
        <div style="font-weight: 700; color: #334155; margin-bottom: 6px;">
          &copy; 2026 {comp_name}. All Rights Reserved.
        </div>
        <div style="margin-bottom: 8px; font-style: italic; font-size: 10.5px; color: #94A3B8;">
          CONFIDENTIALITY NOTICE: This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this communication in error, please notify {comp_name} immediately and delete all copies.
        </div>
        <div>
          <a href="{website}" style="color: #2563EB; text-decoration: none; font-weight: 600;">Company Website</a> &nbsp;&bull;&nbsp; 
          <a href="{website}/privacy" style="color: #2563EB; text-decoration: none; font-weight: 600;">Privacy Policy</a> &nbsp;&bull;&nbsp; 
          <a href="{website}/terms" style="color: #2563EB; text-decoration: none; font-weight: 600;">Terms & Conditions</a>
        </div>
      </div>

    </div>
    """

@router.post("/campaigns", response_model=CampaignResponse)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = Campaign(
        name=campaign_in.name,
        subject=campaign_in.subject,
        body_template=campaign_in.body_template,
        status="Draft",
        user_id=current_user.id
    )
    db.add(campaign)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="CAMPAIGN_CREATE",
        description=f"Created email campaign '{campaign_in.name}'"
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
    return db.query(Campaign).filter(Campaign.user_id == current_user.id).order_by(Campaign.created_at.desc()).all()

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
    
    default_campaign = db.query(Campaign).filter(Campaign.user_id == current_user.id, Campaign.name == "Direct Outreach").first()
    if not default_campaign:
        default_campaign = Campaign(name="Direct Outreach", user_id=current_user.id)
        db.add(default_campaign)
        db.commit()
        db.refresh(default_campaign)

    new_email = Email(
        campaign_id=default_campaign.id,
        lead_id=lead.id,
        sender_id=current_user.id,
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

class EmailSendRequest(BaseModel):
    lead_id: int
    subject: str
    body: str
    recipient_email: str

@router.post("/send")
def send_outreach_email(
    req: EmailSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = _resolve_lead(req.lead_id, db, current_user)

    company = db.query(Company).first()
    if not company:
        company = Company()

    # Automatically ensure HTML Email Signature is attached if not present
    final_body = req.body
    if "table" not in final_body.lower() and company.company_name not in final_body:
        footer_html = generate_html_email_footer(current_user, company)
        final_body = f"{final_body}<br/>{footer_html}"

    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASS
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    sender = settings.EMAIL_FROM or smtp_user

    if not smtp_user or not smtp_password:
        raise HTTPException(
            status_code=400,
            detail="SMTP credentials (SMTP_USER/SMTP_PASS) are not configured in backend settings or .env file."
        )

    # Attempt to send email via SMTP with fallback port support
    sent_successfully = False
    last_smtp_error = ""

    # Build ports to try: primary first, fallback second
    ports_to_try = [smtp_port]
    if smtp_port == 587 and 465 not in ports_to_try:
        ports_to_try.append(465)
    elif smtp_port == 465 and 587 not in ports_to_try:
        ports_to_try.append(587)

    for port in ports_to_try:
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = sender
            msg['To'] = req.recipient_email
            msg['Subject'] = req.subject
            msg.attach(MIMEText(final_body, 'html'))

            server = create_smtp_server(smtp_host, port, timeout=12.0)
            server.login(smtp_user, smtp_password.strip())
            server.sendmail(sender, req.recipient_email, msg.as_string())
            server.quit()
            sent_successfully = True
            break
        except smtplib.SMTPAuthenticationError:
            raise HTTPException(
                status_code=400, 
                detail=f"SMTP Authentication failed for user '{smtp_user}'. Please verify SMTP_USER & SMTP_PASS in backend settings."
            )
        except Exception as e:
            last_smtp_error = str(e)

    if not sent_successfully:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email via SMTP ({smtp_host}): {last_smtp_error or 'Connection failed'}"
        )

    lead.status = "Contacted"
    
    default_campaign = db.query(Campaign).filter(Campaign.user_id == current_user.id, Campaign.name == "Direct Outreach").first()
    if not default_campaign:
        default_campaign = Campaign(name="Direct Outreach", user_id=current_user.id)
        db.add(default_campaign)
        db.commit()
        db.refresh(default_campaign)
        
    new_email = Email(
        campaign_id=default_campaign.id,
        lead_id=req.lead_id,
        sender_id=current_user.id,
        generated_body=final_body,
        subject=req.subject,
        status="Sent",
        sent_at=datetime.utcnow()
    )
    db.add(new_email)

    log = ActivityLog(
        user_id=current_user.id,
        action="EMAIL_SENT",
        description=f"Sent outreach to '{req.recipient_email}' for lead '{lead.business.name}'"
    )
    db.add(log)
    db.commit()

    return {"status": "success", "message": f"Email successfully sent to {req.recipient_email}"}

