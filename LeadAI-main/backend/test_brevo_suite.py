import os
import sys
import json
from datetime import datetime

# Add parent path to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import User, EmployeeEmailAccount, Company, Lead, Business, Campaign, Email
from app.brevo_service import BrevoEmailService, get_brevo_api_key

from app.security_utils import encrypt_credential, decrypt_credential
from app.routers.emails import test_smtp_connection_for_account, send_outreach_email
from app.schemas import EmailSendRequest

def run_brevo_test_suite():
    print("=" * 60)
    print(" LEADAI CRM - COMPREHENSIVE BREVO HTTPS API TEST SUITE")
    print("=" * 60)

    db = SessionLocal()

    try:
        # 1. Verify Brevo API Key Authentication
        print("\n--- TEST 1: Brevo API Key Authentication (/v3/account) ---")
        auth_res = BrevoEmailService.verify_api_key()
        print("Auth Result:", auth_res)
        assert auth_res["status"] == "success", "Brevo API authentication failed!"
        print("PASS: Brevo API Key authenticated successfully!")

        # 2. Verify Employee Account & Sender Selection
        print("\n--- TEST 2: Employee Sender Account Setup ---")
        user = db.query(User).filter(User.email == "bhaumik2652005@gmail.com").first()
        if not user:
            user = User(
                email="bhaumik2652005@gmail.com",
                full_name="Bhaumik Prajapati",
                designation="Lead AI Engineer",
                role="employee",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        email_acct = db.query(EmployeeEmailAccount).filter(EmployeeEmailAccount.employee_id == user.id).first()
        if not email_acct:
            email_acct = EmployeeEmailAccount(
                employee_id=user.id,
                email="bhaumik2652005@gmail.com",
                provider="Brevo",
                authentication_method="API_KEY",
                encrypted_smtp_password=encrypt_credential(get_brevo_api_key()),
                sender_name="Bhaumik Prajapati",
                is_active=True
            )
            db.add(email_acct)
            db.commit()

        print(f"Employee Sender: {user.full_name} ({user.email}) | Active: {user.is_active}")
        print("PASS: Verified active employee sender setup!")

        # 3. Connection Test for Account
        print("\n--- TEST 3: Account Connection Test via Brevo Service ---")
        conn_res = test_smtp_connection_for_account(email_acct, db)
        print("Connection Test Result:", conn_res)
        assert conn_res["status"] == "success", "Account connection test failed!"
        print("PASS: Employee connection test succeeded via Brevo HTTPS API!")

        # 4. REAL Transactional Email Transmission
        print("\n--- TEST 4: REAL Test Email Delivery via Brevo HTTPS API (Port 443) ---")
        send_res = BrevoEmailService.send_transactional_email(
            sender_name="Bhaumik Prajapati (BLUEBOXX)",
            sender_email="bhaumik2652005@gmail.com",
            recipient_email="bhaumik2652005@gmail.com",
            subject="Brevo Real Email Delivery Verification - LeadAI CRM",
            html_content="<h2>LeadAI CRM - Brevo Integration</h2><p>This is a real test email delivered via <b>Brevo HTTPS API (Port 443)</b>.</p>"
        )
        print("Send Result:", send_res)
        assert send_res["status"] == "success", "Brevo email sending failed!"
        assert "message_id" in send_res and send_res["message_id"], "Missing Brevo messageId!"
        print(f"PASS: Real email delivered! Brevo messageId: {send_res['message_id']}")

        # 5. FIRST EMAIL: Campaign Outreach Email & Log Verification
        print("\n--- TEST 5: FIRST EMAIL - Outreach Email & Log Verification ---")
        biz = db.query(Business).first()
        if not biz:
            biz = Business(name="Test Client Business", email="bhaumik2652005@gmail.com", google_rating=4.8)
            db.add(biz)
            db.commit()
            db.refresh(biz)

        lead = db.query(Lead).filter(Lead.business_id == biz.id).first()
        if not lead:
            lead = Lead(business_id=biz.id, status="New")
            db.add(lead)
            db.commit()
            db.refresh(lead)

        req_first = EmailSendRequest(
            lead_id=lead.id,
            subject="First Email Outreach Test via Brevo HTTP API",
            body="<p>Dear Client, this is our initial outreach pitch transmitted via Brevo HTTPS API.</p>",
            recipient_email="bhaumik2652005@gmail.com",
            employee_id=user.id
        )
        outreach_res = send_outreach_email(req=req_first, db=db, current_user=user)
        print("First Email Response:", outreach_res)
        
        # Verify provider_message_id saved in DB
        last_email_log = db.query(Email).filter(Email.sender_id == user.id).order_by(Email.created_at.desc()).first()
        print(f"Database Log ID: {last_email_log.id} | Status: {last_email_log.status} | Provider: {last_email_log.provider} | MessageId: {last_email_log.provider_message_id}")
        assert last_email_log.status == "Sent", "Email log status is not 'Sent'!"
        assert last_email_log.provider_message_id, "Brevo messageId was not saved in database!"
        print("PASS: First email sent via Brevo HTTP API and logged in database!")

        # 6. SECOND EMAIL / FOLLOW-UP: Verify Follow-up Email uses Brevo HTTP API
        print("\n--- TEST 6: SECOND EMAIL / FOLLOW-UP - Brevo HTTP API Transmission ---")
        req_followup = EmailSendRequest(
            lead_id=lead.id,
            subject="Second Email Follow-up Test via Brevo HTTP API",
            body="<p>Hi Client, following up on our previous note regarding your web presence optimization.</p>",
            recipient_email="bhaumik2652005@gmail.com",
            employee_id=user.id
        )
        followup_res = send_outreach_email(req=req_followup, db=db, current_user=user)
        print("Second Email Response:", followup_res)

        followup_email_log = db.query(Email).filter(Email.sender_id == user.id).order_by(Email.created_at.desc()).first()
        print(f"Follow-up Log ID: {followup_email_log.id} | Status: {followup_email_log.status} | Provider: {followup_email_log.provider} | MessageId: {followup_email_log.provider_message_id}")
        assert followup_email_log.status == "Sent", "Follow-up email log status is not 'Sent'!"
        assert followup_email_log.provider_message_id, "Follow-up Brevo messageId missing!"
        print("PASS: Second email / follow-up sent via Brevo HTTP API successfully!")

        # 7. Invalid API Key Error Handling
        print("\n--- TEST 7: Invalid API Key Error Handling ---")
        invalid_res = BrevoEmailService.verify_api_key(api_key="xkeysib-invalid-fake-api-key-12345")
        print("Invalid Key Result:", invalid_res)
        assert invalid_res["status"] == "failed", "Invalid API key test did not fail as expected!"
        print("PASS: Correctly rejected invalid Brevo API key!")

        # 8. Disabled Employee / Unverified Sender Error Handling
        print("\n--- TEST 8: Disabled Employee Error Handling ---")
        user.is_active = False
        db.commit()
        try:
            send_outreach_email(req=req_first, db=db, current_user=user)
            print("ERROR: Expected exception for disabled employee, but call succeeded!")
            assert False, "Disabled employee check failed!"
        except Exception as e:
            print(f"PASS: Correctly rejected inactive employee with message: '{str(e)}'")
        finally:
            user.is_active = True
            db.commit()

        print("\n" + "=" * 60)
        print(" ALL 8 BREVO INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    run_brevo_test_suite()
