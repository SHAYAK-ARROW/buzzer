import os

from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
socketio = SocketIO(cors_allowed_origins=ALLOWED_ORIGINS)
limiter = Limiter(key_func=get_remote_address, default_limits=["50000 per day", "5000 per hour"])


# ---------------------------------------------------------------------------
# Extensions – instantiated globally, bound inside create_app()
# ---------------------------------------------------------------------------
db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()


def create_app(config_name=None):
    """Application factory."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__, static_folder='../static', static_url_path='/')

    from app.config import config_by_name
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))

    # Init extensions
    db.init_app(app)
    jwt.init_app(app)

    # JWT Token Revocation Loader
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        from app.models import TokenBlocklist
        token = db.session.query(TokenBlocklist.id).filter_by(jti=jti).scalar()
        return token is not None

    limiter.init_app(app)
    socketio.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})

    @app.route("/")
    def index():
        return app.send_static_file("index.html")

    @app.errorhandler(404)
    def not_found(e):
        from flask import request, jsonify
        if request.path.startswith('/api/'):
            return jsonify({"error": "Endpoint not found"}), 404
        return app.send_static_file("index.html")

    # Global try-except equivalent: Catch ALL runtime errors
    @app.errorhandler(Exception)
    def handle_exception(e):
        from flask import request, jsonify
        import traceback
        import logging
        from sqlalchemy.exc import OperationalError
        
        # Log the full stack trace to the console for debugging
        logging.error(f"Runtime Error on {request.method} {request.path}: {str(e)}")
        logging.error(traceback.format_exc())
        
        # Return a safe JSON response so the frontend doesn't crash
        if request.path.startswith('/api/'):
            if isinstance(e, OperationalError):
                return jsonify({
                    "error": "Database Offline",
                    "message": "The Supabase Database is currently paused or waking up. Please try again in 1 minute or check the Supabase dashboard."
                }), 503

            # Only send the actual error message in dev mode, maybe generic otherwise
            return jsonify({
                "error": "Internal Server Error",
                "message": "An unexpected error occurred in the system.",
                "details": str(e)
            }), 500
            
        # For non-API routes, just send back a text response or index.html
        if isinstance(e, OperationalError):
            return "The Database is currently sleeping (Supabase Auto-Pause). Please wake it up.", 503
        return f"A server error occurred: {str(e)}", 500

    # JWT handlers
    _register_jwt_handlers(jwt)

    # Blueprints
    _register_blueprints(app)

    # Background scheduler (deadline checker)
    from app.tasks.scheduler import init_scheduler
    init_scheduler(app)

    from app import sockets
    return app


# ---------------------------------------------------------------------- #
#  Blueprints
# ---------------------------------------------------------------------- #
def _register_blueprints(app):
    @app.before_request
    def check_maintenance_mode():
        from flask import request, jsonify
        if not request.path.startswith('/api/'):
            return
        # Admins can bypass to turn the system back on, users can login
        if request.path.startswith('/api/admin/') or request.path == '/api/auth/login':
            return 
        
        try:
            from app.models import SystemSetting
            is_active = SystemSetting.get_setting("is_system_active", True)
            if not is_active:
                return jsonify({
                    "error": "maintenance_mode",
                    "message": "Platform is currently paused for maintenance or emergency. Please try again later."
                }), 503
        except Exception:
            pass

    from app.routes.auth import auth_bp
    from app.routes.user import user_bp
    from app.routes.seller import seller_bp
    from app.routes.delivery import delivery_bp
    from app.routes.admin import admin_bp
    from app.routes.shop_browse import shop_browse_bp
    from app.routes.communications import comm_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api")
    app.register_blueprint(seller_bp, url_prefix="/api/seller")
    app.register_blueprint(delivery_bp, url_prefix="/api/delivery")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(shop_browse_bp, url_prefix="/api")
    app.register_blueprint(comm_bp, url_prefix="/api/comm")


# ---------------------------------------------------------------------- #
#  JWT error / lookup handlers
# ---------------------------------------------------------------------- #
def _register_jwt_handlers(jwt_manager):
    from app.models import User

    @jwt_manager.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        user = db.session.get(User, int(identity))
        
        if user:
            if user.is_suspended or user.is_deleted:
                return None
            token_session_version = jwt_data.get("session_version")
            if token_session_version and user.session_version and token_session_version != user.session_version:
                # Session mismatch - user logged in on another device
                return None
        return user

    @jwt_manager.user_lookup_error_loader
    def user_lookup_error_callback(_jwt_header, _jwt_payload):
        return jsonify({
            "error": "unauthorized",
            "message": "User account is suspended, deleted, or session has expired."
        }), 401

    @jwt_manager.unauthorized_loader
    def missing_token_callback(error_string):
        return jsonify({"error": "authorization_required",
                        "message": "Request does not contain an access token."}), 401

    @jwt_manager.expired_token_loader
    def expired_token_callback(_jwt_header, _jwt_payload):
        return jsonify({"error": "token_expired",
                        "message": "The token has expired."}), 401

    @jwt_manager.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({"error": "invalid_token",
                        "message": "Signature verification failed or token is malformed."}), 401

