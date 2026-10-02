from app.utils import safe_float
"""
Admin routes.

Prefix: /api/admin
"""

from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import current_user

from app import db
from app.auth_helpers import role_required
from app.models import User, Shop, Order, WalletTransaction

admin_bp = Blueprint("admin", __name__)


# ------------------------------------------------------------------
#  Approve User  (seller / delivery)
# ------------------------------------------------------------------
@admin_bp.route("/users/<int:user_id>/approve", methods=["PATCH"])
@role_required("admin")
def approve_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    user.is_approved = True
    db.session.commit()
    return jsonify({"message": f"User '{user.name}' approved.", "user": user.to_dict()}), 200

# ------------------------------------------------------------------
#  Toggle Platform Verification (Tier 1 Trusted)
# ------------------------------------------------------------------
@admin_bp.route("/users/<int:user_id>/verify", methods=["PATCH"])
@role_required("admin")
def toggle_verify_user(user_id):
    user = db.session.get(User, user_id)
    if not user or user.role != "delivery":
        return jsonify({"error": "Delivery partner not found."}), 404

    user.is_platform_verified = not user.is_platform_verified
    db.session.commit()
    state = "VERIFIED (0s Head Start)" if user.is_platform_verified else "UNVERIFIED (30s delay)"
    return jsonify({"message": f"Partner '{user.name}' is now {state}.", "user": user.to_dict()}), 200


# ------------------------------------------------------------------
#  Approve Shop
# ------------------------------------------------------------------
@admin_bp.route("/shops/<int:shop_id>/approve", methods=["PATCH"])
@role_required("admin")
def approve_shop(shop_id):
    shop = db.session.get(Shop, shop_id)
    if not shop:
        return jsonify({"error": "Shop not found."}), 404

    shop.is_approved = True
    db.session.commit()
    return jsonify({"message": f"Shop '{shop.name}' approved.", "shop": shop.to_dict()}), 200


# ------------------------------------------------------------------
#  Wallet Top-Up  (Feature 1 Ã¢â‚¬â€ manual MVP)
# ------------------------------------------------------------------
@admin_bp.route("/wallet/topup", methods=["POST"])
@role_required("admin")
def wallet_topup():
    """Body: {user_id, amount}"""
    data = request.get_json() or {}
    user_id = data.get("user_id")
    amount = data.get("amount", 0)

    if not user_id or amount <= 0:
        return jsonify({"error": "Valid user_id and positive amount required."}), 400

    user = db.session.query(User).with_for_update().get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    if user.role != "delivery":
        return jsonify({"error": "Wallet top-up is only for delivery partners."}), 400

    user.wallet_balance += amount

    txn = WalletTransaction(
        from_type="admin",
        from_id=current_user.id,
        to_type="delivery_partner",
        to_id=user.id,
        amount=amount,
        transaction_type="security_deposit",
    )
    db.session.add(txn)
    db.session.commit()

    return jsonify({
        "message": f"Ã Â§Â³{amount} topped up to {user.name}'s wallet.",
        "new_balance": user.wallet_balance,
        "transaction": txn.to_dict(),
    }), 200


# ------------------------------------------------------------------
#  Shop Response Stats  (Feature 6)
# ------------------------------------------------------------------
@admin_bp.route("/shops/<int:shop_id>/response-stats", methods=["GET"])
@role_required("admin")
def shop_response_stats(shop_id):
    shop = db.session.get(Shop, shop_id)
    if not shop:
        return jsonify({"error": "Shop not found."}), 404

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    total_orders = Order.query.filter(
        Order.shop_id == shop_id,
        Order.created_at >= thirty_days_ago,
    ).count()

    no_response_cancelled = Order.query.filter(
        Order.shop_id == shop_id,
        Order.created_at >= thirty_days_ago,
        Order.cancellation_reason == "seller_no_response",
    ).count()
    
    accepted_orders = Order.query.filter(
        Order.shop_id == shop_id,
        Order.created_at >= thirty_days_ago,
        Order.status != "pending",
        Order.cancellation_reason != "seller_no_response",
    ).count()

    completed_orders = Order.query.filter(
        Order.shop_id == shop_id,
        Order.created_at >= thirty_days_ago,
        Order.status == "delivered"
    ).count()

    revenue_query = db.session.query(db.func.sum(Order.items_total)).filter(
        Order.shop_id == shop_id,
        Order.created_at >= thirty_days_ago,
        Order.status == "delivered"
    ).scalar()
    total_revenue = float(revenue_query) if revenue_query else 0.0

    from app.models import Product
    active_products = Product.query.filter(
        Product.shop_id == shop_id,
        Product.is_deleted == False,
        Product.is_available == True
    ).count()

    avg_rating_query = db.session.query(db.func.avg(Order.seller_rating)).filter(
        Order.shop_id == shop_id,
        Order.seller_rating != None
    ).scalar()
    avg_rating = round(float(avg_rating_query), 1) if avg_rating_query else 0.0

    return jsonify({
        "shop": shop.to_dict(),
        "last_30_days": {
            "total_orders": total_orders,
            "accepted_orders": accepted_orders,
            "completed_orders": completed_orders,
            "seller_no_response_cancellations": no_response_cancelled,
            "total_revenue": total_revenue,
            "response_rate": (
                round((1 - no_response_cancelled / total_orders) * 100, 1)
                if total_orders > 0 else 100.0
            )
        },
        "all_time": {
            "active_products": active_products,
            "avg_rating": avg_rating
        }
    }), 200


# ------------------------------------------------------------------
#  List all users (admin utility) Ã¢â‚¬â€ with pagination + search
# ------------------------------------------------------------------
@admin_bp.route("/users", methods=["GET"])
@role_required("admin")
def list_users():
    is_deleted_filter = request.args.get('is_deleted', 'false').lower() == 'true'
    role_filter = request.args.get('role', None)          # user/seller/delivery/admin
    search_query = request.args.get('search', '').strip() # name or email search
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(50, int(request.args.get('per_page', 50)))  # max 50 per page

    query = User.query.filter_by(is_deleted=is_deleted_filter)

    if role_filter and role_filter != 'all':
        query = query.filter(User.role == role_filter)

    if request.args.get('is_suspended', '').lower() == 'true':
        query = query.filter(User.is_suspended == True)
        
    if request.args.get('has_complaints', '').lower() == 'true':
        query = query.filter(User.complaints_count > 0)

    if search_query:
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search_query}%'),
                User.email.ilike(f'%{search_query}%'),
                User.nickname.ilike(f'%{search_query}%'),
                User.uid.ilike(f'%{search_query}%'),
            )
        )

    pagination = query.order_by(User.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    users = pagination.items

    user_dicts = [u.to_dict() for u in users]

    return jsonify({
        "users": user_dicts,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        }
    }), 200


import time
_cache = {"platform_balance": 0.0, "last_updated": 0}


@admin_bp.route("/cleanup-logs", methods=["POST"])
@role_required("admin")
def cleanup_logs():
    """Deletes logs older than 30 days to save DB space."""
    from datetime import datetime, timedelta
    from app.models import ShopActivityLog, Notification
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    
    deleted_shop_logs = db.session.query(ShopActivityLog).filter(ShopActivityLog.created_at < cutoff_date).delete()
    deleted_notifications = db.session.query(Notification).filter(Notification.created_at < cutoff_date).delete()
    
    db.session.commit()
    return jsonify({"message": f"Cleaned up {deleted_shop_logs} shop logs and {deleted_notifications} notifications."}), 200


