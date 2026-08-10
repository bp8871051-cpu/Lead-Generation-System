from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.config import settings
from sqlalchemy import text
from app.models import User, Company
import bcrypt

# Import routers
from app.routers import auth, search, leads, crm, analytics, emails, admin, export

# Auto-create tables (SQLite/PostgreSQL fallback initialization)
Base.metadata.create_all(bind=engine)

# Dynamic column migrations for SQLite / PostgreSQL
migration_queries = [
    "ALTER TABLE users ADD COLUMN designation VARCHAR DEFAULT 'Team Member'",
    "ALTER TABLE users ADD COLUMN avatar TEXT",
    "ALTER TABLE users ADD COLUMN last_login DATETIME",
    "ALTER TABLE leads ADD COLUMN assigned_to_user_id INTEGER REFERENCES users(id)",
    "ALTER TABLE leads ADD COLUMN priority VARCHAR DEFAULT 'Medium'",
    "ALTER TABLE leads ADD COLUMN website_score INTEGER DEFAULT 0",
    "ALTER TABLE searches ADD COLUMN duration_ms FLOAT DEFAULT 0.0",
    "ALTER TABLE searches ADD COLUMN status VARCHAR DEFAULT 'Completed'",
    "ALTER TABLE notes ADD COLUMN user_id INTEGER REFERENCES users(id)",
    "ALTER TABLE tasks ADD COLUMN assigned_to_user_id INTEGER REFERENCES users(id)",
    "ALTER TABLE emails ADD COLUMN sender_id INTEGER REFERENCES users(id)",
    "ALTER TABLE emails ADD COLUMN sender_email VARCHAR",
    "ALTER TABLE emails ADD COLUMN recipient_email VARCHAR",
    "ALTER TABLE emails ADD COLUMN provider VARCHAR",
    "ALTER TABLE emails ADD COLUMN error_message TEXT",
    "ALTER TABLE emails ADD COLUMN generated_body TEXT",
    "ALTER TABLE emails ADD COLUMN subject VARCHAR",
    "ALTER TABLE emails ADD COLUMN sent_at DATETIME",
    "ALTER TABLE campaigns ADD COLUMN employee_id INTEGER REFERENCES users(id)",
    "ALTER TABLE company ADD COLUMN brand_name VARCHAR DEFAULT 'BLUEBOXX.DA'",
    "ALTER TABLE company ADD COLUMN tagline VARCHAR DEFAULT 'Turning Ideas Into Digital Excellence'",
    "ALTER TABLE company ADD COLUMN city VARCHAR DEFAULT 'Ahmedabad'",
    "ALTER TABLE company ADD COLUMN state VARCHAR DEFAULT 'Gujarat'",
    "ALTER TABLE company ADD COLUMN country VARCHAR DEFAULT 'India'",
    "ALTER TABLE company ADD COLUMN pin_code VARCHAR DEFAULT '380058'",
    "ALTER TABLE company ADD COLUMN alternate_phone VARCHAR DEFAULT '+91 98765 43211'",
    "ALTER TABLE company ADD COLUMN cin_number VARCHAR DEFAULT 'U72900GJ2026PTC123456'",
    "ALTER TABLE company ADD COLUMN working_hours VARCHAR DEFAULT 'Mon - Sat: 9:00 AM - 7:00 PM IST'",
    "ALTER TABLE company ADD COLUMN google_maps_url VARCHAR",
    "ALTER TABLE company ADD COLUMN behance_url VARCHAR DEFAULT 'https://behance.net/blueboxxda'",
    "ALTER TABLE company ADD COLUMN dribbble_url VARCHAR DEFAULT 'https://dribbble.com/blueboxxda'",
    "ALTER TABLE company ADD COLUMN twitter_url VARCHAR DEFAULT 'https://x.com/blueboxxda'",
    "ALTER TABLE company ADD COLUMN whatsapp_number VARCHAR DEFAULT '+91 98765 43210'",
    "ALTER TABLE company ADD COLUMN services_list TEXT"
]


for q in migration_queries:
    try:
        with engine.begin() as conn:
            conn.execute(text(q))
    except Exception:
        pass

