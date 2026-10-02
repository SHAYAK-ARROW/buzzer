from functools import wraps

from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def role_required(*allowed_roles):
    """
    Decorator that restricts route access to specific roles.
    Reads role from JWT claims (stateless — no DB hit).

    Usage:
        @role_required("admin")
        @role_required("seller", "admin")
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role")
            if not user_role or user_role not in allowed_roles:
                return jsonify({
                    "error": "forbidden",
                    "message": f"Access denied. Requires one of: {', '.join(allowed_roles)}."
                }), 403
            
            from flask_jwt_extended import current_user
            if not current_user:
                return jsonify({
                    "error": "unauthorized",
                    "message": "User account inactive, suspended, or not found."
                }), 401

            if getattr(current_user, 'is_suspended', False):
                return jsonify({
                    "error": "forbidden",
                    "message": "Your account has been suspended by the administrator."
                }), 403

            if getattr(current_user, 'is_deleted', False):
                return jsonify({
                    "error": "forbidden",
                    "message": "Your account has been deactivated or deleted."
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator

