from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt

from app import db
from app.models import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    """Adds the token to blocklist so it cannot be used again."""
    from app.models import TokenBlocklist
    jti = get_jwt()["jti"]
    blocked = TokenBlocklist(jti=jti)
    db.session.add(blocked)
    db.session.commit()
    return jsonify({"message": "Successfully logged out"}), 200

@auth_bp.route("/auth/verify-otp", methods=["POST"])
def verify_otp():
    """Verify email OTP after registration."""
    data = request.get_json() or {}
    email = data.get("email", "").lower().strip()
    otp_code = data.get("otp", "").strip()
    
    if not email or not otp_code:
        return jsonify({"error": "Email and OTP are required"}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if user.is_verified:
        return jsonify({"message": "User is already verified"}), 200
        
    from datetime import datetime
    if not user.otp or user.otp != otp_code:
        return jsonify({"error": "Invalid OTP"}), 400
        
    if user.otp_expiry and datetime.utcnow() > user.otp_expiry:
        return jsonify({"error": "OTP has expired. Please request a new one."}), 400
        
    user.is_verified = True
    user.otp = None
    user.otp_expiry = None
    db.session.commit()
    
    return jsonify({"message": "Email verified successfully!"}), 200




import random
from datetime import datetime, timedelta
from app.models import EmailOTP
from app.email_utils import send_email_async

from app import limiter
@auth_bp.route("/send-otp", methods=["POST"])
@limiter.limit("5 per minute")
def send_otp():
    data = request.get_json() or {}
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email is required."}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email is already registered."}), 409
        
    otp = str(random.randint(100000, 999999))
    
    # Check if exists, update or create
    otp_record = EmailOTP.query.filter_by(email=email).first()
    if otp_record:
        otp_record.otp = otp
        otp_record.expires_at = datetime.utcnow() + timedelta(minutes=10)
    else:
        otp_record = EmailOTP(email=email, otp=otp, expires_at=datetime.utcnow() + timedelta(minutes=10))
        db.session.add(otp_record)
        
    db.session.commit()
    
    # Send email
    subject = "Buzzer - Verify your email"
    body = f"Your OTP for registration is: {otp}\nIt will expire in 10 minutes."
    send_email_async(email, subject, body)
    
    return jsonify({"message": "OTP sent successfully."}), 200


