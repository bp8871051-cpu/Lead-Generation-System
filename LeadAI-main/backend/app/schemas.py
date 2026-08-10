from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

# User & Employee Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    designation: Optional[str] = "Team Member"
    avatar: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "employee"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    designation: Optional[str] = None
    avatar: Optional[str] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# Employee Email Account Schemas
class EmployeeEmailAccountBase(BaseModel):
    email: EmailStr
    provider: Optional[str] = "Custom SMTP"
    authentication_method: Optional[str] = "SMTP"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    encryption: Optional[str] = "TLS"
    smtp_username: Optional[str] = None
    sender_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_default: Optional[bool] = False

class EmployeeEmailAccountCreate(EmployeeEmailAccountBase):
    password: Optional[str] = None

class EmployeeEmailAccountUpdate(BaseModel):
    email: Optional[EmailStr] = None
    provider: Optional[str] = None
    authentication_method: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    encryption: Optional[str] = None
    smtp_username: Optional[str] = None
    password: Optional[str] = None
    sender_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class EmployeeEmailAccountResponse(EmployeeEmailAccountBase):
    id: int
    employee_id: int
    has_password: bool = False
    last_tested_at: Optional[datetime] = None
    last_test_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ActiveSenderResponse(BaseModel):
    employee_id: int
    employee_name: str
    email: str
    sender_name: Optional[str] = None
    provider: str
    is_active: bool
    last_test_status: Optional[str] = None

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    email_account: Optional[EmployeeEmailAccountResponse] = None

    class Config:
        from_attributes = True

# Campaign & Email Schemas
class CampaignCreate(BaseModel):
    name: str
    subject: Optional[str] = None
    body_template: Optional[str] = None
    employee_id: Optional[int] = None

class CampaignResponse(BaseModel):
    id: int
    name: str
    subject: Optional[str] = None
    body_template: Optional[str] = None
    status: str
    created_at: datetime
    employee_id: Optional[int] = None

    class Config:
        from_attributes = True

class EmailGenerateRequest(BaseModel):
    lead_id: int
    channel: str # Email, LinkedIn, WhatsApp, Follow-up, Proposal

class EmailSendRequest(BaseModel):
    lead_id: int
    subject: str
    body: str
    recipient_email: str
    employee_id: Optional[int] = None

class EmailResponse(BaseModel):
    id: int
    campaign_id: Optional[int] = None
    lead_id: int
    sender_id: Optional[int] = None
    sender_email: Optional[str] = None
    recipient_email: Optional[str] = None
    provider: Optional[str] = None
    error_message: Optional[str] = None
    generated_body: Optional[str] = None
    subject: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Company Profile Schemas
class CompanyBase(BaseModel):
    company_name: Optional[str] = "BLUEBOXX.DA PRIVATE LIMITED"
    brand_name: Optional[str] = "BLUEBOXX.DA"
    tagline: Optional[str] = "Turning Ideas Into Digital Excellence"
    company_logo: Optional[str] = "/blueboxx_logo.png"
    company_website: Optional[str] = "https://blueboxxda.com"
    company_email: Optional[str] = "contact@blueboxxda.com"
    support_email: Optional[str] = "contact@blueboxxda.com"
    company_phone: Optional[str] = "+91 98765 43210"
    alternate_phone: Optional[str] = "+91 98765 43211"
    company_address: Optional[str] = "BLUEBOXX.DA Tower, Tech Park Road"
    city: Optional[str] = "Ahmedabad"
    state: Optional[str] = "Gujarat"
    country: Optional[str] = "India"
    pin_code: Optional[str] = "380058"
    gst_number: Optional[str] = "24AAAAA0000A1Z5"
    cin_number: Optional[str] = "U72900GJ2026PTC123456"
    working_hours: Optional[str] = "Mon - Sat: 9:00 AM - 7:00 PM IST"
    google_maps_url: Optional[str] = None
    linkedin_url: Optional[str] = "https://linkedin.com/company/blueboxxda"
    facebook_url: Optional[str] = "https://facebook.com/blueboxxda"
    instagram_url: Optional[str] = "https://instagram.com/blueboxxda"
    youtube_url: Optional[str] = "https://youtube.com/@blueboxxda"
    behance_url: Optional[str] = "https://behance.net/blueboxxda"
    dribbble_url: Optional[str] = "https://dribbble.com/blueboxxda"
    twitter_url: Optional[str] = "https://x.com/blueboxxda"
    whatsapp_number: Optional[str] = "+91 98765 43210"
    services_list: Optional[str] = "Website Development, Web Applications, UI / UX Design, Graphic Design, Logo Design, Branding, Motion Graphics, Animation, Video Editing, Digital Marketing, SEO, Social Media Marketing, Lead Generation, CRM Development, Automation Solutions"
    email_signature: Optional[str] = "BLUEBOXX.DA PRIVATE LIMITED"

