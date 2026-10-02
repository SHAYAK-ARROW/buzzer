from app.utils import safe_float
"""
Seller routes.

Prefix: /api/seller
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import current_user

from app import db
import sqlalchemy
from app.auth_helpers import role_required
from app.models import Shop, Product, Order, OrderItem, WalletTransaction, User
from app.notifications import NotificationService

seller_bp = Blueprint("seller", __name__)


@seller_bp.route("/status", methods=["PATCH"])
@role_required("seller")
def toggle_status():
    data = request.get_json() or {}
    shop = Shop.query.filter_by(owner_id=current_user.id).first()
    if not shop:
        return jsonify({"error": "Shop not found"}), 404
        
    new_status = data.get("is_active", True)
    if shop.is_active != new_status:
        shop.is_active = new_status
        from app.models import ShopActivityLog
        log = ShopActivityLog(shop_id=shop.id, status="online" if new_status else "offline")
        db.session.add(log)
        
    # Also update seller user status just in case
    user = db.session.get(User, current_user.id)
    user.is_active = shop.is_active
    db.session.commit()
    return jsonify({"message": f"Status updated.", "is_active": shop.is_active}), 200


# ------------------------------------------------------------------
#  Shop CRUD
# ------------------------------------------------------------------
@seller_bp.route("/shop", methods=["POST"])
@role_required("seller")
def create_shop():
    """Body: {name, address}"""
    if current_user.shop:
        return jsonify({"error": "You already have a shop."}), 400

    data = request.get_json() or {}
    shop = Shop(
        name=data.get("name", "My Shop"),
        address=data.get("address"),
        owner_id=current_user.id,
    )
    db.session.add(shop)
    db.session.commit()
    return jsonify({"message": "Shop created (pending approval).", "shop": shop.to_dict()}), 201


@seller_bp.route("/shop", methods=["GET"])
@role_required("seller")
def get_shop():
    if not current_user.shop:
        return jsonify({"error": "No shop found."}), 404
    return jsonify({"shop": current_user.shop.to_dict(include_products=True)}), 200


@seller_bp.route("/shop/settings", methods=["PATCH"])
@role_required("seller")
def update_shop_settings():
    """Update shop settings. Body: {payment_mode: 'wallet_settlement' | 'cash_purchase'}"""
    shop = current_user.shop
    if not shop:
        return jsonify({"error": "No shop found."}), 404

    data = request.get_json() or {}
    payment_mode = data.get("payment_mode")
    if payment_mode and payment_mode not in ("wallet_settlement", "cash_purchase"):
        return jsonify({"error": "Invalid payment_mode. Use 'wallet_settlement' or 'cash_purchase'."}), 400

    if payment_mode:
        shop.payment_mode = payment_mode

    if "name" in data:
        shop.name = data["name"]
    if "address" in data:
        shop.address = data["address"]
    if "nickname" in data:
        current_user.nickname = data["nickname"]
    if "self_delivery_active" in data:
        shop.self_delivery_active = bool(data["self_delivery_active"])

    db.session.commit()
    return jsonify({"message": "Shop settings updated.", "shop": shop.to_dict(), "nickname": current_user.nickname}), 200


# ------------------------------------------------------------------
#  Trusted Partners (Tier 2)
# ------------------------------------------------------------------
from app.models import ShopTrustedPartner, User

@seller_bp.route("/shop/trusted-partners", methods=["GET"])
@role_required("seller")
def get_trusted_partners():
    shop = current_user.shop
    if not shop: return jsonify({"error": "No shop found."}), 404
    
    links = ShopTrustedPartner.query.filter_by(shop_id=shop.id).all()
    partners = []
    for link in links:
        user = db.session.get(User, link.delivery_partner_id)
        if user:
            partners.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "phone": user.phone
            })
    return jsonify({"trusted_partners": partners}), 200

@seller_bp.route("/shop/trusted-partners", methods=["POST"])
@role_required("seller")
def add_trusted_partner():
    shop = current_user.shop
    if not shop: return jsonify({"error": "No shop found."}), 404
    
    identifier = request.json.get("identifier") or request.json.get("email")
    if not identifier: return jsonify({"error": "Please provide Delivery Boy ID, Email, or Phone."}), 400
    
    user = User.query.filter_by(role="delivery", email=str(identifier)).first()
    if not user:
        user = User.query.filter_by(role="delivery", phone=str(identifier)).first()
    if not user and str(identifier).isdigit():
        user = User.query.filter_by(role="delivery", id=int(identifier)).first()
        
    if not user:
        return jsonify({"error": "No delivery partner found with this info."}), 404
        
    existing = ShopTrustedPartner.query.filter_by(shop_id=shop.id, delivery_partner_id=user.id).first()
    if existing:
        return jsonify({"error": "This partner is already trusted."}), 400
        
    link = ShopTrustedPartner(shop_id=shop.id, delivery_partner_id=user.id)
    db.session.add(link)
    db.session.commit()
    
    return jsonify({"message": f"{user.name} added to trusted partners."}), 201

@seller_bp.route("/shop/trusted-partners/<int:partner_id>", methods=["DELETE"])
@role_required("seller")
def remove_trusted_partner(partner_id):
    shop = current_user.shop
    if not shop: return jsonify({"error": "No shop found."}), 404
    
    link = ShopTrustedPartner.query.filter_by(shop_id=shop.id, delivery_partner_id=partner_id).first()
    if not link:
        return jsonify({"error": "Partner is not in trusted list."}), 404
        
    db.session.delete(link)
    db.session.commit()
    
    return jsonify({"message": "Partner removed from trusted list."}), 200

# ------------------------------------------------------------------
#  Products
# ------------------------------------------------------------------
@seller_bp.route("/products", methods=["POST"])
@role_required("seller")
def add_product():
    """Body: {global_item_id, unit_value, unit_measure, price, description}"""
    shop = current_user.shop
    if not shop or not shop.is_approved:
        return jsonify({"error": "Shop not found or not approved."}), 400

    data = request.get_json() or {}
    global_item_id = data.get("global_item_id")
    price = data.get("price", 0)
    
    if not global_item_id:
        return jsonify({"error": "Global Item is required."}), 400
        
    g_item = db.session.get(GlobalItem, global_item_id)
    if not g_item:
        return jsonify({"error": "Selected item not found in global catalog."}), 404

    if safe_float(price) <= 0 or safe_float(price) > 50000:
        return jsonify({"error": "Price cannot be negative."}), 400
        
    unit_val = data.get("unit_value")
    unit_meas = data.get("unit_measure")
    
    # Generate name automatically
    # Format: Company Category (Specification) - Unit
    auto_name = f"{g_item.company} {g_item.category} ({g_item.specification})"
    if unit_val and unit_meas:
        auto_name += f" - {unit_val} {unit_meas}"

    product = Product(
        global_item_id=g_item.id,
        name=auto_name,
        price=price,
        unit_value=unit_val,
        unit_measure=unit_meas,
        description=data.get("description"),
        shop_id=shop.id,
    )
    try:
        db.session.add(product)
        db.session.commit()
        return jsonify({"message": "Product added.", "product": product.to_dict()}), 201
    except sqlalchemy.exc.IntegrityError:
        db.session.rollback()
        return jsonify({"error": "This product already exists in your shop inventory."}), 400


@seller_bp.route("/products", methods=["GET"])
@role_required("seller")
def get_products():
    shop = current_user.shop
    if not shop:
        return jsonify({"error": "No shop found."}), 404
    products = Product.query.filter_by(shop_id=shop.id, is_deleted=False).all()
    return jsonify({"products": [p.to_dict() for p in products]}), 200


@seller_bp.route("/products/<int:product_id>", methods=["PATCH"])
@role_required("seller")
def edit_product(product_id):
    """Body: {name, price, description, is_available}"""
    shop = current_user.shop
    if not shop:
        return jsonify({"error": "Shop not found."}), 404

    product = db.session.get(Product, product_id)
    if not product or product.shop_id != shop.id or product.is_deleted:
        return jsonify({"error": "Product not found."}), 404

    data = request.get_json() or {}
    if "name" in data:
        product.name = data["name"]
    if "price" in data:
        price = data["price"]
        if safe_float(price) <= 0 or safe_float(price) > 50000:
            return jsonify({"error": "Price cannot be negative."}), 400
        product.price = price
    if "description" in data:
        product.description = data["description"]
    if "is_available" in data:
        product.is_available = bool(data["is_available"])

    db.session.commit()
    return jsonify({"message": "Product updated.", "product": product.to_dict()}), 200


@seller_bp.route("/products/<int:product_id>", methods=["DELETE"])
@role_required("seller")
def delete_product(product_id):
    """Soft delete a product."""
    shop = current_user.shop
    if not shop:
        return jsonify({"error": "Shop not found."}), 404

    product = db.session.get(Product, product_id)
    if not product or product.shop_id != shop.id or product.is_deleted:
        return jsonify({"error": "Product not found."}), 404

    product.is_deleted = True
    product.is_available = False  # also mark unavailable to be safe
    db.session.commit()
    return jsonify({"message": "Product deleted successfully."}), 200


# ------------------------------------------------------------------
#  Seller Orders
# ------------------------------------------------------------------
@seller_bp.route("/orders", methods=["GET"])
@role_required("seller")
def get_seller_orders():
    shop = current_user.shop
    if not shop:
        return jsonify({"error": "No shop found."}), 404

    target_date_str = request.args.get('date')
    page = int(request.args.get('page', 1))
    limit = min(100, int(request.args.get('limit', 20)))
    query = Order.query.filter_by(shop_id=shop.id)
    
    if target_date_str:
        from datetime import datetime, timedelta
        try:
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
            start_ist = target_date.replace(hour=6, minute=0, second=0, microsecond=0)
            end_ist = start_ist + timedelta(days=1)
            start_utc = start_ist - timedelta(hours=5, minutes=30)
            end_utc = end_ist - timedelta(hours=5, minutes=30)
            
            query = query.filter(Order.created_at >= start_utc, Order.created_at < end_utc)
        except ValueError:
            pass # ignore invalid date and return all or nothing

    from sqlalchemy.orm import joinedload
    paginated = query.options(
        joinedload(Order.shop),
        joinedload(Order.customer),
        joinedload(Order.delivery_partner),
        joinedload(Order.items).joinedload(OrderItem.product)
    ).order_by(Order.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)
    
    return jsonify({
        "orders": [o.to_dict() for o in paginated.items],
        "total": paginated.total,
        "page": paginated.page,
        "pages": paginated.pages
    }), 200


# ------------------------------------------------------------------
#  Confirm All  (Feature 4)
# ------------------------------------------------------------------
@seller_bp.route("/orders/<int:order_id>/confirm-all", methods=["PATCH"])
@role_required("seller")
def confirm_all(order_id):
    """One-tap: all items in stock â†’ pending â†’ confirmed."""
    shop = current_user.shop
    order = db.session.get(Order, order_id)

    if not order or not shop or order.shop_id != shop.id:
        return jsonify({"error": "Order not found."}), 404
    if order.status != "pending":
        return jsonify({"error": f"Cannot confirm from status '{order.status}'."}), 400

    order.status = "confirmed"
    order.seller_response_deadline = None
    db.session.commit()

    # Notify buyer
    NotificationService.notify(
        order.user_id, "order_confirmed",
        f"Your order #{order.id} has been confirmed by the seller!"
    )
    db.session.commit()

    return jsonify({"message": "Order confirmed.", "order": order.to_dict()}), 200


# ------------------------------------------------------------------
#  Mark Unavailable  (Feature 4)
# ------------------------------------------------------------------
@seller_bp.route("/orders/<int:order_id>/mark-unavailable", methods=["PATCH"])
@role_required("seller")
def mark_unavailable(order_id):
    """
    Body: {unavailable_item_ids: [item_id, ...]}
    If ALL items unavailable â†’ cancel.
    If SOME unavailable â†’ awaiting_buyer_decision.
    """
    shop = current_user.shop
    order = db.session.get(Order, order_id)

    if not order or not shop or order.shop_id != shop.id:
        return jsonify({"error": "Order not found."}), 404
    if order.status != "pending":
        return jsonify({"error": f"Cannot mark unavailable from status '{order.status}'."}), 400

    data = request.get_json() or {}
    unavailable_ids = data.get("unavailable_item_ids", [])

    if not unavailable_ids:
        return jsonify({"error": "Provide unavailable_item_ids."}), 400

    # Mark items
    for item in order.items:
        if item.id in unavailable_ids:
            item.is_available = False

    available_items = [i for i in order.items if i.is_available]

    if not available_items:
        # ALL items unavailable â†’ cancel
        order.status = "cancelled"
        order.cancellation_reason = "out_of_stock"
        order.seller_response_deadline = None
        
        if order.payment_method == "online":
            from app.models import WalletTransaction
            user = order.customer
            user.wallet_balance += order.total_amount
            txn = WalletTransaction(
                order_id=order.id, from_type="platform", from_id=1,
                to_type="user", to_id=user.id,
                amount=order.total_amount, transaction_type="refund_cancellation"
            )
            db.session.add(txn)
            
        db.session.commit()

        NotificationService.notify(
            order.user_id, "order_cancelled",
            f"Order #{order.id} cancelled â€” all items out of stock."
        )
        db.session.commit()
        return jsonify({"message": "Order cancelled (all items out of stock).",
                        "order": order.to_dict()}), 200

    # SOME items unavailable -> buyer must decide
    order.status = "awaiting_buyer_decision"
    order.seller_response_deadline = None
    order.buyer_decision_deadline = (
        datetime.utcnow()
        + timedelta(minutes=current_app.config["BUYER_DECISION_TIMEOUT_MINUTES"])
    )
    # We do NOT recalculate totals yet, wait for buyer decision
    db.session.commit()

    unavailable_names = [i.product.name for i in order.items if not i.is_available]
    NotificationService.notify(
        order.user_id, "partial_stock",
        f"Order #{order.id}: items unavailable - {', '.join(unavailable_names)}. "
        f"Please confirm or cancel."
    )
    db.session.commit()

    return jsonify({
        "message": "Some items marked unavailable. Awaiting buyer decision.",
        "order": order.to_dict(),
    }), 200


# ------------------------------------------------------------------
#  Ready
# ------------------------------------------------------------------
@seller_bp.route("/orders/<int:order_id>/ready", methods=["PATCH"])
@role_required("seller")
def mark_ready(order_id):
    shop = current_user.shop
    order = db.session.get(Order, order_id)

    if not order or not shop or order.shop_id != shop.id:
        return jsonify({"error": "Order not found."}), 404
    if order.status != "confirmed":
        return jsonify({"error": f"Cannot mark ready from status '{order.status}'."}), 400

    order.status = "ready"
    order.ready_at = datetime.utcnow()
    db.session.commit()

    NotificationService.notify(
        order.user_id, "order_ready",
        f"Your order #{order.id} is ready for pickup/delivery!"
    )
    
    # Broadcast to all active delivery boys if it's instant_delivery
    if order.delivery_type == "instant_delivery":
        from app import socketio
        socketio.emit("new_order", {"order": order.to_dict()}, room="active_delivery_boys")
        
    db.session.commit()

    return jsonify({"message": "Order marked ready.", "order": order.to_dict()}), 200


# ------------------------------------------------------------------
#  Self-Deliver Status Update  (Feature 2)
# ------------------------------------------------------------------
@seller_bp.route("/orders/<int:order_id>/self-deliver-status", methods=["PATCH"])
@role_required("seller")
def self_deliver_status(order_id):
    """
    Body: {status: "picked_up" | "delivered"}
    Only for self_delivery orders.
    """
    shop = current_user.shop
    order = db.session.get(Order, order_id)

    if not order or not shop or order.shop_id != shop.id:
        return jsonify({"error": "Order not found."}), 404

    if order.delivery_type != "self_delivery":
        return jsonify({"error": "This order is not self_delivery."}), 400

    data = request.get_json() or {}
    new_status = data.get("status")

    valid_transitions = {
        "ready": "picked_up",
        "picked_up": "delivered",
    }

    expected = valid_transitions.get(order.status)
    if not expected or new_status != expected:
        return jsonify({
            "error": f"Invalid transition: {order.status} â†’ {new_status}."
        }), 400

    order.status = new_status

    if new_status == "delivered":
        order.shop_payment_claimed = False
        from app.models import Notification
        db.session.add(Notification(
            user_id=shop.owner_id,
            event_type="order_delivered",
            related_id=order.id,
            message=f"Order #{order.id} is delivered! Click 'Receive Payment' to get \u09f3{order.items_total}."
        ))
            
        NotificationService.notify(
            order.user_id, "order_delivered",
            f"à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦° #{order.id} (UID: {order.uid}) à¦à¦° à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦¸à¦®à§à¦ªà¦¨à§à¦¨ à¦¹à§Ÿà§‡à¦›à§‡à¥¤"
        )

    db.session.commit()

    return jsonify({"message": f"Order status updated to '{new_status}'.",
                    "order": order.to_dict()}), 200


# ------------------------------------------------------------------
#  Seller Wallet  (Feature 1)
# ------------------------------------------------------------------
@seller_bp.route("/wallet", methods=["GET"])
@role_required("seller")
def seller_wallet():
    shop = current_user.shop
    if not shop:
        return jsonify({"error": "No shop found."}), 404

    transactions = WalletTransaction.query.filter(
        db.or_(
            db.and_(WalletTransaction.to_type == "shop", WalletTransaction.to_id == shop.id),
            db.and_(WalletTransaction.from_type == "shop", WalletTransaction.from_id == shop.id),
            db.and_(WalletTransaction.to_type == "user", WalletTransaction.to_id == current_user.id),
            db.and_(WalletTransaction.from_type == "user", WalletTransaction.from_id == current_user.id),
            db.and_(WalletTransaction.to_type == "seller", WalletTransaction.to_id == current_user.id),
            db.and_(WalletTransaction.from_type == "seller", WalletTransaction.from_id == current_user.id)
        )
    ).order_by(WalletTransaction.created_at.desc()).limit(100).all()

    return jsonify({
        "wallet_balance": shop.wallet_balance,
        "transactions": [t.to_dict() for t in transactions],
        "note": "Showing last 100 transactions"
    }), 200



# ======================================================================
#  Global Items & Requests (Seller)
# ======================================================================
from app.models import GlobalItem, ItemRequest

@seller_bp.route("/global-items", methods=["GET"])
@role_required("seller")
def get_global_items():
    items = GlobalItem.query.all()
    return jsonify({"items": [i.to_dict() for i in items]}), 200

@seller_bp.route("/item-requests", methods=["POST"])
@role_required("seller")
def request_new_item():
    shop = current_user.shop
    if not shop: return jsonify({"error": "Shop not found"}), 404
    data = request.get_json()
    req = ItemRequest(
        shop_id=shop.id,
        requested_company="Local/Loose" if data.get("company", "").strip().lower() in ["local", "loose", "local/loose", "local / loose"] else data.get("company", "").strip(),
        requested_category=data.get("category", "").strip(),
        requested_specification=data.get("specification", "").strip(),
        quantity_type=data.get("quantity_type", "weight").strip()
    )
    db.session.add(req)
    db.session.commit()
    return jsonify({"message": "Request submitted to admin."}), 201


@seller_bp.route("/stats", methods=["GET"])
@role_required("seller")
def get_seller_stats():
    shop = current_user.shop
    if not shop: return jsonify({"error": "No shop found"}), 404

    target_date_str = request.args.get('date')
    from datetime import datetime, timedelta
    utc_now = datetime.utcnow()
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    
    start_utc = None
    end_utc = None
    date_label = "All Time"

    if target_date_str and target_date_str == 'all':
        pass # No date filtering
    else:
        if target_date_str:
            try:
                target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
                start_ist = target_date.replace(hour=6, minute=0, second=0, microsecond=0)
            except ValueError:
                return jsonify({"error": "Invalid date format"}), 400
        else:
            if ist_now.hour >= 6:
                start_ist = ist_now.replace(hour=6, minute=0, second=0, microsecond=0)
            else:
                start_ist = (ist_now - timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0)
                
        end_ist = start_ist + timedelta(days=1)
        start_utc = start_ist - timedelta(hours=5, minutes=30)
        end_utc = end_ist - timedelta(hours=5, minutes=30)
        date_label = start_ist.strftime('%d %b %Y')

    
    q_pending = Order.query.filter(Order.shop_id==shop.id, Order.status=="pending")
    q_ready = Order.query.filter(Order.shop_id==shop.id, Order.status=="ready")
    
    from sqlalchemy.sql import func
    q_sales = db.session.query(func.sum(Order.items_total)).filter(
        Order.shop_id == shop.id,
        Order.status == "delivered"
    )

    if start_utc and end_utc:
        q_pending = q_pending.filter(Order.created_at >= start_utc, Order.created_at < end_utc)
        q_ready = q_ready.filter(Order.created_at >= start_utc, Order.created_at < end_utc)
        q_sales = q_sales.filter(Order.created_at >= start_utc, Order.created_at < end_utc)

    pending_count = q_pending.count()
    ready_count = q_ready.count()
    sales = q_sales.scalar() or 0.0

    return jsonify({
        "pending_orders": pending_count,
        "ready_orders": ready_count,
        "todays_sales": sales,
        "is_active": shop.is_active,
        "date_label": date_label
    }), 200


@seller_bp.route("/shop/toggle-self-delivery", methods=["PATCH"])
@role_required("seller")
def toggle_self_delivery():
    shop = current_user.shop
    if not shop: return jsonify({"error": "No shop found"}), 404
    data = request.get_json() or {}
    
    if "self_delivery_active" in data:
        shop.self_delivery_active = bool(data["self_delivery_active"])
    if "opening_time" in data:
        shop.opening_time = data["opening_time"]
    if "closing_time" in data:
        shop.closing_time = data["closing_time"]
        db.session.commit()
    
    return jsonify({"message": "Settings updated", "self_delivery_active": shop.self_delivery_active}), 200


@seller_bp.route("/orders/<int:order_id>/partial-accept", methods=["POST"])
@role_required("seller")
def partial_accept_order(order_id):
    shop = db.session.query(Shop).with_for_update().get(current_user.shop.id)
    if not shop: return jsonify({"error": "No shop found"}), 404
    
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order or order.shop_id != shop.id:
        return jsonify({"error": "Order not found"}), 404
        
    if order.status != "pending":
        return jsonify({"error": "Order is not pending"}), 400
        
    data = request.get_json() or {}
    available_items = data.get("available_items", [])
    
    if not available_items:
        # Auto-cancel if the seller has NONE of the items
        from app.models import Notification, WalletTransaction
        order.status = "cancelled"
        order.cancellation_reason = "shop_items_unavailable"
        
        # Refund if online
        if order.payment_method == "online":
            order.customer.wallet_balance += order.total_amount
            refund_tx = WalletTransaction(
                from_type="platform",
                from_id=1,
                to_type="user",
                to_id=order.user_id,
                amount=order.total_amount,
                transaction_type="refund_cancellation"
            )
            db.session.add(refund_tx)
            
        n = Notification(
            user_id=order.user_id,
            event_type="order_cancelled",
            message=f"Order #{order.id} was cancelled because the shop does not have the requested items."
        )
        db.session.add(n)
        db.session.commit()
        return jsonify({"message": "Order cancelled because no items were available."}), 200
        
    # Mark items as available/unavailable
    items = OrderItem.query.filter_by(order_id=order.id).all()
    for item in items:
        if item.id in available_items:
            item.is_available = True
        else:
            item.is_available = False
            
    order.status = "awaiting_buyer_decision"
    
    from app.models import Notification
    n = Notification(
        user_id=order.user_id,
        event_type="partial_order",
        message=f"Shop does not have all items for Order #{order.id}. Please review and confirm within 10 minutes."
    )
    db.session.add(n)
    db.session.commit()
    
    return jsonify({"message": "Partial order requested. Waiting for buyer."}), 200


@seller_bp.route("/orders/<int:order_id>/claim-payment", methods=["POST"])
@role_required("seller")
def claim_payment(order_id):
    from app.models import Order, WalletTransaction
    shop = db.session.query(Shop).with_for_update().get(current_user.shop.id)
    if not shop: return jsonify({"error": "No shop found"}), 404
    
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order or order.shop_id != shop.id:
        return jsonify({"error": "Order not found"}), 404
        
    if order.status != "delivered":
        return jsonify({"error": "Order is not delivered yet."}), 400
        
    if order.shop_payment_claimed:
        return jsonify({"error": "Payment already claimed for this order."}), 400
        
    # Credit shop wallet
    shop.wallet_balance += order.items_total
    order.shop_payment_claimed = True
    
    txn = WalletTransaction(
        order_id=order.id, from_type="platform", from_id=1,
        to_type="shop", to_id=shop.id,
        amount=order.items_total, transaction_type="seller_payment_claim",
        description=f"Earnings received for Order #{order.id}",
        balance_after=shop.wallet_balance
    )
    db.session.add(txn)
    
    # Mark the notification as read if it exists
    from app.models import Notification
    notif = Notification.query.filter_by(user_id=shop.owner_id, event_type="order_delivered", related_id=order.id).first()
    if notif:
        notif.is_read = True
        
    db.session.commit()
    
    return jsonify({"message": "Payment received successfully!", "wallet_balance": shop.wallet_balance}), 200


@seller_bp.route("/products/<int:product_id>/toggle-stock", methods=["PATCH"])
@role_required("seller")
def toggle_product_stock(product_id):
    shop = current_user.shop
    if not shop: return jsonify({"error": "No shop found"}), 404
    
    product = db.session.get(Product, product_id)
    if not product or product.shop_id != shop.id:
        return jsonify({"error": "Product not found"}), 404
        
    data = request.get_json() or {}
    if "is_available" in data:
        product.is_available = bool(data["is_available"])
        db.session.commit()
        return jsonify({"message": "Stock status updated", "is_available": product.is_available}), 200
        
    return jsonify({"error": "in_stock boolean required"}), 400


@seller_bp.route("/offers", methods=["GET", "POST"])
@role_required("seller")
def manage_seller_offers():
    from app.models import Offer
    shop = db.session.query(Shop).filter_by(owner_id=current_user.id).first()
    if not shop:
        return jsonify({"error": "Shop not found"}), 404
        
    if request.method == "GET":
        offers = Offer.query.filter_by(shop_id=shop.id).all()
        return jsonify({"offers": [o.to_dict() for o in offers]}), 200
        
    data = request.get_json() or {}
    new_offer = Offer(
        shop_id=shop.id,
        title=data.get("title"),
        description=data.get("description"),
        offer_type=data.get("offer_type", "cart_discount_threshold"),
        threshold_amount=data.get("threshold_amount"),
        discount_value=data.get("discount_value", 0),
        is_percentage=data.get("is_percentage", False)
    )
    db.session.add(new_offer)
    db.session.commit()
    return jsonify({"message": "Offer created successfully!"}), 201

@seller_bp.route("/offers/<int:offer_id>", methods=["PATCH"])
@role_required("seller")
def toggle_seller_offer(offer_id):
    from app.models import Offer
    offer = db.session.get(Offer, offer_id)
    if not offer or offer.shop.owner_id != current_user.id:
        return jsonify({"error": "Offer not found or unauthorized"}), 404
        
    data = request.get_json() or {}
    if "is_active" in data:
        offer.is_active = data["is_active"]
        db.session.commit()
        return jsonify({"message": "Offer status updated.", "offer": offer.to_dict()}), 200
    
    return jsonify({"error": "is_active boolean required"}), 400

@seller_bp.route("/offers/<int:offer_id>", methods=["DELETE"])
@role_required("seller")
def delete_seller_offer(offer_id):
    from app.models import Offer
    offer = db.session.get(Offer, offer_id)
    if not offer or offer.shop.owner_id != current_user.id:
        return jsonify({"error": "Offer not found or unauthorized"}), 404
        
    db.session.delete(offer)
    db.session.commit()
    return jsonify({"message": "Offer deleted successfully!"}), 200
# ------------------------------------------------------------------
#  Approve Pickup Shortage (Bug 2: Shortage Scam Protection)
# ------------------------------------------------------------------
@seller_bp.route("/orders/<int:order_id>/approve-shortage", methods=["POST"])
@role_required("seller")
def approve_pickup_shortage(order_id):
    order = db.session.get(Order, order_id)
    if not order:
        return jsonify({"error": "Order not found."}), 404

    shop = db.session.get(Shop, order.shop_id)
    if shop.owner_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    if order.status != "awaiting_shortage_approval":
        return jsonify({"error": "Order is not awaiting shortage approval."}), 400

    order.pickup_shortage_reported = True
    
    # Shop reputation logging (from delivery.py logic)
    # Re-using the same penalty logic for shop since they confirmed it.
    shop.pickup_shortage_count_30d = (shop.pickup_shortage_count_30d or 0) + 1
    
    order.recalculate_totals()
    order.status = "picked_up"
    db.session.commit()
    
    # Notify Buyer and Delivery Boy
    NotificationService.notify(order.user_id, "pickup_shortage", f"Order #{order.id} picked up with shortage. Your bill is adjusted to à§³{order.total_amount}.")
    if order.delivery_partner_id:
        NotificationService.notify(order.delivery_partner_id, "shortage_approved", f"Shop approved the shortage for Order #{order.id}. Please proceed with delivery.")

    return jsonify({"message": "Shortage approved. Order is now picked up.", "order": order.to_dict()}), 200