@auth_bp.route("/forgot-password/send-otp", methods=["POST"])
@limiter.limit("5 per minute")
def forgot_password_send_otp():
    """Send a 6-digit OTP to the user's email to reset forgotten password."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required."}), 400

    user = User.query.filter_by(email=email, is_deleted=False).first()
    if not user:
        return jsonify({"error": "No account found with this email address."}), 404

    otp = str(random.randint(100000, 999999))
    otp_record = EmailOTP.query.filter_by(email=email).first()
    if otp_record:
        otp_record.otp = otp
        otp_record.expires_at = datetime.utcnow() + timedelta(minutes=10)
    else:
        otp_record = EmailOTP(email=email, otp=otp, expires_at=datetime.utcnow() + timedelta(minutes=10))
        db.session.add(otp_record)

    db.session.commit()

    subject = "Buzzer - Password Reset OTP"
    body = f"Hello {user.name},\n\nYour OTP to reset your password is: {otp}\n\nThis OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email."
    send_email_async(email, subject, body)

    return jsonify({"message": "Password reset OTP sent to your email."}), 200


@auth_bp.route("/forgot-password/reset", methods=["POST"])
@limiter.limit("5 per minute")
def forgot_password_reset():
    """Verify OTP and reset password. Body: {email, otp, new_password}"""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()
    new_password = data.get("new_password")

    if not email or not otp or not new_password:
        return jsonify({"error": "Email, OTP, and new password are required."}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    otp_record = EmailOTP.query.filter_by(email=email).first()
    if not otp_record or otp_record.otp != otp:
        return jsonify({"error": "Invalid or expired OTP."}), 400

    if otp_record.expires_at < datetime.utcnow():
        db.session.delete(otp_record)
        db.session.commit()
        return jsonify({"error": "OTP has expired. Please request a new one."}), 400

    user = User.query.filter_by(email=email, is_deleted=False).first()
    if not user:
        return jsonify({"error": "User account not found."}), 404

    user.set_password(new_password)
    if user.session_version is None:
        user.session_version = 1
    user.session_version += 1

    db.session.delete(otp_record)
    db.session.commit()

    return jsonify({"message": "Password reset successful! You can now log in with your new password."}), 200


@auth_bp.route("/register", methods=["POST"])

def register():
    """Register a new user.  Body: {name, email, phone, password, role, otp}"""
    data = request.get_json() or {}

    required = ("name", "email", "password", "role", "otp")
    for field in required:
        if field not in data:
            return jsonify({"error": f"'{field}' is required."}), 400
            
    # Verify OTP
    otp_record = EmailOTP.query.filter_by(email=data["email"]).first()
    if not otp_record or otp_record.otp != data["otp"]:
        return jsonify({"error": "Invalid or expired OTP."}), 400
    if otp_record.expires_at < datetime.utcnow():
        db.session.delete(otp_record)
        db.session.commit()
        return jsonify({"error": "OTP has expired."}), 400
        
    db.session.delete(otp_record)

    if data["role"] not in ("user", "seller", "delivery"):
        if data["role"] == "admin": return jsonify({"error": "Admin registration is not allowed via public API."}), 403
        return jsonify({"error": "Invalid role."}), 400

    import re
    if not re.match(r"[^@]+@[^@]+\.[^@]+", data["email"]):
        return jsonify({"error": "Invalid email format."}), 400
        
    phone = data.get("phone")
    if phone and not re.match(r"^\+?[0-9\-\s]{7,15}$", phone):
        return jsonify({"error": "Invalid phone number format."}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "?? ????? ???? ???? ?????????? ???? ??? ?????? ??? ??? ???? ????? ??????? ?????"}), 409
        
    if data.get("phone") and User.query.filter_by(phone=data["phone"]).first():
        return jsonify({"error": "?? ??? ????? ???? ???? ?????????? ???? ??? ?????? ??? ??? ???? ????? ??????? ?????"}), 409

    user = User(
        name=data["name"],
        nickname=data.get("nickname"),
        email=data["email"],
        phone=data.get("phone"),
        role=data["role"],
        # users are auto-approved; sellers & delivery need admin approval
        is_approved=data["role"] == "user",
    )
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Registration successful.", "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    """Login.  Body: {email, password}"""
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    if user.is_deleted:
        return jsonify({"error": "Account has been deleted/disabled. Please contact support."}), 403
        
    if user.is_suspended:
        return jsonify({"error": "Your account has been suspended by the administrator."}), 403

    # Bump session version to invalidate old sessions (Single Device Login)
    if user.session_version is None: user.session_version = 1
    # user.session_version += 1  // DISABLED FOR DUAL TESTING
    db.session.commit()
    
    additional_claims = {"role": user.role, "email": user.email, "session_version": user.session_version}
    access_token = create_access_token(identity=str(user.id),
                                       additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }), 200


from flask_jwt_extended import jwt_required, get_jwt_identity

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """Verify current token and return user details (Auto Login)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    return jsonify({"user": user.to_dict()}), 200

import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

@auth_bp.route("/config", methods=["GET"])
def get_config():
    """Return public config for frontend (e.g. Google Client ID)"""
    return jsonify({
        "google_client_id": os.environ.get("GOOGLE_CLIENT_ID", "")
    }), 200


