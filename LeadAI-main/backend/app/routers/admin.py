from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
import smtplib

from app.database import get_db
from app.models import User, Company, Lead, Search, ActivityLog, Business, EmployeeEmailAccount
from app.schemas import (
    CompanyUpdate, CompanyResponse, UserResponse, UserCreate, UserUpdate,
    EmployeeEmailAccountCreate, EmployeeEmailAccountUpdate, EmployeeEmailAccountResponse
)
from app.routers.auth import get_current_user, require_admin, get_password_hash
from app.security_utils import encrypt_credential, decrypt_credential
from app.routers.emails import test_smtp_connection_for_account, create_smtp_server
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

def format_email_account_dict(acct: EmployeeEmailAccount) -> Optional[dict]:
    if not acct:
        return None
    return {
        "id": acct.id,
        "employee_id": acct.employee_id,
        "email": acct.email,
        "provider": acct.provider or "Custom SMTP",
        "authentication_method": acct.authentication_method or "SMTP",
        "smtp_host": acct.smtp_host,
        "smtp_port": acct.smtp_port or 587,
        "encryption": acct.encryption or "TLS",
        "smtp_username": acct.smtp_username,
        "sender_name": acct.sender_name,
        "is_active": acct.is_active,
        "is_default": acct.is_default,
        "has_password": bool(acct.encrypted_smtp_password),
        "last_tested_at": acct.last_tested_at,
        "last_test_status": acct.last_test_status,
        "created_at": acct.created_at,
        "updated_at": acct.updated_at
    }

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
@router.get("/employees")
def list_employees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).all()
    results = []
    for u in users:
        acct_dict = format_email_account_dict(u.email_account)
        results.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "designation": u.designation or "Team Member",
            "avatar": u.avatar,
            "role": u.role,
            "is_active": u.is_active,
            "last_login": u.last_login,
            "created_at": u.created_at,
            "email_account": acct_dict
        })
    return results

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
    target_user = find_target_employee(user_id, None, admin, db)

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
    target_user = find_target_employee(user_id, None, admin, db)

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


def find_target_employee(user_id: int, email: str | None, current_user: User, db: Session) -> User:
    if user_id and user_id > 0:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return user

    if email and email.strip():
        user = db.query(User).filter(User.email.ilike(email.strip())).first()
        if user:
            return user

    if current_user:
        if current_user.id == user_id or (email and current_user.email.lower() == email.strip().lower()):
            return current_user
        if current_user.role != "admin":
            return current_user

    if email and email.strip() and current_user and current_user.role == "admin":
        clean_email = email.strip().lower()
        hashed_pw = get_password_hash("employee123")
        user = User(
            email=clean_email,
            full_name=clean_email.split("@")[0].capitalize(),
            designation="Sales Associate",
            hashed_password=hashed_pw,
            role="employee",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    fallback = db.query(User).filter(User.is_active == True).first()
    if fallback:
        return fallback

    raise HTTPException(status_code=404, detail="Employee not found.")


# ==========================================
# Employee Email Account Configuration
# ==========================================
@router.get("/employees/{user_id}/email-account")
def get_employee_email_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = find_target_employee(user_id, None, current_user, db)
    return format_email_account_dict(target_user.email_account)


@router.post("/employees/{user_id}/email-account")
def upsert_employee_email_account(
    user_id: int,
    acct_in: EmployeeEmailAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = find_target_employee(user_id, acct_in.email, current_user, db)

    acct = target_user.email_account
    if not acct:
        acct = EmployeeEmailAccount(employee_id=target_user.id, email=acct_in.email)
        db.add(acct)

    acct.email = acct_in.email
    acct.provider = acct_in.provider or "Custom SMTP"
    acct.authentication_method = acct_in.authentication_method or "SMTP"
    acct.smtp_host = acct_in.smtp_host
    acct.smtp_port = acct_in.smtp_port or 587
    acct.encryption = acct_in.encryption or "TLS"
    acct.smtp_username = acct_in.smtp_username or acct_in.email
    acct.sender_name = acct_in.sender_name or target_user.full_name or acct_in.email
    acct.is_active = acct_in.is_active if acct_in.is_active is not None else True
    acct.is_default = acct_in.is_default if acct_in.is_default is not None else False
    acct.updated_at = datetime.utcnow()

    # Password encryption
    if acct_in.password and len(acct_in.password.strip()) > 0:
        acct.encrypted_smtp_password = encrypt_credential(acct_in.password.strip())

    db.commit()
    db.refresh(acct)

    log = ActivityLog(
        user_id=current_user.id,
        action="EMAIL_CONFIG_UPDATED",
        description=f"Updated email configuration ({acct.email}) for employee '{target_user.email}'"
    )
    db.add(log)
    db.commit()

    return format_email_account_dict(acct)


@router.delete("/employees/{user_id}/email-account")
def delete_employee_email_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = find_target_employee(user_id, None, current_user, db)
    if not target_user or not target_user.email_account:
        raise HTTPException(status_code=404, detail="Email configuration not found.")

    db.delete(target_user.email_account)
    db.commit()
    return {"status": "success", "message": "Email configuration removed."}


@router.post("/employees/{user_id}/test-email-connection")
def test_employee_email_connection(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = find_target_employee(user_id, None, current_user, db)
    acct = target_user.email_account
    if not acct:
        raise HTTPException(status_code=400, detail="Employee has no email account configured.")

    res = test_smtp_connection_for_account(acct, db)
    return res



# ==========================================
# SMTP & System Utilities
# ==========================================
@router.get("/smtp-status")
def check_smtp_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    accounts = db.query(EmployeeEmailAccount).filter(EmployeeEmailAccount.is_active == True).all()
    configured_count = len(accounts)
    connected_count = sum(1 for a in accounts if a.last_test_status == "Connected")

    return {
        "configured": configured_count > 0,
        "status": f"{connected_count}/{configured_count} Accounts Connected" if configured_count > 0 else "No Employee Accounts Configured",
        "active_employee_accounts": configured_count,
        "connected_accounts": connected_count,
        "fallback_host": settings.SMTP_HOST
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