@admin_bp.route("/active-stats", methods=["GET"])
@role_required("admin")
def active_stats():
    from sqlalchemy import func
    from app.models import WalletTransaction
    active_buyers = User.query.filter_by(role="user", is_active=True, is_suspended=False, is_deleted=False).count()
    active_delivery = User.query.filter_by(role="delivery", is_active=True, is_suspended=False, is_deleted=False).count()
    active_admins = User.query.filter_by(role="admin", is_active=True, is_suspended=False, is_deleted=False).count()
    active_shops = Shop.query.filter_by(is_active=True, is_approved=True).count()
    
    global _cache
    if time.time() - _cache["last_updated"] > 300:
        incoming = db.session.query(func.sum(WalletTransaction.amount)).filter_by(to_type='platform').scalar() or 0.0
        outgoing = db.session.query(func.sum(WalletTransaction.amount)).filter_by(from_type='platform').scalar() or 0.0
        _cache["platform_balance"] = incoming - outgoing
        _cache["last_updated"] = time.time()
    
    return jsonify({
        "active_buyers": active_buyers,
        "active_delivery": active_delivery,
        "active_admins": active_admins,
        "active_shops": active_shops,
        "platform_balance": _cache["platform_balance"]
    }), 200

@admin_bp.route("/shops", methods=["GET"])
@role_required("admin")
def list_shops():
    search_query = request.args.get('search', '').strip()
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(50, int(request.args.get('per_page', 50)))

    query = Shop.query
    if request.args.get('is_suspended', '').lower() == 'true':
        query = query.filter(User.is_suspended == True)
        
    if request.args.get('has_complaints', '').lower() == 'true':
        query = query.filter(User.complaints_count > 0)

    if search_query:
        query = query.filter(
            db.or_(
                Shop.name.ilike(f'%{search_query}%'),
                Shop.address.ilike(f'%{search_query}%'),
            )
        )

    pagination = query.order_by(Shop.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "shops": [s.to_dict() for s in pagination.items],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        }
    }), 200

# ------------------------------------------------------------------
#  Create Admin
# ------------------------------------------------------------------
@admin_bp.route("/create-admin", methods=["POST"])
@role_required("admin")
def create_admin():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    new_admin_password = data.get("new_admin_password")
    current_admin_password = data.get("current_admin_password")

    if not all([name, email, new_admin_password, current_admin_password]):
        return jsonify({"error": "All fields are required."}), 400

    # Verify current admin's password
    if not current_user.check_password(current_admin_password):
        return jsonify({"error": "Incorrect current admin password. Authorization denied."}), 401

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "A user with this email already exists."}), 409

    new_admin = User(
        name=name,
        email=email,
        role="admin",
        is_approved=True
    )
    new_admin.set_password(new_admin_password)
    db.session.add(new_admin)
    db.session.commit()

    return jsonify({"message": f"Admin '{name}' created successfully!"}), 201

from app.models import User, Shop, Order, WalletTransaction, Notification, Complaint, OrderItem

# ------------------------------------------------------------------
#  Delete User (admin utility - Soft Delete)
# ------------------------------------------------------------------
from datetime import datetime