@auth_bp.route("/google", methods=["POST"])
def google_login():
    """Login with Google ID Token. Returns is_new_user=True if user doesn't exist."""
    data = request.get_json() or {}
    token = data.get("token")
    
    if not token:
        return jsonify({"error": "Google token is required."}), 400
        
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    if not client_id:
        return jsonify({"error": "Google Client ID is not configured on server."}), 500

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        email = idinfo.get("email")
        name = idinfo.get("name")
        google_id = idinfo.get("sub")
        
        user = User.query.filter_by(email=email).first()
        if not user:
            signup_token = create_access_token(
                identity=f"google_signup:{email}",
                expires_delta=timedelta(minutes=15),
                additional_claims={
                    "signup_email": email,
                    "signup_name": name,
                    "google_id": google_id
                }
            )
            return jsonify({
                "is_new_user": True,
                "signup_token": signup_token,
                "google_id": google_id,
                "email": email,
                "name": name
            }), 200

        # Log them in if exists
        if user.session_version is None: user.session_version = 1
        user.session_version += 1
        db.session.commit()
        
        additional_claims = {"role": user.role, "email": user.email, "session_version": user.session_version}
        access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id))

        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user.to_dict(),
        }), 200

    except ValueError:
        return jsonify({"error": "Invalid Google token."}), 401


@auth_bp.route("/google/complete-signup", methods=["POST"])
def google_complete_signup():
    """Complete signup for new Google users by assigning a role and phone."""
    from flask_jwt_extended import decode_token
    data = request.get_json() or {}
    email = data.get("email")
    name = data.get("name")
    role = data.get("role")
    phone = data.get("phone")
    signup_token = data.get("signup_token")
    token = data.get("token")

    # Cryptographically verify the Google signup identity
    verified_email = None
    if signup_token:
        try:
            claims = decode_token(signup_token)
            if claims.get("sub") == f"google_signup:{email}":
                verified_email = claims.get("signup_email")
                if not name:
                    name = claims.get("signup_name")
        except Exception:
            return jsonify({"error": "Invalid or expired Google signup session. Please log in with Google again."}), 401
    elif token:
        client_id = os.environ.get("GOOGLE_CLIENT_ID")
        if client_id:
            try:
                idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
                verified_email = idinfo.get("email")
            except Exception:
                return jsonify({"error": "Invalid Google token."}), 401

    if not verified_email or verified_email.lower() != (email or "").lower():
        return jsonify({"error": "Unauthorized: Google token verification failed. Please sign in with Google again."}), 401

    if not all([email, name, role, phone]):
        return jsonify({"error": "Missing required fields (including phone)."}), 400
        
    if role not in ("user", "seller", "delivery"):
        if role == "admin": return jsonify({"error": "Admin registration is not allowed via public API."}), 403
        return jsonify({"error": "Invalid role."}), 400
        
    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({"error": f"?? ????? ???? ???? {user.role} ?????????? ???? ??? ??????"}), 409
        
    if User.query.filter_by(phone=phone).first():
        return jsonify({"error": "?? ??? ????? ???? ???? ?????????? ???? ??? ?????? ??? ??? ???? ????? ??????? ?????"}), 409
        
    user = User(
        name=name,
        email=email,
        phone=phone,
        role=role,
        is_approved=role == "user",
    )
    user.set_password(os.urandom(16).hex())
    db.session.add(user)
    db.session.commit()

    if user.session_version is None: user.session_version = 1
    
    additional_claims = {"role": user.role, "email": user.email, "session_version": user.session_version}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }), 201


@auth_bp.route("/platform-config", methods=["GET"])
def get_platform_config():
    from app.models import SystemSetting
    keys = ["cod_enabled", "online_payment_enabled", "platform_paused", "pause_message"]
    defaults = {"cod_enabled": "true", "online_payment_enabled": "false", "platform_paused": "false", "pause_message": ""}
    
    result = {}
    for k in keys:
        setting = SystemSetting.query.filter_by(key=k).first()
        val = setting.value if setting else defaults[k]
        result[k] = val if k == "pause_message" else (val == "true")
    return jsonify(result), 200