class CompanyUpdate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

# Search Schemas
class SearchCreate(BaseModel):
    category: str
    location: str
    radius: Optional[float] = 5000.0
    max_results: Optional[int] = 20
    force_refresh: Optional[bool] = False
    multi_category: Optional[bool] = False
    categories_list: Optional[List[str]] = None

class LinkScrapeRequest(BaseModel):
    url: str

class SearchResponse(BaseModel):
    id: int
    category: str
    location: str
    radius: float
    max_results: int
    total_results: Optional[int] = 0
    new_leads_count: Optional[int] = 0
    duplicates_removed_count: Optional[int] = 0
    is_multi_search: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

# Business Schemas
class BusinessBase(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    google_rating: Optional[float] = 0.0
    reviews_count: Optional[int] = 0
    maps_url: Optional[str] = None
    opening_hours: Optional[str] = None
    photos: Optional[str] = None
    business_status: Optional[str] = "OPERATIONAL"
    industry: Optional[str] = None
    website_score: Optional[int] = 0
    ssl_enabled: Optional[bool] = False
    mobile_friendly: Optional[bool] = True
    tech_stack: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    has_analytics: Optional[bool] = False
    has_pixel: Optional[bool] = False
    broken_links_count: Optional[int] = 0

class BusinessResponse(BusinessBase):
    id: int
    google_place_id: Optional[str] = None
    search_id: Optional[int] = None

    class Config:
        from_attributes = True

# CRM & Note/Task Schemas
class NoteCreate(BaseModel):
    content: str

class NoteResponse(BaseModel):
    id: int
    lead_id: int
    content: str
    created_at: datetime
    author_name: Optional[str] = None

    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    title: str
    due_date: Optional[datetime] = None

class TaskResponse(BaseModel):
    id: int
    lead_id: int
    title: str
    due_date: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TaskUpdate(BaseModel):
    status: str

# Lead Schemas
class LeadStatusUpdate(BaseModel):
    status: str

class LeadAssignRequest(BaseModel):
    user_id: int

class LeadResponse(BaseModel):
    id: int
    business_id: int
    assigned_to_user_id: Optional[int] = None
    status: str
    priority: Optional[str] = "Medium"
    website_score: Optional[int] = 0
    lead_score: int
    created_at: datetime
    business: BusinessResponse
    assigned_user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class LeadDetailResponse(LeadResponse):
    ai_summary: Optional[str] = None
    ai_strengths: Optional[str] = None
    ai_weaknesses: Optional[str] = None
    ai_digital_presence: Optional[str] = None
    ai_website_analysis: Optional[str] = None
    ai_seo_opportunity: Optional[str] = None
    ai_marketing_opportunity: Optional[str] = None
    ai_sales_opportunity: Optional[str] = None
    ai_recommended_services: Optional[str] = None
    notes: List[NoteResponse] = []
    tasks: List[TaskResponse] = []

    class Config:
        from_attributes = True

class LeadsPaginatedResponse(BaseModel):
    total: int
    leads: List[LeadResponse]
    skip: int
    limit: int


# Analytics Dashboard
class DashboardStats(BaseModel):
    total_leads: int
    today_leads: int
    unique_leads: int
    duplicate_count: int
    website_missing: int
    avg_website_score: float
    high_priority_leads: int
    average_rating: float
    hot_leads: int
    campaigns_count: int
    conversion_rate: float
    daily_leads: List[dict] # list of {"date": "...", "count": ...}
    industry_distribution: List[dict] # list of {"industry": "...", "count": ...}
    score_distribution: List[dict] # list of {"range": "...", "count": ...}

# Activity Log
class ActivityLogResponse(BaseModel):
    id: int
    action: str
    description: Optional[str] = None
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True
