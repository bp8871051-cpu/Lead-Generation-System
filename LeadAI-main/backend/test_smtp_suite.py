import sys
import os
import socket
import smtplib
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import User, EmployeeEmailAccount, Email, Campaign, Company
from app.security_utils import encrypt_credential, decrypt_credential
from app.routers.emails import test_smtp_connection_for_account, create_smtp_server

print("=========================================================")
print(" LEADAI CRM - COMPREHENSIVE SMTP & GMAIL TEST SUITE")
print("=========================================================\n")

# Initialize database tables
Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    # -----------------------------------------------------------
    # Setup test employee: Bhaumik Prajapati (bhaumik2652005@gmail.com)
    # -----------------------------------------------------------
    user = db.query(User).filter(User.email == "bhaumik2652005@gmail.com").first()
    if not user:
        user = User(
            email="bhaumik2652005@gmail.com",
            full_name="Bhaumik Prajapati",
            designation="Lead AI Specialist",
            hashed_password="hashed_pw_test",
            role="employee",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    print(">>> Test User: Bhaumik Prajapati (bhaumik2652005@gmail.com) [ID: %s]" % user.id)

    # -----------------------------------------------------------
    # TEST 1: Gmail Option A (Port 587 + TLS)
    # -----------------------------------------------------------
    print("\n--- TEST 1: Gmail Option A (smtp.gmail.com:587 + TLS) ---")
    acct_587 = EmployeeEmailAccount(
        employee_id=user.id,
        email="bhaumik2652005@gmail.com",
        provider="Gmail",
        authentication_method="SMTP",
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        encryption="TLS",
        smtp_username="bhaumik2652005@gmail.com",
        encrypted_smtp_password=encrypt_credential("wlmr dypf gzru ztho"),
        sender_name="Bhaumik Prajapati",
        is_active=True
    )
    res_587 = test_smtp_connection_for_account(acct_587, db)
    print("Result 587 TLS:", res_587)
    assert res_587["status"] == "success", f"Test 1 Failed: {res_587}"
    print("PASS: Gmail Port 587 + TLS connected successfully!")

    # -----------------------------------------------------------
    # TEST 2: Gmail Option B (Port 465 + SSL)
    # -----------------------------------------------------------
    print("\n--- TEST 2: Gmail Option B (smtp.gmail.com:465 + SSL) ---")
    acct_465 = EmployeeEmailAccount(
        employee_id=user.id,
        email="bhaumik2652005@gmail.com",
        provider="Gmail",
        authentication_method="SMTP",
        smtp_host="smtp.gmail.com",
        smtp_port=465,
        encryption="SSL",
        smtp_username="bhaumik2652005@gmail.com",
        encrypted_smtp_password=encrypt_credential("wlmr dypf gzru ztho"),
        sender_name="Bhaumik Prajapati",
        is_active=True
    )
    res_465 = test_smtp_connection_for_account(acct_465, db)
    print("Result 465 SSL:", res_465)
    assert res_465["status"] == "success", f"Test 2 Failed: {res_465}"
    print("PASS: Gmail Port 465 + SSL connected successfully!")

    # -----------------------------------------------------------
    # TEST 3: Invalid App Password (SMTP_AUTH_FAILED)
    # -----------------------------------------------------------
    print("\n--- TEST 3: Invalid App Password ---")
    acct_invalid_pw = EmployeeEmailAccount(
        employee_id=user.id,
        email="bhaumik2652005@gmail.com",
        provider="Gmail",
        authentication_method="SMTP",
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        encryption="TLS",
        smtp_username="bhaumik2652005@gmail.com",
        encrypted_smtp_password=encrypt_credential("invalid_app_pass_1234"),
        sender_name="Bhaumik Prajapati",
        is_active=True
    )
    res_invalid = test_smtp_connection_for_account(acct_invalid_pw, db)
    print("Result Invalid Password:", res_invalid)
    assert res_invalid["status"] == "failed"
    assert res_invalid["error_code"] == "SMTP_AUTH_FAILED"
    print("PASS: Correctly returned error_code=SMTP_AUTH_FAILED!")

    # -----------------------------------------------------------
    # TEST 4: Wrong SMTP Host (SMTP_HOST_UNREACHABLE)
    # -----------------------------------------------------------
    print("\n--- TEST 4: Wrong SMTP Host ---")
    acct_wrong_host = EmployeeEmailAccount(
        employee_id=user.id,
        email="bhaumik2652005@gmail.com",
        provider="Custom",
        authentication_method="SMTP",
        smtp_host="invalid.nonexistent.smtp.server.com",
        smtp_port=587,
        encryption="TLS",
        smtp_username="bhaumik2652005@gmail.com",
        encrypted_smtp_password=encrypt_credential("wlmr dypf gzru ztho"),
        sender_name="Bhaumik Prajapati",
        is_active=True
    )
    res_wrong_host = test_smtp_connection_for_account(acct_wrong_host, db)
    print("Result Wrong Host:", res_wrong_host)
    assert res_wrong_host["status"] == "failed"
    assert res_wrong_host["error_code"] in ["SMTP_HOST_UNREACHABLE", "SMTP_CONNECTION_TIMEOUT"]
    print("PASS: Correctly returned error_code=%s!" % res_wrong_host["error_code"])

    # -----------------------------------------------------------
    # TEST 5: Employee without Email Configuration (SMTP_CONFIGURATION_ERROR)
    # -----------------------------------------------------------
    print("\n--- TEST 5: Employee without Configuration ---")
    acct_no_config = None
    res_no_config = test_smtp_connection_for_account(acct_no_config, db)
    print("Result No Config:", res_no_config)
    assert res_no_config["status"] == "failed"
    assert res_no_config["error_code"] == "SMTP_CONFIGURATION_ERROR"
    print("PASS: Correctly returned error_code=SMTP_CONFIGURATION_ERROR!")

    # -----------------------------------------------------------
    # TEST 6: REAL EMAIL TRANSMISSION FROM bhaumik2652005@gmail.com
    # -----------------------------------------------------------
    print("\n--- TEST 6: REAL EMAIL TRANSMISSION via Gmail App Password ---")
    sender_email = "bhaumik2652005@gmail.com"
    app_password = "wlmr dypf gzru ztho"
    recipient_email = "bhaumik2652005@gmail.com"

    print("Transmitting real test email from %s to %s..." % (sender_email, recipient_email))

    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    msg = MIMEMultipart("alternative")
    msg["From"] = f"Bhaumik Prajapati <{sender_email}>"
    msg["To"] = recipient_email
    msg["Subject"] = "LeadAI CRM - Real SMTP Outreach Test Verification"

    body_html = """
    <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
      <h2 style="color: #38bdf8;">🚀 LeadAI CRM - Real Gmail Transmission Verification</h2>
      <p>Hello Bhaumik,</p>
      <p>This is a <strong>real test email</strong> sent automatically from your authenticated Gmail account (<code>bhaumik2652005@gmail.com</code>) using your 16-character App Password!</p>
      <hr style="border-color: #334155;"/>
      <p style="font-size: 12px; color: #94a3b8;">Sent via LeadAI Single Company CRM &bull; Blueboxx DA Private Limited</p>
    </div>
    """
    msg.attach(MIMEText(body_html, "html"))

    # Connect via create_smtp_server helper (Port 587 TLS)
    smtp_conn = create_smtp_server("smtp.gmail.com", 587, encryption="TLS", timeout=12.0)
    smtp_conn.login(sender_email, app_password)
    smtp_conn.sendmail(sender_email, recipient_email, msg.as_string())
    smtp_conn.quit()

    print("SUCCESS: Real test email transmitted successfully to %s!" % recipient_email)

    print("\n=========================================================")
    print(" ALL 6 SMTP TEST SUITE SCENARIOS PASSED SUCCESSFULLY!")
    print("=========================================================")

finally:
    db.close()
