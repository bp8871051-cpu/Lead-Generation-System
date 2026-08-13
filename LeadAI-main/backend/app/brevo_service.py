import os
import json
import urllib.request
import urllib.error
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("leadai.brevo")
logger.setLevel(logging.INFO)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_ACCOUNT_URL = "https://api.brevo.com/v3/account"

def get_brevo_api_key(custom_key: Optional[str] = None) -> str:
    """
    Retrieves the Brevo API Key securely without exposing or logging it.
    Prioritizes explicit account key or system environment variable.
    """
    if custom_key and custom_key.strip().startswith("xkeysib-"):
        return custom_key.strip()
    key = getattr(settings, "BREVO_API_KEY", None) or os.getenv("BREVO_API_KEY", "")
    return key.strip() if key else ""



class BrevoEmailService:
    @staticmethod
    def verify_api_key(api_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Verifies Brevo API Key authentication via /v3/account endpoint (Port 443 HTTPS).
        """
        key = get_brevo_api_key(api_key)
        if not key:
            return {"status": "failed", "error_code": "BREVO_AUTH_FAILED", "message": "Brevo API Key is missing or unconfigured."}

        req = urllib.request.Request(
            BREVO_ACCOUNT_URL,
            headers={
                "api-key": key,
                "Accept": "application/json"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                account_email = data.get("email", "")
                company = data.get("companyName", "BLUEBOXX")
                logger.info(f"[BREVO VERIFY SUCCESS] Account verified for email={account_email}, company={company}")
                return {
                    "status": "success",
                    "error_code": None,
                    "message": f"Successfully authenticated with Brevo API ({account_email} - {company})",
                    "account_email": account_email,
                    "company_name": company
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            logger.error(f"[BREVO VERIFY ERROR] HTTP {e.code}: {err_body}")
            return {
                "status": "failed",
                "error_code": "BREVO_AUTH_FAILED",
                "message": f"Brevo API Authentication Failed (HTTP {e.code}): Invalid API Key."
            }
        except Exception as e:
            logger.error(f"[BREVO VERIFY EXCEPTION] {str(e)}")
            return {
                "status": "failed",
                "error_code": "BREVO_CONNECTION_ERROR",
                "message": f"Failed to connect to Brevo API: {str(e)}"
            }

    @staticmethod
    def send_transactional_email(
        sender_name: str,
        sender_email: str,
        recipient_email: str,
        subject: str,
        html_content: str,
        custom_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends a real transactional email via Brevo HTTPS API (Port 443).
        Returns dict with status, message_id, or error_message.
        """
        key = get_brevo_api_key(custom_api_key)
        if not key:
            return {"status": "failed", "error_message": "Brevo API Key is missing or unconfigured."}

        sender_email = (sender_email or getattr(settings, "DEFAULT_SENDER_EMAIL", "sumedha.blueboxx@gmail.com")).strip()
        sender_name = (sender_name or getattr(settings, "DEFAULT_SENDER_NAME", "Sumedha Agrawal")).strip()
        recipient_email = (recipient_email or "").strip()
        recipient_name = (recipient_name or recipient_email.split('@')[0] if '@' in recipient_email else "Valued Client").strip()

        payload = {
            "sender": {
                "name": sender_name,
                "email": sender_email
            },
            "to": [
                {
                    "email": recipient_email,
                    "name": recipient_name
                }
            ],
            "subject": subject,
            "htmlContent": html_content
        }

        req_data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            BREVO_API_URL,
            data=req_data,
            headers={
                "api-key": key,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )

        logger.info(f"[BREVO SEND ATTEMPT] Sender={sender_name} <{sender_email}>, Recipient={recipient_name} <{recipient_email}>, Subject='{subject}'")

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                resp_text = resp.read().decode('utf-8')
                res_json = json.loads(resp_text)
                message_id = res_json.get("messageId", "")
                logger.info(f"[BREVO SEND SUCCESS] messageId={message_id}, recipient={recipient_email}")
                return {
                    "status": "success",
                    "message_id": message_id,
                    "message": "Email delivered successfully via Brevo HTTPS API."
                }
        except urllib.error.HTTPError as e:
            err_text = e.read().decode('utf-8') if e.fp else str(e)
            logger.error(f"[BREVO SEND ERROR] HTTP {e.code}: {err_text}")
            try:
                err_json = json.loads(err_text)
                msg = err_json.get("message", err_text)
            except Exception:
                msg = err_text
            return {
                "status": "failed",
                "error_message": f"Brevo API Error (HTTP {e.code}): {msg}"
            }
        except Exception as e:
            logger.error(f"[BREVO SEND EXCEPTION] {str(e)}")
            return {
                "status": "failed",
                "error_message": f"Brevo Connection Exception: {str(e)}"
            }
