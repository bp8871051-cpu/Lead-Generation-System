from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
import bcrypt
import secrets
import hashlib
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.database import get_db
from app.models import User, PasswordResetToken, ActivityLog
from app.schemas import UserLogin, UserResponse, UserUpdate, Token, TokenData, ForgotPasswordRequest, ResetPasswordRequest
from app.config import settings

logger = logging.getLogger("auth")
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8')[:72],
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode('utf-8')[:72],
        bcrypt.gensalt()
    ).decode('utf-8')

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    jwt_token = token
    if not jwt_token:
        jwt_token = request.cookies.get("leadai_session") or request.cookies.get("token")
    if not jwt_token:
        logger.warning("Authentication failed: No token found in Authorization header or cookies.")
        raise credentials_exception
    try:
        payload = jwt.decode(jwt_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=payload.get("role"), user_id=payload.get("user_id"))
    except JWTError as e:
        logger.warning(f"Authentication failed: Invalid JWT token - {str(e)}")
        raise credentials_exception
        
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None or not user.is_active:
        logger.warning(f"Authentication failed: Active User '{token_data.email}' not found.")
        raise credentials_exception
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, response: Response, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for email: '{user_in.email}'")
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if not db_user or not verify_password(user_in.password, db_user.hashed_password):
        logger.warning(f"Failed login attempt for email: '{user_in.email}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your employee account has been deactivated. Please contact your company Admin.",
        )
    
    # Update last login
    db_user.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token(
        data={"sub": db_user.email, "role": db_user.role, "user_id": db_user.id}
    )

    # Store session in HTTP-only cookie
    response.set_cookie(
        key="leadai_session",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=30 * 24 * 3600,
        path="/",
        secure=False
    )
    # Store standard token cookie for middleware access
    response.set_cookie(
        key="token",
        value=access_token,
        httponly=False,
        samesite="lax",
        max_age=30 * 24 * 3600,
        path="/",
        secure=False
    )

    logger.info(f"Login successful for user: '{db_user.email}'")
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="leadai_session", path="/")
    response.delete_cookie(key="token", path="/")
    return {"status": "success", "message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_users_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.designation is not None:
        current_user.designation = data.designation
    if data.avatar is not None:
        current_user.avatar = data.avatar
    if data.password and len(data.password.strip()) >= 6:
        current_user.hashed_password = get_password_hash(data.password.strip())

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Company account not found with this email.")

    # Rate limiting: max 3 requests per 15 mins
    fifteen_mins_ago = datetime.utcnow() - timedelta(minutes=15)
    recent_tokens = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.created_at >= fifteen_mins_ago
    ).count()

    if recent_tokens >= 3:
        raise HTTPException(
            status_code=429,
            detail="Too many password reset requests. Please wait 15 minutes before trying again."
        )

    # Generate secure random reset token
    raw_token = secrets.token_urlsafe(32)
    token_hashed = hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    reset_entry = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hashed,
        expires_at=expires_at,
        used=False
    )
    db.add(reset_entry)
    db.commit()

    # Reset Link URL
    reset_url = f"http://localhost:3002/reset-password?token={raw_token}"

    # Dispatch HTML Reset Email via server-side SMTP
    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASS
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    sender = settings.EMAIL_FROM or smtp_user

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 24px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #1E293B; border: 1px solid #334155; border-radius: 16px; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #A855F7; margin: 0; font-size: 24px;">LeadAI Internal Portal</h2>
          <p style="color: #94A3B8; font-size: 12px; margin-top: 4px;">Employee Password Recovery</p>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #E2E8F0;">
          A password reset was requested for your company account (<strong>{user.email}</strong>).
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <a href="{reset_url}" style="background-color: #7C3AED; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p style="font-size: 12px; color: #94A3B8; word-break: break-all;">
          Or copy and paste this link in your browser:<br/>
          <a href="{reset_url}" style="color: #38BDF8;">{reset_url}</a>
        </p>

        <div style="border-top: 1px solid #334155; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #64748B;">
          <p style="margin: 0 0 4px 0;">⏰ <strong>Expiry Notice:</strong> This link expires in 15 minutes.</p>
          <p style="margin: 0;">🔒 <strong>Security Notice:</strong> If you did not request this, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
    """

    if smtp_user and smtp_password:
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = sender
            msg['To'] = user.email
            msg['Subject'] = "Reset Your LeadAI Account Password"
            msg.attach(MIMEText(html_content, 'html'))

            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, 465, timeout=10)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                server.starttls()

            server.login(smtp_user, smtp_password.strip())
            server.sendmail(sender, user.email, msg.as_string())
            server.quit()
        except Exception as e:
            logger.error(f"SMTP error sending reset email: {e}")

    log = ActivityLog(
        user_id=user.id,
        action="PASSWORD_RESET_REQUESTED",
        description=f"Requested password reset link for '{user.email}'"
    )
    db.add(log)
    db.commit()

    return {
        "status": "success",
        "message": f"Password reset link generated for {user.email}.",
        "reset_url": reset_url
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not req.token or not req.token.strip():
        raise HTTPException(status_code=400, detail="Reset token is required.")

    token_hashed = hash_token(req.token.strip())
    reset_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hashed,
        PasswordResetToken.used == False
    ).first()

    if not reset_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if reset_entry.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired (15 minute limit exceeded). Please request a new link.")

    password = req.new_password
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.hashed_password = get_password_hash(password)
    reset_entry.used = True

    log = ActivityLog(
        user_id=user.id,
        action="PASSWORD_RESET_COMPLETED",
        description=f"Successfully reset password for '{user.email}'"
    )
    db.add(log)
    db.commit()

    return {"status": "success", "message": "Password updated successfully."}