@admin_bp.route("/users/<int:user_id>/restore", methods=["POST"])
@role_required("admin")
def restore_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    if not user.is_deleted:
        return jsonify({"error": "User is not deleted."}), 400
        
    try:
        user.is_deleted = False
        user.deleted_at = None
        
        # If user has a shop, we should probably restore it too? The model might not have is_deleted on Shop yet.
        # Let's check if shop has is_deleted:
        if hasattr(user, 'shop') and user.shop and hasattr(user.shop, 'is_deleted'):
            user.shop.is_deleted = False
            user.shop.deleted_at = None
            
        db.session.commit()
        return jsonify({"message": f"User '{user.name}' has been successfully restored!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/users/<int:user_id>", methods=["GET"])
@role_required("admin")
def get_user(user_id):
    user = db.session.get(User, user_id)
    if not user: return jsonify({"error": "User not found."}), 404
    return jsonify({"user": user.to_dict()}), 200

@admin_bp.route("/users/<int:user_id>", methods=["PATCH"])
@role_required("admin")
def edit_user(user_id):
    user = db.session.get(User, user_id)
    if not user: return jsonify({"error": "User not found."}), 404
    
    data = request.get_json() or {}
    if "name" in data: user.name = data["name"]
    if "phone" in data: user.phone = data["phone"]
    
    # Maybe role or email edit later, keeping it simple
    db.session.commit()
    return jsonify({"message": "User updated successfully."}), 200

@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@role_required("admin")
def delete_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    if user.is_deleted:
        return jsonify({"error": "User is already deleted."}), 400
        
    try:
        user.is_deleted = True
        user.deleted_at = datetime.utcnow()
        user.is_approved = False # Revoke approval immediately
        
        # We don't cascade delete related rows, keeping history intact
        
        db.session.commit()
        return jsonify({"message": f"User '{user.name}' has been soft-deleted."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete user: {str(e)}"}), 500

# ------------------------------------------------------------------
#  Notify User
# ------------------------------------------------------------------
@admin_bp.route("/users/<int:user_id>/notify", methods=["POST"])
@role_required("admin")
def notify_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json() or {}
    message = data.get("message", "").strip()
    channels = data.get("channels", ["push"]) # can be push, sms, email
    
    if not message:
        return jsonify({"error": "Message is required."}), 400

    from app.notifications import NotificationService
    NotificationService.notify(user.id, "admin_message", message, channels=channels)
    db.session.commit()
    
    return jsonify({"message": f"Notification sent to {user.name} via {', '.join(channels)}."}), 200

# ------------------------------------------------------------------
#  Broadcast Notification
# ------------------------------------------------------------------
@admin_bp.route("/notify/broadcast", methods=["POST"])
@role_required("admin")
def broadcast_notification():
    data = request.get_json() or {}
    message = data.get("message", "").strip()
    channels = data.get("channels", ["push"])
    target_role = data.get("role", "all") # user, seller, delivery, all
    
    if not message:
        return jsonify({"error": "Message is required."}), 400

    from app.models import User
    query = User.query.filter_by(is_deleted=False)
    if target_role != "all":
        query = query.filter_by(role=target_role)
        
    users = query.all()
    from app.notifications import NotificationService
    
    for u in users:
        NotificationService.notify(u.id, "broadcast_message", message, channels=channels)
        
    db.session.commit()
    
    return jsonify({
        "message": f"Broadcast sent to {len(users)} users via {', '.join(channels)}.",
        "count": len(users)
    }), 200

# ------------------------------------------------------------------
#  Suspend / Unsuspend User
# ------------------------------------------------------------------
@admin_bp.route("/users/<int:user_id>/suspend", methods=["PATCH"])
@role_required("admin")
def toggle_suspend_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json() or {}
    suspend = data.get("suspend", True)

    user.is_suspended = suspend
    
    # Audit Logging
    from app.models import AdminAuditLog
    action = "suspend_user" if suspend else "unsuspend_user"
    audit = AdminAuditLog(
        admin_id=current_user.id,
        action=action,
        target_id=user.id,
        description=f"Admin '{current_user.name}' {action} '{user.name}' (UID: {user.uid})"
    )
    db.session.add(audit)
    db.session.commit()

    status_str = "suspended" if suspend else "unsuspended"
    return jsonify({"message": f"User '{user.name}' has been {status_str}."}), 200


@admin_bp.route("/delivery-partners/<int:partner_id>/complaints", methods=["GET"])
@role_required("admin")
def get_partner_complaints(partner_id):
    partner = db.session.get(User, partner_id)
    if not partner or partner.role != "delivery":
        return jsonify({"error": "Delivery partner not found."}), 404

    complaints = Complaint.query.join(Order).filter(
        Order.delivery_partner_id == partner_id
    ).order_by(Complaint.created_at.desc()).all()

    result = []
    for c in complaints:
        data = c.to_dict()
        data["order_id"] = c.order_id
        result.append(data)

    return jsonify({
        "delivery_partner": partner.to_dict(),
        "complaints": result
    }), 200

# ------------------------------------------------------------------
#  Admin Audit Logs
# ------------------------------------------------------------------
from app.models import AdminAuditLog
@admin_bp.route("/audit-logs", methods=["GET"])
@role_required("admin")
def get_audit_logs():
    logs = AdminAuditLog.query.order_by(AdminAuditLog.created_at.desc()).limit(100).all()
    return jsonify({"logs": [l.to_dict() for l in logs]}), 200


# ------------------------------------------------------------------
#  Stuck Orders & Absconding (Tiered Security Spec)
# ------------------------------------------------------------------
from app.notifications import NotificationService

@admin_bp.route("/orders", methods=["GET"])
@role_required("admin")
def list_orders():
    query = Order.query
    page = int(request.args.get('page', 1))
    limit = min(100, int(request.args.get('limit', 50)))

    status_filter = request.args.get("status", "all")
    if status_filter == "active":
        query = query.filter(Order.status.in_(["pending", "accepted", "preparing", "ready_for_pickup", "picked_up", "pending_redelivery"]))
    elif status_filter == "pending":
        query = query.filter(Order.status == "pending")
    elif status_filter == "confirmed":
        query = query.filter(Order.status.in_(["confirmed", "awaiting_buyer_decision"]))
    elif status_filter == "on_delivery":
        query = query.filter(Order.status.in_(["picked_up", "pending_redelivery"]))
    elif status_filter == "ready":
        query = query.filter(Order.status == "ready")
    elif status_filter == "completed":
        query = query.filter(Order.status == "delivered")
    elif status_filter == "cancelled":
        query = query.filter(Order.status == "cancelled")
    elif status_filter == "reported":
        from sqlalchemy import exists
        query = query.filter(exists().where(Complaint.order_id == Order.id))

    date_filter = request.args.get("date_filter", "today")
    from datetime import datetime, timedelta, date

    if date_filter == "today":
        today_start = datetime.combine(date.today(), datetime.min.time())
        query = query.filter(Order.created_at >= today_start)
    elif date_filter == "yesterday":
        yesterday = date.today() - timedelta(days=1)
        yesterday_start = datetime.combine(yesterday, datetime.min.time())
        today_start = datetime.combine(date.today(), datetime.min.time())
        query = query.filter(Order.created_at >= yesterday_start, Order.created_at < today_start)
    elif date_filter == "custom":
        date_custom = request.args.get("date_custom")
        if date_custom:
            try:
                custom_date = datetime.strptime(date_custom, "%Y-%m-%d").date()
                custom_start = datetime.combine(custom_date, datetime.min.time())
                custom_end = custom_start + timedelta(days=1)
                query = query.filter(Order.created_at >= custom_start, Order.created_at < custom_end)
            except ValueError:
                pass # If invalid date format, ignore

    search_field = request.args.get("search_field", "uid")
    search_query = request.args.get("search_query", "").strip()

    if search_query:
        if search_field == "uid":
            query = query.filter(Order.uid.ilike(f"%{search_query}%"))
        elif search_field == "id" and search_query.isdigit():
            query = query.filter(Order.id == int(search_query))
        elif search_field == "user_id" and search_query.isdigit():
            query = query.filter(Order.user_id == int(search_query))
        elif search_field == "shop_id" and search_query.isdigit():
            query = query.filter(Order.shop_id == int(search_query))
        elif search_field == "delivery_boy_id" and search_query.isdigit():
            query = query.filter(Order.delivery_partner_id == int(search_query))

    # To avoid hanging, we limit to 100 for now. But since we have filtering, admin can narrow down.
    from sqlalchemy.orm import joinedload
    query = query.options(
        joinedload(Order.shop),
        joinedload(Order.customer),
        joinedload(Order.delivery_partner)
    )
    paginated = query.order_by(Order.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)
    orders = paginated.items
    
    result = []
    for o in orders:
        shop = o.shop
        user = o.customer
        dp = o.delivery_partner
        data = o.to_dict()
        data["shop_name"] = shop.name if shop else "Unknown"
        data["user_name"] = user.name if user else "Unknown"
        data["user_nickname"] = user.nickname if user else None
        data["delivery_partner_name"] = dp.name if dp else "None"
        result.append(data)
    return jsonify({"orders": result, "page": paginated.page, "pages": paginated.pages, "total": paginated.total}), 200

@admin_bp.route("/orders/<int:order_id>/complaints", methods=["POST"])
@role_required("admin")
def add_admin_complaint(order_id):
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    data = request.get_json() or {}
    reason = data.get("reason", "").strip()
    who_filed = data.get("who_filed", "unknown")
    against_role = data.get("against_role", None)
    
    if not reason:
        return jsonify({"error": "Complaint reason is required"}), 400
        
    user_id = order.user_id
    if who_filed == "delivery":
        if not order.delivery_partner_id:
            return jsonify({"error": "No delivery partner assigned to this order"}), 400
        user_id = order.delivery_partner_id
    elif who_filed == "seller":
        # Usually seller ID is the user ID of the shop owner, but here we can just use the shop owner
        shop = db.session.get(Shop, order.shop_id)
        if shop:
            user_id = shop.owner_id
            
    complaint = Complaint(
        order_id=order.id,
        user_id=user_id,
        complaint_type="admin_filed",
        
        against_role=against_role,
        status="pending"
    )
    db.session.add(complaint)
    
    # Audit log
    audit = AdminAuditLog(
        admin_id=current_user.id,
        action="add_complaint",
        target_id=order.id,
        description=f"Admin '{current_user.name}' filed complaint for Order #{order.id} on behalf of {who_filed}"
    )
    db.session.add(audit)
    
    db.session.commit()
    
    return jsonify({"message": "Complaint registered successfully", "complaint": complaint.to_dict()}), 201

@admin_bp.route("/complaints/<int:complaint_id>/resolve", methods=["PATCH"])
@role_required("admin")
def resolve_complaint(complaint_id):
    complaint = db.session.get(Complaint, complaint_id)
    if not complaint:
        return jsonify({"error": "Complaint not found"}), 404
        
    complaint.status = "resolved"
    db.session.commit()
    return jsonify({"message": "Complaint resolved."}), 200

@admin_bp.route("/complaints", methods=["GET"])
@role_required("admin")
def list_all_complaints():
    page = int(request.args.get('page', 1))
    limit = min(100, int(request.args.get('limit', 50)))
    against_role = request.args.get("role")
    target_id = request.args.get("target_id")
    
    query = Complaint.query
    if against_role:
        query = query.filter(Complaint.against_role == against_role)
    if target_id:
        target_id = int(target_id)
        if against_role == 'seller':
            # Need to get complaints where order.shop.owner_id == target_id
            query = query.join(Order).join(Shop, Order.shop_id == Shop.id).filter(Shop.owner_id == target_id)
        elif against_role == 'delivery':
            query = query.join(Order).filter(Order.delivery_partner_id == target_id)
        elif against_role == 'user':
            query = query.join(Order).filter(Order.user_id == target_id)
    
    paginated = query.order_by(Complaint.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)
    complaints = paginated.items
    return jsonify({"complaints": [c.to_dict() for c in complaints], "page": paginated.page, "pages": paginated.pages}), 200

@admin_bp.route("/transactions", methods=["GET"])
@role_required("admin")
def list_transactions():
    page = int(request.args.get('page', 1))
    limit = min(100, int(request.args.get('limit', 50)))
    paginated = WalletTransaction.query.order_by(WalletTransaction.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)
    txns = paginated.items
    return jsonify({"transactions": [t.to_dict() for t in txns], "page": paginated.page, "pages": paginated.pages}), 200

@admin_bp.route("/orders/stuck", methods=["GET"])
@role_required("admin")
def get_stuck_orders():
    # Find orders that are picked_up or pending_redelivery
    from sqlalchemy.orm import joinedload
    orders = Order.query.options(
        joinedload(Order.shop),
        joinedload(Order.customer),
        joinedload(Order.delivery_partner),
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(
        Order.status.in_(["picked_up", "pending_redelivery"])
    ).all()
    
    result = []
    for o in orders:
        shop = o.shop
        dp = o.delivery_partner
        data = o.to_dict()
        data["shop_name"] = shop.name if shop else "Unknown"
        data["delivery_partner_name"] = dp.name if dp else "Unknown"
        result.append(data)
        
    return jsonify({"orders": result, "total": len(result)}), 200

@admin_bp.route("/orders/<int:order_id>/mark-absconded", methods=["POST"])
@role_required("admin")
def mark_absconded(order_id):
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order:
        return jsonify({"error": "Order not found."}), 404

    if order.status not in ["picked_up", "pending_redelivery"]:
        return jsonify({"error": "Order must be in picked_up or pending_redelivery state."}), 400

    partner = db.session.get(User, order.delivery_partner_id)
    shop = db.session.get(Shop, order.shop_id)

    from app.models import ShopTrustedPartner
    
    # Determine penalty based on user rules:
    # Normal: 120%, Shop Trusted: 95%, Platform Trusted: 75%
    if partner.is_platform_verified:
        partner_penalty = order.items_total * 0.75
    else:
        is_shop_trusted = ShopTrustedPartner.query.filter_by(
            shop_id=shop.id,
            delivery_partner_id=partner.id
        ).first() is not None
        if is_shop_trusted:
            partner_penalty = order.items_total * 0.95
        else:
            partner_penalty = order.items_total * 1.20

    # Shop always gets 100% compensation for absconded orders in wallet_settlement
    shop_compensation = order.items_total

    if shop.payment_mode == "wallet_settlement":
        partner.wallet_balance -= partner_penalty
        shop.wallet_balance += shop_compensation
        
        db.session.add(WalletTransaction(
            order_id=order.id,
            from_type="delivery_partner",
            from_id=partner.id,
            to_type="platform",
            to_id=1,
            amount=partner_penalty,
            transaction_type="absconded_penalty"
        ))
        
        db.session.add(WalletTransaction(
            order_id=order.id,
            from_type="platform",
            from_id=1,
            to_type="shop",
            to_id=shop.id,
            amount=shop_compensation,
            transaction_type="absconded_compensation"
        ))

    order.status = "cancelled"
    order.cancellation_reason = "partner_absconded"
    
    if order.payment_method == "online":
        user = order.customer
        user.wallet_balance += order.total_amount
        db.session.add(WalletTransaction(
            order_id=order.id,
            from_type="platform",
            from_id=1,
            to_type="user",
            to_id=user.id,
            amount=order.total_amount,
            transaction_type="refund_cancellation"
        ))
    
    partner.is_suspended = True

    db.session.commit()

    if shop.payment_mode == "wallet_settlement":
        NotificationService.notify(
            shop.owner_id, "partner_absconded",
            f"Delivery boy absconded with order #{order.id}! You received {shop_compensation} tk compensation."
        )
    else:
        NotificationService.notify(
            shop.owner_id, "partner_absconded",
            f"Delivery boy absconded with order #{order.id}! (Cash purchase mode: you already got paid at pickup)"
        )
        
    NotificationService.notify(
        partner.id, "account_suspended",
        f"Your account has been suspended for absconding with Order #{order.id}."
    )

    return jsonify({"message": "Order marked as absconded and resolved.", "penalty": partner_penalty}), 200



# ------------------------------------------------------------------
#  Admin Financial Actions
# ------------------------------------------------------------------
@admin_bp.route("/users/<int:user_id>/settle-cod", methods=["POST"])
@role_required("admin")
def settle_cod(user_id):
    """Clears a delivery boy's negative wallet balance (simulating they paid the admin cash)."""
    from app.models import User, WalletTransaction, Order, Shop
    user = db.session.query(User).with_for_update().get(user_id)
    if not user or user.role != "delivery":
        return jsonify({"error": "Invalid delivery boy."}), 404
        
    if user.wallet_balance >= 0:
        return jsonify({"error": "Wallet balance is not negative."}), 400
        
    amount = abs(user.wallet_balance)
    user.wallet_balance = 0.0
    
    txn = WalletTransaction(
        from_type="delivery_partner",
        from_id=user.id,
        to_type="admin",
        to_id=current_user.id,
        amount=amount,
        
    )
    db.session.add(txn)
    db.session.commit()
    return jsonify({"message": f"Successfully settled {amount} tk from Delivery Boy."}), 200

@admin_bp.route("/orders/<int:order_id>/refund-buyer", methods=["POST"])
@role_required("admin")
def admin_refund_buyer(order_id):
    from app.models import User, WalletTransaction, Order, Shop
    data = request.get_json() or {}
    amount = safe_float(data.get("amount", 0))
    if amount <= 0:
        return jsonify({"error": "Invalid amount."}), 400
        
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order: return jsonify({"error": "Order not found."}), 404
    
    # Prevent double refund (now race-condition safe because of with_for_update)
    existing_refund = WalletTransaction.query.filter_by(
        order_id=order.id, 
        to_id=order.user_id, 
        to_type="user",
        transaction_type="admin_manual_refund"
    ).first()
    
    if existing_refund:
        return jsonify({"error": "A manual refund has already been issued for this order with this reason."}), 400

    buyer = db.session.query(User).with_for_update().get(order.user_id)
    buyer.wallet_balance += amount
    
    txn = WalletTransaction(
        from_type="admin",
        from_id=current_user.id,
        to_type="user",
        to_id=buyer.id,
        amount=amount,
        order_id=order.id,
        transaction_type="admin_manual_refund"
    )
    db.session.add(txn)
    db.session.commit()
    return jsonify({"message": f"Refunded {amount} tk to buyer."}), 200

@admin_bp.route("/orders/<int:order_id>/compensate-seller", methods=["POST"])
@role_required("admin")
def admin_compensate_seller(order_id):
    from app.models import User, WalletTransaction, Order, Shop
    data = request.get_json() or {}
    amount = safe_float(data.get("amount", 0))
    if amount <= 0:
        return jsonify({"error": "Invalid amount."}), 400
        
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order: return jsonify({"error": "Order not found."}), 404
    
    # Prevent double compensation (race-condition safe)
    existing_comp = WalletTransaction.query.filter_by(
        order_id=order.id, 
        to_id=order.shop_id, 
        to_type="shop",
        transaction_type="compensation"
    ).first()
    
    if existing_comp:
        return jsonify({"error": "A manual compensation has already been issued for this order with this reason."}), 400
    
    shop = db.session.query(Shop).with_for_update().get(order.shop_id)
    shop.wallet_balance += amount
    
    txn = WalletTransaction(
        from_type="admin",
        from_id=current_user.id,
        to_type="shop",
        to_id=shop.id,
        amount=amount,
        order_id=order.id,
        transaction_type="compensation"
    )
    db.session.add(txn)
    db.session.commit()
    return jsonify({"message": f"Compensated {amount} tk to seller."}), 200




# ------------------------------------------------------------------
#  Admin Assign Delivery Partner to Order (manual override)
# ------------------------------------------------------------------
@admin_bp.route("/orders/<int:order_id>/assign-delivery", methods=["POST"])
@role_required("admin")
def admin_assign_delivery(order_id):
    """Admin can manually assign a delivery partner to any order."""
    from app.models import Notification
    data = request.get_json() or {}
    partner_id = data.get("delivery_partner_id")
    if not partner_id:
        return jsonify({"error": "delivery_partner_id is required."}), 400

    order = db.session.query(Order).with_for_update().get(order_id)
    if not order:
        return jsonify({"error": "Order not found."}), 404

    partner = db.session.get(User, partner_id)
    if not partner or partner.role != "delivery":
        return jsonify({"error": "Invalid delivery partner."}), 400

    order.delivery_partner_id = partner.id
    
    audit = AdminAuditLog(
        admin_id=current_user.id,
        action="assign_delivery",
        target_id=order.id,
        description=f"Admin '{current_user.name}' manually assigned partner '{partner.name}' to Order #{order.id}"
    )
    db.session.add(audit)
    db.session.commit()

    n = Notification(user_id=partner.id, title="New Order Assigned", 
                     message=f"Admin has assigned you to Order #{order.id}. Please check your delivery queue.")
    db.session.add(n)
    db.session.commit()

    return jsonify({"message": f"Order #{order.id} assigned to {partner.name}."}), 200


# ------------------------------------------------------------------
#  Admin Force Cancel Any Order
# ------------------------------------------------------------------
@admin_bp.route("/orders/<int:order_id>/force-cancel", methods=["POST"])
@role_required("admin")
def admin_force_cancel_order(order_id):
    """Admin can forcefully cancel any active order."""
    from app.models import Notification
    data = request.get_json() or {}
    reason = data.get("reason", "Admin cancelled the order.").strip()

    order = db.session.query(Order).with_for_update().get(order_id)
    if not order:
        return jsonify({"error": "Order not found."}), 404

    if order.status in ["delivered", "cancelled"]:
        return jsonify({"error": f"Order is already in terminal state: {order.status}"}), 400

    # Refund buyer if paid online
    if order.payment_method == "online":
        buyer = db.session.query(User).with_for_update().get(order.user_id)
        if buyer:
            buyer.wallet_balance += order.total_amount
            db.session.add(WalletTransaction(
                order_id=order.id, from_type="platform", from_id=current_user.id,
                to_type="user", to_id=buyer.id,
                amount=order.total_amount
            ))
            n = Notification(user_id=buyer.id, title="Order Cancelled & Refunded",
                             message=f"Your Order #{order.id} was cancelled by admin. Ã Â§Â³{order.total_amount} has been refunded to your wallet.")
            db.session.add(n)

    order.status = "cancelled"
    order.cancellation_reason = f"admin_force: {reason}"

    audit = AdminAuditLog(
        admin_id=current_user.id,
        action="force_cancel_order",
        target_id=order.id,
        description=f"Admin '{current_user.name}' force-cancelled Order #{order.id}. Reason: {reason}"
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({"message": f"Order #{order.id} has been cancelled."}), 200


# ======================================================================
#  Global Items Management (Platform Catalog)
# ======================================================================
from app.models import GlobalItem, ItemRequest
import random

def generate_uid(is_local=False):
    while True:
        if is_local:
            uid = "99" + str(random.randint(100000, 999999))
        else:
            uid = str(random.randint(10000000, 98999999)) # Avoid 99
        if not GlobalItem.query.filter_by(uid=uid).first():
            return uid

@admin_bp.route("/items", methods=["GET"])
@role_required("admin")
def list_global_items():
    page = int(request.args.get('page', 1))
    limit = min(100, int(request.args.get('limit', 50)))
    items = GlobalItem.query.filter_by(is_deleted=False).order_by(GlobalItem.category, GlobalItem.company).all()
    return jsonify({"items": [i.to_dict() for i in items], "total": len(items)}), 200

@admin_bp.route("/items", methods=["POST"])
@role_required("admin")
def add_global_item():
    data = request.get_json()
    company = data.get("company", "").strip()
    if company.lower() in ["local", "loose", "local/loose", "local / loose"]:
        company = "Local/Loose"
    category = data.get("category", "").strip()
    spec = data.get("specification", "").strip()
    q_type = data.get("quantity_type", "").strip()

    if not all([company, category, spec, q_type]):
        return jsonify({"error": "All fields are required"}), 400

    existing = GlobalItem.query.filter_by(company=company, category=category, specification=spec).first()
    if existing:
        return jsonify({"error": "This item already exists in the catalog."}), 400

    is_local = (company.lower() in ["local", "loose", "local/loose"])
    new_uid = generate_uid(is_local)

    item = GlobalItem(
        uid=new_uid,
        company=company,
        category=category,
        specification=spec,
        quantity_type=q_type
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({"message": "Item added successfully", "item": item.to_dict()}), 201

@admin_bp.route("/item-requests", methods=["GET"])
@role_required("admin")
def list_item_requests():
    requests = ItemRequest.query.filter_by(status="pending").all()
    return jsonify({"requests": [r.to_dict() for r in requests]}), 200

@admin_bp.route("/item-requests/<int:req_id>/<action>", methods=["POST"])
@role_required("admin")
def handle_item_request(req_id, action):
    req = db.session.get(ItemRequest, req_id)
    if not req: return jsonify({"error": "Request not found"}), 404
    
    if action == "approve":
        existing = GlobalItem.query.filter_by(company=req.requested_company, category=req.requested_category, specification=req.requested_specification).first()
        if not existing:
            is_local = (req.requested_company.lower() in ["local", "loose", "local/loose"])
            item = GlobalItem(
                uid=generate_uid(is_local),
                company=req.requested_company,
                category=req.requested_category,
                specification=req.requested_specification,
                quantity_type=req.quantity_type
            )
            db.session.add(item)
        req.status = "approved"
        db.session.commit()
        return jsonify({"message": "Request approved and item added to catalog."}), 200
    elif action == "reject":
        req.status = "rejected"
        db.session.commit()
        return jsonify({"message": "Request rejected."}), 200
    return jsonify({"error": "Invalid action"}), 400



@admin_bp.route("/items/<int:item_id>/shops", methods=["GET"])
@role_required("admin")
def get_shops_for_item(item_id):
    from app.models import Product, Shop
    products = Product.query.filter_by(global_item_id=item_id, is_deleted=False).all()
    
    result = []
    for p in products:
        shop = db.session.get(Shop, p.shop_id)
        if shop:
            result.append({
                "product_id": p.id,
                "shop_id": shop.id,
                "shop_name": shop.name,
                "price": p.price,
                "unit_value": p.unit_value,
                "unit_measure": p.unit_measure,
                "is_available": p.is_available
            })
    return jsonify({"shops": result}), 200


@admin_bp.route("/products/<int:product_id>", methods=["DELETE"])
@role_required("admin")
def admin_remove_shop_product(product_id):
    from app.models import Product
    product = db.session.get(Product, product_id)
    if not product or product.is_deleted:
        return jsonify({"error": "Product not found"}), 404
        
    product.is_deleted = True
    product.is_available = False
    db.session.commit()
    return jsonify({"message": "Product removed from the shop."}), 200


# ------------------------------------------------------------------
#  Withdrawals / Payouts
# ------------------------------------------------------------------
@admin_bp.route("/withdrawals", methods=["GET"])
@role_required("admin")
def get_withdrawals():
    status = request.args.get("status", "pending")
    from app.models import WithdrawalRequest
    query = WithdrawalRequest.query
    if status != "all":
        query = query.filter_by(status=status)
    reqs = query.order_by(WithdrawalRequest.created_at.desc()).all()
    return jsonify({"withdrawals": [r.to_dict() for r in reqs]}), 200

@admin_bp.route("/withdrawals/<int:req_id>", methods=["PATCH"])
@role_required("admin")
def update_withdrawal(req_id):
    from app.models import WithdrawalRequest, WalletTransaction
    data = request.get_json() or {}
    new_status = data.get("status")
    
    if new_status not in ("paid", "rejected"):
        return jsonify({"error": "Invalid status"}), 400
        
    req = db.session.query(WithdrawalRequest).with_for_update().get(req_id)
    if not req: return jsonify({"error": "Request not found"}), 404
    if req.status != "pending":
        return jsonify({"error": f"Request already {req.status}"}), 400
        
    req.status = new_status
    req.resolved_at = datetime.utcnow()
    
    if new_status == "rejected":
        # Refund the amount to the user
        locked_user = db.session.query(User).with_for_update().get(req.user_id)
        locked_user.wallet_balance += req.amount
        # Log refund
        txn = WalletTransaction(
            uid="REF-" + req.user.uid[-6:],
            from_type="platform", from_id=1,
            to_type="user", to_id=req.user.id,
            amount=req.amount,
            transaction_type="withdrawal_refund",
            description=f"Withdrawal #{req.id} rejected. Refunded to wallet.",
            balance_after=locked_user.wallet_balance
        )
        db.session.add(txn)
    elif new_status == "paid":
        txn = WalletTransaction(
            uid="PAY-" + req.user.uid[-6:],
            from_type="platform", from_id=1,
            to_type="user", to_id=req.user.id,
            amount=req.amount,
            transaction_type="withdrawal_payout",
            description=f"Withdrawal #{req.id} paid ({req.payment_details})",
            balance_after=req.user.wallet_balance
        )
        db.session.add(txn)
    
    db.session.commit()
    return jsonify({"message": f"Withdrawal marked as {new_status}"}), 200


# ------------------------------------------------------------------
#  Recycle Bin (Trash)
# ------------------------------------------------------------------
@admin_bp.route("/recycle-bin/users", methods=["GET"])
@role_required("admin")
def get_deleted_users():
    users = User.query.filter_by(is_deleted=True).order_by(User.deleted_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200



@admin_bp.route("/recycle-bin/products", methods=["GET"])
@role_required("admin")
def get_deleted_products():
    from app.models import Product, Shop
    # Fetch soft deleted products
    products = Product.query.filter_by(is_deleted=True).all()
    result = []
    for p in products:
        d = p.to_dict()
        shop = db.session.get(Shop, p.shop_id)
        d['shop_name'] = shop.name if shop else "Unknown"
        result.append(d)
    return jsonify({"products": result}), 200

@admin_bp.route("/recycle-bin/products/<int:product_id>/restore", methods=["POST"])
@role_required("admin")
def restore_product(product_id):
    from app.models import Product
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    product.is_deleted = False
    db.session.commit()
    return jsonify({"message": "Product restored successfully"}), 200


@admin_bp.route("/delivery-settings", methods=["GET", "POST"])
@role_required("admin")
def manage_delivery_settings():
    from app.models import SystemSetting
    if request.method == "GET":
        settings = SystemSetting.query.all()
        return jsonify({s.key: s.value for s in settings}), 200
        
    data = request.get_json() or {}
    for key, value in data.items():
        if key.startswith("delivery_"):
            setting = SystemSetting.query.filter_by(key=key).first()
            if not setting:
                setting = SystemSetting(key=key)
                db.session.add(setting)
            setting.value = str(value)
    db.session.commit()
    return jsonify({"message": "Delivery settings updated successfully!"}), 200

@admin_bp.route("/offers", methods=["GET"])
@role_required("admin")
def list_all_offers():
    from app.models import Offer
    offers = Offer.query.order_by(Offer.created_at.desc()).all() if hasattr(Offer, "created_at") else Offer.query.all()
    return jsonify({"offers": [o.to_dict() for o in offers]}), 200


# ------------------------------------------------------------------
#  Analytics Dashboard  (Swiggy/Zomato style)
# ------------------------------------------------------------------

@admin_bp.route("/analytics", methods=["GET"])
@role_required("admin")
def get_analytics():
    from app.models import OrderItem, Product, Order, Shop, User
    from sqlalchemy import func, extract
    from datetime import datetime, timedelta

    start_str = request.args.get('start_date')
    end_str = request.args.get('end_date')

    now = datetime.utcnow()
    # Default to last 7 days (inclusive of today)
    if start_str:
        try: start_date = datetime.strptime(start_str, "%Y-%m-%d")
        except: start_date = now - timedelta(days=6)
    else:
        start_date = now - timedelta(days=6)
        
    if end_str:
        try: end_date = datetime.strptime(end_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except: end_date = now
    else:
        end_date = now
        
    # Ensure start_date is midnight
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    # Helper filters
    date_filter = Order.created_at.between(start_date, end_date)

    # 1. Summary
    revenue_q = db.session.query(func.sum(Order.total_amount)).filter(Order.status == "delivered", date_filter).scalar()
    total_revenue = round(revenue_q or 0, 2)
    
    total_orders = Order.query.filter(date_filter).count()
    
    commission = 0 # Admin requested to keep it 0 for now to avoid confusion
    
    summary = {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "platform_commission": commission,
        "active_shops": Shop.query.filter_by(is_active=True, is_approved=True).count(),
        "active_delivery_boys": User.query.filter_by(role="delivery", is_active=True).count(),
        "active_buyers": User.query.filter_by(role="user").count(),
    }

    # 2. Revenue By Day (Optimized - 1 Query)
    revenue_by_day = []
    delta = (end_date - start_date).days
    if delta > 31: delta = 31
    
    # Pre-fill dictionary
    rev_dict = {}
    for i in range(delta + 1):
        d_start = start_date + timedelta(days=i)
        rev_dict[d_start.strftime("%b %d")] = 0.0
        
    delivered_in_range = db.session.query(Order.created_at, Order.total_amount).filter(
        Order.status == "delivered", date_filter
    ).all()
    
    for created_at, amt in delivered_in_range:
        date_str = created_at.strftime("%b %d")
        if date_str in rev_dict:
            rev_dict[date_str] += amt
            
    for i in range(delta + 1):
        d_start = start_date + timedelta(days=i)
        date_str = d_start.strftime("%b %d")
        revenue_by_day.append({
            "date": date_str,
            "revenue": round(rev_dict[date_str], 2)
        })

    # 3. Orders by Status
    status_counts = db.session.query(Order.status, func.count(Order.id)).filter(date_filter).group_by(Order.status).all()
    orders_by_status = [{"status": s, "count": c} for s, c in status_counts]

    # 4. Top Shops
    top_shops_q = db.session.query(Shop.name, func.count(Order.id).label('cnt')).join(Order, Order.shop_id == Shop.id).filter(date_filter).group_by(Shop.name).order_by(func.count(Order.id).desc()).limit(5).all()
    top_shops = [{"shop_name": s[0], "orders": s[1]} for s in top_shops_q]

    # 5. Top Products
    top_prods_q = db.session.query(Product.name, Product.shop_id, func.sum(OrderItem.quantity).label('qty')).select_from(OrderItem).join(Product, OrderItem.product_id == Product.id).join(Order, OrderItem.order_id == Order.id).filter(date_filter).group_by(Product.name, Product.shop_id).order_by(func.sum(OrderItem.quantity).desc()).limit(5).all()
    top_products = []
    for p in top_prods_q:
        s_obj = db.session.get(Shop, p.shop_id)
        top_products.append({"name": p[0], "shop_name": s_obj.name if s_obj else "Unknown", "sold": p[2]})

    # 6. Delivery Stats
    delivered = Order.query.filter(Order.status == "delivered", date_filter).count()
    cancelled = Order.query.filter(Order.status == "cancelled", date_filter).count()
    cod_collected = db.session.query(func.sum(Order.total_amount)).filter(Order.status == "delivered", Order.payment_method == "cod", date_filter).scalar() or 0
    
    delivery_stats = {
        "success_rate": round((delivered / total_orders * 100) if total_orders else 0, 1),
        "total_delivered": delivered,
        "total_cancelled": cancelled,
        "total_cod_collected": round(cod_collected, 2),
    }

    # 7. Heatmap
    # Buyers: get locations of buyers who placed orders in this date range
    buyer_user_ids = [o.user_id for o in Order.query.filter(date_filter).all()]
    buyers_loc = [{"lat": u.current_latitude, "lng": u.current_longitude} for u in User.query.filter(User.id.in_(buyer_user_ids), User.current_latitude != None).all()]
    
    # Active Delivery Boys
    active_delivery = [{"lat": u.current_latitude, "lng": u.current_longitude, "name": u.name} for u in User.query.filter_by(role="delivery", is_active=True).filter(User.current_latitude != None).all()]
    
    # Inactive Delivery Boys
    inactive_delivery = [{"lat": u.current_latitude, "lng": u.current_longitude, "name": u.name, "last_active": u.updated_at.isoformat() if u.updated_at else None} for u in User.query.filter_by(role="delivery", is_active=False).filter(User.current_latitude != None).all()]
    
    shops_loc = [{"lat": s.lat, "lng": s.lng, "name": s.name} for s in Shop.query.filter_by(is_active=True).all() if s.lat and s.lng]
    
    heatmap = {
        "buyers": buyers_loc, 
        "active_delivery": active_delivery, 
        "inactive_delivery": inactive_delivery, 
        "shops": shops_loc,
        "total_range_orders": len(buyer_user_ids)
    }

    # 8. Detailed Analytics (Optimized - Group By Queries)
    shop_analytics = []
    # Fetch all shop stats in one query
    shop_stats_q = db.session.query(
        Order.shop_id, 
        func.count(Order.id).label('total'),
        func.sum(db.case((Order.status == 'delivered', 1), else_=0)).label('delivered'),
        func.sum(db.case((db.and_(Order.status == 'cancelled', Order.cancellation_reason == 'seller_no_response'), 1), else_=0)).label('ignored')
    ).filter(date_filter).group_by(Order.shop_id).all()
    
    shop_stats_map = {row.shop_id: {"total": row.total, "delivered": row.delivered or 0, "ignored": row.ignored or 0} for row in shop_stats_q}
    
    for s in Shop.query.all():
        stats = shop_stats_map.get(s.id, {"total": 0, "delivered": 0, "ignored": 0})
        s_total = stats["total"]
        s_deliv = stats["delivered"]
        s_ignor = stats["ignored"]
        shop_analytics.append({
            "id": s.id, "name": s.name, "is_active": s.is_active,
            "total_orders": s_total, "delivered": s_deliv,
            "success_rate": round((s_deliv / s_total * 100) if s_total else 0, 1),
            "response_rate": round(((s_total - s_ignor) / s_total * 100) if s_total else 0, 1)
        })

    delivery_analytics = []
    deliv_stats_q = db.session.query(
        Order.delivery_partner_id,
        func.count(Order.id).label('delivered')
    ).filter(Order.status == 'delivered', date_filter).group_by(Order.delivery_partner_id).all()
    deliv_stats_map = {row.delivery_partner_id: row.delivered for row in deliv_stats_q}
    
    from app.models import ShopTrustedPartner
    trust_stats_q = db.session.query(
        ShopTrustedPartner.delivery_partner_id,
        func.count(ShopTrustedPartner.id).label('cnt')
    ).group_by(ShopTrustedPartner.delivery_partner_id).all()
    trust_stats_map = {row.delivery_partner_id: row.cnt for row in trust_stats_q}
    
    for d in User.query.filter_by(role="delivery").all():
        d_deliv = deliv_stats_map.get(d.id, 0)
        t_cnt = trust_stats_map.get(d.id, 0)
        delivery_analytics.append({
            "id": d.id, "name": d.name, "is_active": d.is_active, "total_delivered": d_deliv,
            "trusted_by_shops": t_cnt, "lat": d.current_latitude, "lng": d.current_longitude
        })

    # 9. Buyer Analytics
    hour_counts = db.session.query(extract('hour', Order.created_at).label('h'), func.count(Order.id)).filter(date_filter).group_by('h').all()
    peak_hours = {int(h): count for h, count in hour_counts}
    peak_hours_list = [{"hour": f"{h:02d}:00", "count": peak_hours.get(h, 0)} for h in range(24)]
    
    top_buyers_q = db.session.query(
        User.id, User.name,
        func.count(Order.id).label('total_orders'),
        func.sum(Order.total_amount).label('total_spent'),
        func.sum(Order.delivery_charge).label('total_delivery')
    ).join(Order, Order.user_id == User.id).filter(date_filter).group_by(User.id, User.name).order_by(func.count(Order.id).desc()).limit(10).all()
    
    top_buyers = []
    for tb in top_buyers_q:
        fav_shop_q = db.session.query(Shop.name, func.count(Order.id).label('c')).join(Order, Order.shop_id == Shop.id).filter(Order.user_id == tb.id, date_filter).group_by(Shop.name).order_by(func.count(Order.id).desc()).first()
        top_buyers.append({
            "name": tb.name, "total_orders": tb.total_orders,
            "total_spent": safe_float(tb.total_spent or 0), "total_delivery": safe_float(tb.total_delivery or 0),
            "favorite_shop": fav_shop_q[0] if fav_shop_q else "Unknown"
        })

    return jsonify({
        "summary": summary,
        "revenue_by_day": revenue_by_day,
        "orders_by_status": orders_by_status,
        "top_shops": top_shops,
        "top_products": top_products,
        "delivery_stats": delivery_stats,
        "heatmap": heatmap,
        "shop_analytics": shop_analytics,
        "delivery_analytics": delivery_analytics,
        "buyer_analytics": {"peak_hours": peak_hours_list, "top_buyers": top_buyers},
        "range": {"start": start_date.strftime("%Y-%m-%d"), "end": end_date.strftime("%Y-%m-%d")}
    }), 200


import os
import uuid
from werkzeug.utils import secure_filename
from flask import request

@admin_bp.route("/catalog/<int:item_id>/image", methods=["POST"])
@role_required("admin")
def upload_catalog_image(item_id):
    item = GlobalItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
        
    if 'image' not in request.files:
        return jsonify({"error": "No image part"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
        if ext not in ['jpg', 'jpeg', 'png', 'webp']:
            return jsonify({"error": "Invalid file type. Only JPG, PNG, WEBP allowed."}), 400
            
        filename = f"{item.uid}_{uuid.uuid4().hex[:6]}.{ext}"
        upload_folder = os.path.join("static", "uploads", "products")
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # We need to construct the URL for the frontend
        # For local, it will just be /static/uploads/products/filename
        item.image_url = f"/static/uploads/products/{filename}"
        db.session.commit()
        
        return jsonify({"message": "Image uploaded successfully", "image_url": item.image_url}), 200



@admin_bp.route("/platform-settings", methods=["GET", "PATCH"])
@role_required("admin")
def platform_settings():
    from app.models import SystemSetting
    keys = ["cod_enabled", "online_payment_enabled", "platform_paused", "pause_message", "self_delivery_enabled"]
    defaults = {"cod_enabled": "true", "online_payment_enabled": "false", "platform_paused": "false", "pause_message": "", "self_delivery_enabled": "true"}

    if request.method == "GET":
        result = {}
        for k in keys:
            setting = SystemSetting.query.filter_by(key=k).first()
            val = setting.value if setting else defaults[k]
            result[k] = val if k == "pause_message" else (val == "true")
        return jsonify(result), 200

    data = request.get_json() or {}
    for k in keys:
        if k in data:
            setting = SystemSetting.query.filter_by(key=k).first()
            if not setting:
                setting = SystemSetting(key=k)
                db.session.add(setting)
            setting.value = str(data[k]).lower() if k != "pause_message" else str(data[k])
    db.session.commit()
    return jsonify({"message": "Settings updated"}), 200




#HELO AI


# ------------------------------------------------------------------
#  Image Upload & Compression (Supabase Storage)
# ------------------------------------------------------------------
@admin_bp.route("/upload-image", methods=["POST"])
@role_required("admin")
def upload_image():
    import os
    import uuid
    import io
    from PIL import Image
    from supabase import create_client, Client
    from flask import current_app
    
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        return jsonify({"error": "Supabase storage is not configured on the server."}), 500

    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided."}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty file."}), 400

    # Backend security check: Reject files larger than 2MB
    file.seek(0, os.SEEK_END)
    file_length = file.tell()
    file.seek(0)
    if file_length > 2 * 1024 * 1024:
        return jsonify({"error": "File size exceeds 2MB limit. Please compress it on the frontend first."}), 413

    try:
        # 1. Read and Compress Image
        img = Image.open(file)
        
        # Convert to RGB (fixes issues with PNGs with alpha channels when saving to WebP/JPEG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # Resize if too large (Max 800x800 for optimal loading)
        max_size = (800, 800)
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Save to BytesIO in WebP format
        output = io.BytesIO()
        img.save(output, format="WEBP", quality=80)
        output.seek(0)
        
        # 2. Generate unique filename
        unique_name = f"admin_uploads/{uuid.uuid4().hex}.webp"
        bucket_name = "buzzer-images"
        
        # 3. Upload to Supabase Storage
        file_bytes = output.read()
        res = supabase_client.storage.from_(bucket_name).upload(
            path=unique_name,
            file=file_bytes,
            file_options={"content-type": "image/webp"}
        )
        
        # 4. Get Public URL
        public_url = supabase_client.storage.from_(bucket_name).get_public_url(unique_name)
        
        return jsonify({
            "message": "Image compressed and uploaded successfully!", 
            "url": public_url
        }), 200
        
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------------
#  Edit Global Item
# ------------------------------------------------------------------
@admin_bp.route("/items/<int:item_id>", methods=["PATCH"])
@role_required("admin")
def edit_global_item(item_id):
    from app.models import GlobalItem
    item = GlobalItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
        
    data = request.get_json() or {}
    
    if "company" in data:
        company = data["company"].strip()
        if company.lower() in ["local", "loose", "local/loose", "local / loose"]:
            company = "Local/Loose"
        item.company = company
        
    if "category" in data:
        item.category = data["category"].strip()
        
    if "specification" in data:
        item.specification = data["specification"].strip()
        
    if "quantity_type" in data:
        item.quantity_type = data["quantity_type"].strip()
        
    if "image_url" in data:
        item.image_url = data["image_url"].strip()
        
    db.session.commit()
    return jsonify({"message": "Item updated successfully", "item": item.to_dict()}), 200


# ------------------------------------------------------------------
#  Delete Global Item Image (From DB and Supabase)
# ------------------------------------------------------------------
@admin_bp.route("/items/<int:item_id>/image", methods=["DELETE"])
@role_required("admin")
def delete_item_image(item_id):
    from app.models import GlobalItem
    import os
    from supabase import create_client
    
    item = GlobalItem.query.get(item_id)
    if not item or not item.image_url:
        return jsonify({"error": "Item or image not found"}), 404
        
    try:
        # 1. Attempt to delete from Supabase if it's a supabase URL
        SUPABASE_URL = os.environ.get("SUPABASE_URL")
        SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
        url = item.image_url
        
        if SUPABASE_URL and SUPABASE_KEY and "buzzer-images/" in url:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            file_path = url.split("buzzer-images/")[1]
            # Remove file from bucket
            supabase_client.storage.from_("buzzer-images").remove([file_path])
                
        # 2. Clear from DB
        item.image_url = ""
        from app.models import db
        db.session.commit()
        
        return jsonify({"message": "Image deleted successfully"}), 200
    except Exception as e:
        print(f"Delete image error: {e}")
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------------
#  Delete Global Item Completely
# ------------------------------------------------------------------
@admin_bp.route("/items/<int:item_id>", methods=["DELETE"])
@role_required("admin")
def delete_global_item(item_id):
    from app.models import GlobalItem, Product, db
    import os
    from supabase import create_client
    
    item = GlobalItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
        
    try:
        # Soft Delete instead of Hard Delete
        item.is_deleted = True
        db.session.commit()
        return jsonify({"message": "Item soft-deleted and moved to Recycle Bin"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Delete item error: {e}")
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------------
#  Recycle Bin: Global Items (Catalog)
# ------------------------------------------------------------------
@admin_bp.route("/recycle-bin/items", methods=["GET"])
@role_required("admin")
def get_recycled_items():
    from app.models import GlobalItem
    items = GlobalItem.query.filter_by(is_deleted=True).all()
    return jsonify({"items": [i.to_dict() for i in items], "page": paginated.page, "pages": paginated.pages, "total": paginated.total}), 200

@admin_bp.route("/recycle-bin/items/<int:item_id>/restore", methods=["POST"])
@role_required("admin")
def restore_recycled_item(item_id):
    from app.models import GlobalItem, db
    item = GlobalItem.query.get(item_id)
    if not item: return jsonify({"error": "Item not found"}), 404
    item.is_deleted = False
    db.session.commit()
    return jsonify({"message": "Item restored to catalog."}), 200

@admin_bp.route("/recycle-bin/items/<int:item_id>/hard-delete", methods=["DELETE"])
@role_required("admin")
def hard_delete_recycled_item(item_id):
    from app.models import GlobalItem, Product, db
    import os
    from supabase import create_client
    item = GlobalItem.query.get(item_id)
    if not item: return jsonify({"error": "Item not found"}), 404
    
    try:
        if item.image_url:
            SUPABASE_URL = os.environ.get("SUPABASE_URL")
            SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
            if SUPABASE_URL and SUPABASE_KEY and "buzzer-images/" in item.image_url:
                try:
                    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
                    file_path = item.image_url.split("buzzer-images/")[1]
                    supabase_client.storage.from_("buzzer-images").remove([file_path])
                except Exception as e:
                    print("Supabase error:", e)
                    
        Product.query.filter_by(global_item_id=item_id).update({'global_item_id': None})
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Item permanently deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------------
#  Pic Manager: Hide / Restore Image
# ------------------------------------------------------------------
@admin_bp.route("/items/<int:item_id>/hide-image", methods=["POST"])
@role_required("admin")
def hide_item_image(item_id):
    from app.models import GlobalItem, db
    item = GlobalItem.query.get(item_id)
    if not item: return jsonify({"error": "Item not found"}), 404
    item.is_image_hidden = True
    db.session.commit()
    return jsonify({"message": "Image soft-deleted (hidden from frontend)"}), 200

@admin_bp.route("/items/<int:item_id>/restore-image", methods=["POST"])
@role_required("admin")
def restore_item_image(item_id):
    from app.models import GlobalItem, db
    item = GlobalItem.query.get(item_id)
    if not item: return jsonify({"error": "Item not found"}), 404
    item.is_image_hidden = False
    db.session.commit()
    return jsonify({"message": "Image restored successfully"}), 200