# Seed default single company admin account & company profile if missing
db = SessionLocal()
try:
    # Seed Company Profile
    comp = db.query(Company).first()
    if not comp:
        comp = Company(
            company_name="BLUEBOXX.DA PRIVATE LIMITED",
            brand_name="BLUEBOXX.DA",
            tagline="Turning Ideas Into Digital Excellence",
            company_logo="/blueboxx_logo.png",
            company_website="https://blueboxxda.com",
            company_email="contact@blueboxxda.com",
            support_email="contact@blueboxxda.com",
            company_phone="+91 98765 43210",
            alternate_phone="+91 98765 43211",
            company_address="BLUEBOXX.DA Tower, Tech Park Road",
            city="Ahmedabad",
            state="Gujarat",
            country="India",
            pin_code="380058",
            gst_number="24AAAAA0000A1Z5",
            cin_number="U72900GJ2026PTC123456",
            working_hours="Mon - Sat: 9:00 AM - 7:00 PM IST",
            linkedin_url="https://linkedin.com/company/blueboxxda",
            facebook_url="https://facebook.com/blueboxxda",
            instagram_url="https://instagram.com/blueboxxda",
            youtube_url="https://youtube.com/@blueboxxda",
            behance_url="https://behance.net/blueboxxda",
            dribbble_url="https://dribbble.com/blueboxxda",
            twitter_url="https://x.com/blueboxxda",
            whatsapp_number="+91 98765 43210",
            services_list="Website Development, Web Applications, UI / UX Design, Graphic Design, Logo Design, Branding, Motion Graphics, Animation, Video Editing, Digital Marketing, SEO, Social Media Marketing, Lead Generation, CRM Development, Automation Solutions",
            email_signature="BLUEBOXX.DA PRIVATE LIMITED"
        )
        db.add(comp)
        db.commit()
    else:
        # Update company details to BLUEBOXX.DA PRIVATE LIMITED
        comp.company_name = "BLUEBOXX.DA PRIVATE LIMITED"
        comp.brand_name = "BLUEBOXX.DA"
        comp.tagline = "Turning Ideas Into Digital Excellence"
        if not comp.company_logo or "company.internal" in comp.company_logo:
            comp.company_logo = "/blueboxx_logo.png"
        comp.company_website = "https://blueboxxda.com"
        comp.company_email = "contact@blueboxxda.com"
        comp.support_email = "contact@blueboxxda.com"
        comp.company_phone = "+91 98765 43210"
        comp.company_address = "BLUEBOXX.DA Tower, Tech Park Road"
        comp.city = "Ahmedabad"
        comp.state = "Gujarat"
        comp.country = "India"
        comp.pin_code = "380058"
        db.commit()

    # Seed Default Admin & Employee Users
    # 1. Admin User
    admin_user = db.query(User).filter(User.email == "admin@company.com").first()
    if not admin_user:
        admin_user = db.query(User).filter(User.email == "admin@company.internal").first()
    
    hashed_admin_pw = bcrypt.hashpw("admin123".encode('utf-8')[:72], bcrypt.gensalt()).decode('utf-8')
    if not admin_user:
        admin_user = User(
            email="admin@company.com",
            full_name="Company System Admin",
            designation="Chief Administrator",
            hashed_password=hashed_admin_pw,
            role="admin",
            is_active=True
        )
        db.add(admin_user)
    else:
        admin_user.email = "admin@company.com"
        admin_user.role = "admin"
        admin_user.hashed_password = hashed_admin_pw
        admin_user.is_active = True

    # 2. Employee User
    emp_user = db.query(User).filter(User.email == "employee@company.com").first()
    hashed_emp_pw = bcrypt.hashpw("employee123".encode('utf-8')[:72], bcrypt.gensalt()).decode('utf-8')
    if not emp_user:
        emp_user = User(
            email="employee@company.com",
            full_name="Lead AI Employee",
            designation="Sales & Lead Associate",
            hashed_password=hashed_emp_pw,
            role="employee",
            is_active=True
        )
        db.add(emp_user)
    else:
        emp_user.role = "employee"
        emp_user.hashed_password = hashed_emp_pw
        emp_user.is_active = True

    db.commit()
except Exception as e:
    db.rollback()
finally:
    db.close()

app = FastAPI(
    title="LeadAI Single Company Internal CRM API",
    description="Internal Lead Generation & Prospecting CRM system for single-company team operations",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(crm.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(emails.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(export.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "LeadAI Single Company Internal CRM API",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
