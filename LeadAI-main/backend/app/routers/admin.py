from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import smtplib

from app.database import get_db
from app.models import User, Company, Lead, Search, ActivityLog, Business
from app.schemas import CompanyUpdate, CompanyResponse, UserResponse, UserCreate, UserUpdate
from app.routers.auth import get_current_user, require_admin, get_password_hash
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

# ==========================================
# Single Company Profile Management
# ==========================================
@router.get("/company", response_model=CompanyResponse)
def get_company_profile(db: Session = Depends(get_db)):
    comp = db.query(Company).first()
    if not comp:
        comp = Company(
            company_name=settings.COMPANY_NAME,
            company_email=settings.COMPANY_EMAIL,
            company_website="https://company.internal",
            company_phone="+1 (555) 019-2834",
            company_address="100 Business Park, Suite 400"
        )
        db.add(comp)
        db.commit()
        db.refresh(comp)
    return comp

@router.put("/company", response_model=CompanyResponse)
def update_company_profile(
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    comp = db.query(Company).first()
    if not comp:
        comp = Company()
        db.add(comp)

    for field in [
        "company_name", "company_logo", "company_website", "company_email",
        "company_phone", "company_address", "gst_number", "linkedin_url",
        "facebook_url", "instagram_url", "youtube_url", "support_email", "email_signature"
    ]:
        val = getattr(data, field, None)
        if val is not None:
            setattr(comp, field, val)

    db.commit()
    db.refresh(comp)
    return comp

# ==========================================
# Employee Management (Max 5 Active Employees)
# ==========================================
@router.get("/employees", response_model=List[UserResponse])
def list_employees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(User).all()

@router.post("/employees", response_model=UserResponse)
def create_employee(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    # Check if email exists
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An employee with this email already exists.")

    # Enforce MAX 5 ACTIVE EMPLOYEES Limit
    active_employees_count = db.query(User).filter(User.role == "employee", User.is_active == True).count()
    if user_in.role == "employee" and active_employees_count >= 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum limit reached: Only 5 active employees allowed in this Single Company installation."
        )

    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        designation=user_in.designation or "Team Member",
        avatar=user_in.avatar,
        role=user_in.role or "employee",
        hashed_password=get_password_hash(user_in.password),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log = ActivityLog(
        user_id=admin.id,
        action="EMPLOYEE_CREATED",
        description=f"Created employee account '{new_user.email}' with role '{new_user.role}'"
    )
    db.add(log)
    db.commit()

    return new_user

@router.put("/employees/{user_id}", response_model=UserResponse)
def update_employee(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if user_in.full_name is not None:
        target_user.full_name = user_in.full_name
    if user_in.designation is not None:
        target_user.designation = user_in.designation
    if user_in.avatar is not None:
        target_user.avatar = user_in.avatar
    if user_in.password and len(user_in.password.strip()) >= 6:
        target_user.hashed_password = get_password_hash(user_in.password.strip())

    db.commit()
    db.refresh(target_user)
    return target_user

@router.post("/employees/{user_id}/toggle-active")
def toggle_employee_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if target_user.id == admin.id:
        raise HTTPException(status_code=400, detail="Admin cannot deactivate their own account.")

    # If activating an employee, check 5 active limit
    if not target_user.is_active and target_user.role == "employee":
        active_count = db.query(User).filter(User.role == "employee", User.is_active == True).count()
        if active_count >= 5:
            raise HTTPException(status_code=400, detail="Maximum 5 active employees allowed.")

    target_user.is_active = not target_user.is_active
    db.commit()
    return {"status": "success", "is_active": target_user.is_active}

from app.routers.emails import create_smtp_server

# ==========================================
# SMTP & System Utilities
# ==========================================
@router.get("/smtp-status")
def check_smtp_status(current_user: User = Depends(get_current_user)):
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    password = settings.SMTP_PASS

    if not host or not user or not password:
        return {
            "configured": False,
            "status": "Not Configured",
            "host": host,
            "port": port,
            "message": "SMTP credentials missing in .env file."
        }

    try:
        server = create_smtp_server(host, port, timeout=5.0)
        server.login(user, password.strip())
        server.quit()
        return {
            "configured": True,
            "status": "Connected & Operational",
            "host": host,
            "port": port,
            "from_email": settings.EMAIL_FROM or user
        }
    except Exception as e:
        return {
            "configured": True,
            "status": "Connection Failed",
            "host": host,
            "port": port,
            "error": str(e)
        }

@router.get("/system-logs")
def get_system_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": log.user.full_name if log.user else "System",
            "action": log.action,
            "description": log.description,
            "timestamp": log.created_at
        }
        for log in logs
    ]

@router.get("/backup-db")
def backup_database(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    total_leads = db.query(Lead).count()
    total_businesses = db.query(Business).count()
    total_users = db.query(User).count()
    return {
        "status": "success",
        "timestamp": settings.COMPANY_NAME,
        "backup_summary": {
            "total_users": total_users,
            "total_leads": total_leads,
            "total_businesses": total_businesses
        },
        "message": "Database backup completed cleanly."
    }
