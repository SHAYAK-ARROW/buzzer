from flask import Blueprint, request, jsonify
from app.auth_helpers import role_required
import logging

comm_bp = Blueprint("communications", __name__)
logger = logging.getLogger(__name__)

@comm_bp.route("/send-sms", methods=["POST"])
@role_required("admin")
def mock_send_sms():
    data = request.get_json() or {}
    phone = data.get("phone")
    message = data.get("message")
    
    if not phone or not message:
        return jsonify({"error": "Phone and message required."}), 400
        
    # TODO: Add real SMS Gateway (MSG91 / Twilio) here later
    logger.info(f"[MOCK SMS] To: {phone} | Message: {message}")
    print(f"\n[MOCK SMS] To: {phone} | Message: {message}\n")
    
    return jsonify({"message": "SMS Mock sent successfully. Check terminal logs."}), 200

@comm_bp.route("/send-email", methods=["POST"])
@role_required("admin")
def mock_send_email():
    data = request.get_json() or {}
    email = data.get("email")
    subject = data.get("subject", "Buzzer Update")
    body = data.get("body")
    
    if not email or not body:
        return jsonify({"error": "Email and body required."}), 400
        
    from app.email_utils import send_email_async
    send_email_async(email, subject, body)
    
    return jsonify({"message": "Email request processed."}), 200
