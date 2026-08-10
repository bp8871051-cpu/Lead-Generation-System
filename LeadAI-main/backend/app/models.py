from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    designation = Column(String, default="Team Member")
    avatar = Column(Text, nullable=True)
    role = Column(String, default="employee") # "admin" or "employee"
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    searches = relationship("Search", back_populates="user")
    activity_logs = relationship("ActivityLog", back_populates="user")
    assigned_leads = relationship("Lead", back_populates="assigned_user")
    email_account = relationship("EmployeeEmailAccount", back_populates="employee", uselist=False, cascade="all, delete-orphan")

class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, default="BLUEBOXX.DA PRIVATE LIMITED")
    brand_name = Column(String, default="BLUEBOXX.DA")
    tagline = Column(String, default="Turning Ideas Into Digital Excellence")
    company_logo = Column(Text, default="/blueboxx_logo.png")
    company_website = Column(String, default="https://blueboxxda.com")
    company_email = Column(String, default="contact@blueboxxda.com")
    support_email = Column(String, default="contact@blueboxxda.com")
    company_phone = Column(String, default="+91 98765 43210")
    alternate_phone = Column(String, default="+91 98765 43211")
    company_address = Column(Text, default="BLUEBOXX.DA Tower, Tech Park Road")
    city = Column(String, default="Ahmedabad")
    state = Column(String, default="Gujarat")
    country = Column(String, default="India")
    pin_code = Column(String, default="380058")
    gst_number = Column(String, default="24AAAAA0000A1Z5")
    cin_number = Column(String, default="U72900GJ2026PTC123456")
    working_hours = Column(String, default="Mon - Sat: 9:00 AM - 7:00 PM IST")
    google_maps_url = Column(String, nullable=True)
    
    # Social links
    linkedin_url = Column(String, default="https://linkedin.com/company/blueboxxda")
    facebook_url = Column(String, default="https://facebook.com/blueboxxda")
    instagram_url = Column(String, default="https://instagram.com/blueboxxda")
    youtube_url = Column(String, default="https://youtube.com/@blueboxxda")
    behance_url = Column(String, default="https://behance.net/blueboxxda")
    dribbble_url = Column(String, default="https://dribbble.com/blueboxxda")
    twitter_url = Column(String, default="https://x.com/blueboxxda")
    whatsapp_number = Column(String, default="+91 98765 43210")
    
    services_list = Column(Text, default="Website Development, Web Applications, UI / UX Design, Graphic Design, Logo Design, Branding, Motion Graphics, Animation, Video Editing, Digital Marketing, SEO, Social Media Marketing, Lead Generation, CRM Development, Automation Solutions")
    email_signature = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Search(Base):
    __tablename__ = "searches"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True, nullable=False)
    location = Column(String, index=True, nullable=False)
    radius = Column(Float, default=5000.0) # in meters
    max_results = Column(Integer, default=20)
    total_results = Column(Integer, default=0)
    new_leads_count = Column(Integer, default=0)
    duplicates_removed_count = Column(Integer, default=0)
    is_multi_search = Column(Boolean, default=False)
    duration_ms = Column(Float, default=0.0)
    status = Column(String, default="Completed") # Completed, Failed, In Progress
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    user = relationship("User", back_populates="searches")
    businesses = relationship("Business", back_populates="search")

class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    google_place_id = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, index=True, nullable=False)
    address = Column(String, nullable=True)
    city = Column(String, index=True, nullable=True)
    state = Column(String, index=True, nullable=True)
    country = Column(String, index=True, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    phone = Column(String, index=True, nullable=True)
    email = Column(String, index=True, nullable=True)
    website = Column(String, index=True, nullable=True)
    google_rating = Column(Float, default=0.0)
    reviews_count = Column(Integer, default=0)
    maps_url = Column(String, nullable=True)
    opening_hours = Column(Text, nullable=True)
    photos = Column(Text, nullable=True)
    business_status = Column(String, default="OPERATIONAL")
    industry = Column(String, index=True, nullable=True)
    
    # Technical & Website Security Audits
    website_score = Column(Integer, default=0)
    ssl_enabled = Column(Boolean, default=False)
    mobile_friendly = Column(Boolean, default=True)
    tech_stack = Column(String, nullable=True)
    meta_title = Column(String, nullable=True)
    meta_description = Column(Text, nullable=True)
    has_analytics = Column(Boolean, default=False)
    has_pixel = Column(Boolean, default=False)
    broken_links_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    
    search_id = Column(Integer, ForeignKey("searches.id"), nullable=True)

    # Relationships
    search = relationship("Search", back_populates="businesses")
    leads = relationship("Lead", back_populates="business")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # CRM Status: New, Contacted, Interested, Meeting, Proposal Sent, Won, Lost
    status = Column(String, default="New")
    priority = Column(String, default="Medium") # High, Medium, Low
    website_score = Column(Integer, default=0)
    
    # AI Analysis & Scoring
    lead_score = Column(Integer, default=50) # 0-100
    ai_summary = Column(Text, nullable=True)
    ai_strengths = Column(Text, nullable=True)
    ai_weaknesses = Column(Text, nullable=True)
    ai_digital_presence = Column(Text, nullable=True)
    ai_website_analysis = Column(Text, nullable=True)
    ai_seo_opportunity = Column(Text, nullable=True)
    ai_marketing_opportunity = Column(Text, nullable=True)
    ai_sales_opportunity = Column(Text, nullable=True)
    ai_recommended_services = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    business = relationship("Business", back_populates="leads")
    assigned_user = relationship("User", back_populates="assigned_leads")
    notes = relationship("Note", back_populates="lead", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="lead", cascade="all, delete-orphan")
    emails = relationship("Email", back_populates="lead", cascade="all, delete-orphan")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    subject = Column(String, nullable=True)
    body_template = Column(Text, nullable=True)
    status = Column(String, default="Draft") # Draft, Active, Completed, Paused
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    emails = relationship("Email", back_populates="campaign", cascade="all, delete-orphan")

class EmployeeEmailAccount(Base):
    __tablename__ = "employee_email_accounts"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    provider = Column(String, default="Custom SMTP") # Gmail, Google Workspace, Microsoft 365 / Outlook, Hostinger, Custom SMTP
    authentication_method = Column(String, default="SMTP") # SMTP, OAuth 2.0
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, default=587)
    encryption = Column(String, default="TLS") # TLS, SSL, None
    smtp_username = Column(String, nullable=True)
    encrypted_smtp_password = Column(Text, nullable=True)
    sender_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    last_tested_at = Column(DateTime, nullable=True)
    last_test_status = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("User", back_populates="email_account")

class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sender_email = Column(String, nullable=True)
    recipient_email = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    generated_body = Column(Text, nullable=True)
    subject = Column(String, nullable=True)
    
    # Status: Draft, Generated, Sent, Failed
    status = Column(String, default="Draft")
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    campaign = relationship("Campaign", back_populates="emails")
    lead = relationship("Lead", back_populates="emails")
    sender = relationship("User")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    author_name = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    lead = relationship("Lead", back_populates="notes")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    title = Column(String, nullable=False)
    due_date = Column(DateTime, nullable=True)
    status = Column(String, default="Pending") # Pending, Completed
    created_at = Column(DateTime, default=datetime.utcnow)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    lead = relationship("Lead", back_populates="tasks")

class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False) # e.g. SEARCH_RUN, LEAD_SAVE, AI_ANALYZE, EMAIL_SENT
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="activity_logs")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
