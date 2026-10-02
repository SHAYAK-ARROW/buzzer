from app.utils import safe_float
"""
User (buyer / customer) routes.

Prefix: /api  (registered in __init__.py)
"""

from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import current_user, jwt_required, get_jwt_identity

from app import db
from app.auth_helpers import role_required
from app.models import (Order, OrderItem, Product, Shop, Notification,
                         Complaint, User)
from app.notifications import NotificationService

user_bp = Blueprint("user", __name__)


# ------------------------------------------------------------------
#  Profile
# ------------------------------------------------------------------
@user_bp.route("/user/profile", methods=["GET"])
@role_required("user", "seller", "delivery", "admin")
def get_profile():
    from datetime import datetime
    current_user.last_seen_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"user": current_user.to_dict()}), 200

@user_bp.route("/user/profile", methods=["PATCH"])
@role_required("user", "seller", "delivery", "admin")
def update_profile():
    data = request.get_json() or {}
    from app.models import SystemSetting
    platform_paused = SystemSetting.query.filter_by(key="platform_paused").first()
    if platform_paused and platform_paused.value == "true":
        return jsonify({"error": "Platform is currently paused for maintenance or emergency. Please try again later."}), 400

    user_id = get_jwt_identity()
    user = db.session.query(User).with_for_update().get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    if "name" in data:
        user.name = data["name"]
    if "nickname" in data:
        user.nickname = data["nickname"]
    if "phone" in data:
        user.phone = data["phone"]
    if "default_address" in data:
        user.default_address = data["default_address"]
        
    db.session.commit()
    return jsonify({"message": "Profile updated.", "user": user.to_dict()}), 200

# ------------------------------------------------------------------
#  Wallet (Fake Online Pay)
# ------------------------------------------------------------------
@user_bp.route("/user/wallet/add-money", methods=["POST"])
@jwt_required()
def add_money():
    data = request.get_json() or {}
    amount = data.get("amount", 0)
    
    try:
        amount = safe_float(amount)
        if amount <= 0:
            raise ValueError()
    except ValueError:
        return jsonify({"error": "Invalid amount."}), 400

    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    user.wallet_balance += amount
    db.session.commit()
    return jsonify({"message": f"à§³{amount} added to wallet successfully!", "user": user.to_dict()}), 200



# ------------------------------------------------------------------
#  Location (Shared)
# ------------------------------------------------------------------
@user_bp.route("/user/location", methods=["PATCH"])
@jwt_required()
def update_location():
    """Body: {latitude, longitude}"""
    data = request.get_json() or {}
    lat = data.get("latitude")
    lng = data.get("longitude")
    
    if lat is None or lng is None:
        return jsonify({"error": "latitude and longitude are required."}), 400
        
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    user.current_latitude = safe_float(lat)
    user.current_longitude = safe_float(lng)
    user.location_updated_at = datetime.utcnow()
    
    # Log location for heatmaps/analytics
    from app.models import LocationHistory
    db.session.add(LocationHistory(
        user_id=user.id,
        role=user.role,
        lat=user.current_latitude,
        lng=user.current_longitude
    ))
    db.session.commit()
    
    return jsonify({"message": "Location updated.", "user": user.to_dict()}), 200


# ------------------------------------------------------------------
#  Place Order  (Features 2, 3, 4)
# ------------------------------------------------------------------
@user_bp.route("/orders", methods=["POST"])
@role_required("user")
def place_order():
    """
    Body: {
      shop_id, delivery_type, is_cash_on_delivery, delivery_notes,
      items: [{product_id, quantity}, ...]
    }
    """
    data = request.get_json() or {}

    shop_id = data.get("shop_id")
    if not shop_id:
        return jsonify({"error": "shop_id is required."}), 400

    try:
        shop_id = int(shop_id)
    except ValueError:
        return jsonify({"error": "Invalid shop_id format."}), 400

    shop = db.session.get(Shop, shop_id)
    if not shop or not shop.is_approved:
        return jsonify({"error": "Shop not found or not approved."}), 404

    if shop.owner_id == current_user.id:
        return jsonify({"error": "You cannot place an order at your own shop."}), 403

    if not shop.is_active:
        return jsonify({"error": "Shop is currently closed. You cannot place orders at this time."}), 400

    # 1. Advanced Offline Check (Heartbeat)
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    is_open = True
    if shop.shop_last_active_at and (now - shop.shop_last_active_at).total_seconds() > 15 * 60:
        is_open = False
    if getattr(shop, 'owner', None) and getattr(shop.owner, 'last_seen_at', None) and (now - shop.owner.last_seen_at).total_seconds() > 24 * 3600:
        is_open = False
    if not is_open:
        return jsonify({"error": "Shop is currently inactive or offline. You cannot place orders."}), 400

    # 2. Distance Validation (Haversine)
    if current_user.lat and current_user.lng and shop.lat and shop.lng:
        import math
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371  # Earth radius in km
            dLat = math.radians(lat2 - lat1)
            dLon = math.radians(lon2 - lon1)
            a = math.sin(dLat/2) * math.sin(dLat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2) * math.sin(dLon/2)
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c
        
        distance_km = haversine(current_user.lat, current_user.lng, shop.lat, shop.lng)
        if distance_km > 20: # 20km max delivery radius
            return jsonify({"error": f"Shop is too far ({distance_km:.1f} km). Max delivery radius is 20 km."}), 400
    
    # 3. High COD Risk Check
    is_cod = bool(data.get("is_cash_on_delivery", False))
    if is_cod:
        from app.models import Order
        cancelled_count = Order.query.filter_by(user_id=current_user.id, status='cancelled').count()
        if cancelled_count >= 5:
            return jsonify({"error": "Cash on Delivery is disabled due to high cancellation history. Please pay online."}), 403



    items_data = data.get("items", [])
    if not items_data:
        return jsonify({"error": "At least one item is required."}), 400

    # Delivery type
    delivery_type = data.get("delivery_type", "instant_delivery")
    if delivery_type not in ("instant_delivery", "self_delivery"):
        return jsonify({"error": "Invalid delivery_type."}), 400

    from app.models import SystemSetting
    
    if delivery_type == "self_delivery":
        global_sd = SystemSetting.query.filter_by(key="self_delivery_enabled").first()
        if global_sd and global_sd.value == "false":
            return jsonify({"error": "Self Delivery is currently disabled by the platform admin."}), 400
        if not shop.self_delivery_active:
            return jsonify({"error": "This shop does not offer Self Delivery."}), 400

    # Calculate Dynamic Delivery Charge using GPS
    delivery_charge = 0.0
    if delivery_type == "instant_delivery":
        from app.models import SystemSetting
        base_fare = safe_float(SystemSetting.query.filter_by(key="delivery_base_fare").first().value or 20.0)
        per_km = safe_float(SystemSetting.query.filter_by(key="delivery_per_km").first().value or 10.0)
        surge = safe_float(SystemSetting.query.filter_by(key="delivery_surge_multiplier").first().value or 1.0)
        
        # Try to calculate distance
        buyer_lat = data.get("lat")
        buyer_lng = data.get("lng")
        if buyer_lat and buyer_lng and shop.lat and shop.lng:
            try:
                from geopy.distance import geodesic
                import math
                dist_km = geodesic((safe_float(buyer_lat), safe_float(buyer_lng)), (shop.lat, shop.lng)).km
                
                if dist_km < 0.1:
                    return jsonify({"error": "Delivery location is too close to the shop. Please select Self Delivery if you are at the shop."}), 400

                
                # Fetch Slab Settings
                def get_set(key, default):
                    s = SystemSetting.query.filter_by(key=key).first()
                    return safe_float(s.value) if s and s.value else default
                
                s1_to = get_set("delivery_slab1_to", 2.0)
                s1_p = get_set("delivery_slab1_price", 20.0)
                s2_to = get_set("delivery_slab2_to", 5.0)
                s2_p = get_set("delivery_slab2_price", 40.0)
                s3_to = get_set("delivery_slab3_to", 8.0)
                s3_p = get_set("delivery_slab3_price", 70.0)
                over_p = get_set("delivery_over_per_km", 10.0)
                
                if dist_km <= s1_to:
                    delivery_charge = s1_p
                elif dist_km <= s2_to:
                    delivery_charge = s2_p
                elif dist_km <= s3_to:
                    delivery_charge = s3_p
                else:
                    extra_km = math.ceil(dist_km - s3_to)
                    delivery_charge = s3_p + (extra_km * over_p)
                    
                delivery_charge = delivery_charge * surge
            except Exception as e:
                delivery_charge = current_app.config.get("DELIVERY_CHARGE", 30.0) # fallback
        else:
            delivery_charge = current_app.config["DELIVERY_CHARGE"] # fallback
            
        delivery_charge = round(delivery_charge, 2)
        

    # Calculate Items Total first
    items_total = 0.0
    order_items_to_add = []
    for item_data in items_data:
        product = db.session.get(Product, item_data.get("product_id"))
        if not product or product.shop_id != shop_id:
            return jsonify({"error": f"Product {item_data.get('product_id')} not found in this shop."}), 404

        qty_raw = item_data.get("quantity", 1)
        try:
            qty = safe_float(qty_raw)
        except ValueError:
            return jsonify({"error": "Invalid quantity."}), 400
            
        from app.models import GlobalItem
        gi = db.session.get(GlobalItem, product.global_item_id) if product.global_item_id else None
        
        is_loose = False
        if gi and gi.quantity_type in ('kg', 'gm', 'litre', 'ml', 'weight'):
            is_loose = True
            
        if is_loose:
            if qty <= 0 or qty > 50:
                return jsonify({"error": "Invalid quantity."}), 400
        else:
            if qty != int(qty) or qty <= 0 or qty > 50:
                return jsonify({"error": "Please provide a whole number for this item."}), 400
            qty = int(qty)
            
        order_item = OrderItem(
            product_id=product.id,
            quantity=qty,
            unit_price=product.price,
        )
        order_items_to_add.append(order_item)
        items_total += product.price * qty

    
    min_order_setting = SystemSetting.query.filter_by(key="minimum_order_value").first()
    min_order = safe_float(min_order_setting.value) if min_order_setting and min_order_setting.value else 50.0
    if items_total < min_order:
        return jsonify({"error": f"Minimum order amount is ৳{min_order}."}), 400

    # Check for active offers to apply discounts
    from app.models import Offer
    active_offers = Offer.query.filter_by(shop_id=shop.id, is_active=True).all()
    
    cart_discount = 0.0
    for offer in active_offers:
        if offer.threshold_amount and items_total >= offer.threshold_amount:
            if offer.offer_type == "free_delivery_threshold":
                delivery_charge = 0.0
            elif offer.offer_type == "cart_discount_threshold":
                cart_discount += safe_float(offer.discount_value)

    cart_discount = min(cart_discount, items_total)

    # Payment Method & COD
    payment_method = data.get("payment_method", "cod")
    if payment_method not in ["cod", "online"]:
        return jsonify({"error": "Invalid payment method."}), 400

    is_cod = (payment_method == "cod")
    cod_fee = current_app.config["COD_FEE"] if is_cod else 0.0

    total_amount = max(0.0, round(items_total + delivery_charge + cod_fee - cart_discount, 2))

    # Handle Online Payment Deduction (Race condition safe)
    if payment_method == "online":
        # Atomically check and deduct
        updated = db.session.execute(
            db.update(User)
            .where(User.id == current_user.id, User.wallet_balance >= total_amount)
            .values(wallet_balance=User.wallet_balance - total_amount)
        )
        if updated.rowcount == 0:
            return jsonify({"error": "Insufficient wallet balance or concurrent transaction."}), 400
        
        # Expire local state so it refreshes from DB if used later
        db.session.expire(current_user, ['wallet_balance'])
        
        from app.models import WalletTransaction
        txn = WalletTransaction(
            # order_id will be set after order flush
            from_type="user",
            from_id=current_user.id,
            to_type="platform",  # holding the money until delivery
            to_id=1, # Admin or platform ID
            amount=total_amount,
            transaction_type="online_payment",
        )
        db.session.add(txn)

    import random, string
    uid_chars = string.ascii_uppercase + string.digits
    order_uid = "".join(random.choice(uid_chars) for _ in range(16))

    # Build order
    order = Order(
        user_id=current_user.id,
        shop_id=shop_id,
        uid=order_uid,
        status="pending",
        delivery_type=delivery_type,
        delivery_charge=delivery_charge,
        payment_method=payment_method,
        is_cash_on_delivery=is_cod,
        cod_fee=cod_fee,
        delivery_address=data.get("delivery_address"),
        delivery_notes=data.get("delivery_notes"),
        seller_response_deadline=(
            datetime.utcnow()
            + timedelta(minutes=current_app.config["SELLER_RESPONSE_TIMEOUT_MINUTES"])
        ),
        items_total=items_total,
        total_amount=total_amount
    )
    
    for item in order_items_to_add:
        order.items.append(item)

    db.session.add(order)
    db.session.flush() # To get order.id for txn if needed
    
    # If online, update txn with order.id
    if payment_method == "online":
        txn.order_id = order.id

    db.session.commit()

    return jsonify({"message": "Order placed.", "order": order.to_dict()}), 201


# ------------------------------------------------------------------
#  My Orders
# ------------------------------------------------------------------
@user_bp.route("/orders", methods=["GET"])
@role_required("user")
def get_my_orders():
    from sqlalchemy.orm import joinedload
    page = int(request.args.get('page', 1))
    paginated = Order.query.options(
        joinedload(Order.shop),
        joinedload(Order.delivery_partner),
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter_by(user_id=current_user.id).order_by(
        Order.created_at.desc()
    ).paginate(page=page, per_page=20, error_out=False)
    
    return jsonify({
        "orders": [o.to_dict() for o in paginated.items],
        "page": paginated.page,
        "pages": paginated.pages,
        "has_next": paginated.has_next
    }), 200


# ------------------------------------------------------------------
#  Buyer Decision  (Feature 4)
# ------------------------------------------------------------------

@user_bp.route("/orders/<int:order_id>/cancel", methods=["POST"])
@role_required("user")
def buyer_cancel_order(order_id):
    """Buyer can cancel only pending orders (before shop accepts)."""
    from app.models import Order, NotificationService
    order = Order.query.filter_by(id=order_id, user_id=current_user.id).first()
    if not order:
        return jsonify({"error": "Order not found."}), 404
    
    cancellable = ["pending"]
    if order.status not in cancellable:
        return jsonify({"error": f"Cannot cancel order in '{order.status}' status. Only pending orders can be cancelled."}), 400
    
    order.status = "cancelled"
    order.cancellation_reason = "Cancelled by buyer"
    
    # Bug Fix: Refund buyer if payment was online
    if order.payment_method == "online":
        from app.models import WalletTransaction, User
        buyer = db.session.query(User).with_for_update().get(order.user_id)
        if buyer:
            buyer.wallet_balance += order.total_amount
            db.session.add(WalletTransaction(
                order_id=order.id,
                from_type="platform",
                from_id=1,
                to_type="user",
                to_id=buyer.id,
                amount=order.total_amount,
                transaction_type="refund_cancellation"
            ))

    db.session.commit()
    
    NotificationService.notify(order.shop.owner_id, "order_cancelled", f"Order #{order.uid} was cancelled by the buyer.")
    return jsonify({"message": "Order cancelled successfully.", "order": order.to_dict()}), 200

@user_bp.route("/orders/<int:order_id>/buyer-decision", methods=["POST"])
@role_required("user")
def buyer_decision(order_id):
    """
    Body: {decision: "continue_partial" | "cancel_full"}
    """
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order or order.user_id != current_user.id:
        return jsonify({"error": "Order not found."}), 404

    if order.status != "awaiting_buyer_decision":
        return jsonify({"error": "Order is not awaiting your decision."}), 400

    data = request.get_json() or {}
    decision = data.get("decision")

    if decision == "continue_partial":
        order.status = "confirmed"
        order.buyer_decision_deadline = None
        
        old_total = order.total_amount
        order.recalculate_totals()
        
        if order.payment_method == "online":
            refund_amount = old_total - order.total_amount
            if refund_amount > 0:
                from app.models import WalletTransaction
                locked_user = db.session.query(User).with_for_update().get(current_user.id)
                locked_user.wallet_balance += refund_amount
                txn = WalletTransaction(
                    order_id=order.id, from_type="platform", from_id=1,
                    to_type="user", to_id=current_user.id,
                    amount=refund_amount, transaction_type="refund_partial"
                )
                db.session.add(txn)
                
        db.session.commit()

        NotificationService.notify(
            order.shop.owner_id, "order_confirmed",
            f"Order #{order.id} confirmed by buyer (partial)."
        )
        db.session.commit()
        return jsonify({"message": "Order confirmed with available items.",
                        "order": order.to_dict()}), 200

    elif decision == "cancel_full":
        order.status = "cancelled"
        order.cancellation_reason = "buyer_cancelled"
        order.buyer_decision_deadline = None
        
        if order.payment_method == "online":
            from app.models import WalletTransaction
            locked_user = db.session.query(User).with_for_update().get(current_user.id)
            locked_user.wallet_balance += order.total_amount
            txn = WalletTransaction(
                order_id=order.id, from_type="platform", from_id=1,
                to_type="user", to_id=current_user.id,
                amount=order.total_amount, transaction_type="refund_cancellation"
            )
            db.session.add(txn)
            
        db.session.commit()

        NotificationService.notify(
            order.shop.owner_id, "order_cancelled",
            f"Order #{order.id} cancelled by buyer."
        )
        db.session.commit()
        return jsonify({"message": "Order cancelled.", "order": order.to_dict()}), 200

    return jsonify({"error": "Invalid decision. Use 'continue_partial' or 'cancel_full'."}), 400


# ------------------------------------------------------------------
#  Complaint  (Feature 6)
# ------------------------------------------------------------------
@user_bp.route("/orders/<int:order_id>/complaint", methods=["POST"])
@role_required("user")
def file_complaint(order_id):
    """Body: {complaint_type, order_item_id (optional), reported_shortage, reason}"""
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order or order.user_id != current_user.id:
        return jsonify({"error": "Order not found."}), 404

    if order.status != "delivered":
        return jsonify({"error": "Complaints can only be filed for delivered orders."}), 400

    # Ensure complaint window (30 mins after delivery). Using updated_at for delivery time.
    # Note: fallback to 30 mins window from now if updated_at is missing for some reason.
    last_update = order.updated_at or order.created_at
    if (datetime.utcnow() - last_update).total_seconds() > 1800:
        return jsonify({"error": "Complaint window has closed (30 minutes passed since delivery)."}), 400

    data = request.get_json() or {}
    complaint_type = data.get("complaint_type", "other")
    order_item_id = data.get("order_item_id")
    reported_shortage = data.get("reported_shortage")
    reason = data.get("reason")
    
    if not reason:
        return jsonify({"error": "'reason' is required."}), 400

    complaint = Complaint(
        order_id=order_id,
        user_id=current_user.id,
        complaint_type=complaint_type,
        order_item_id=order_item_id,
        reported_shortage=reported_shortage,
        reason=reason,
    )
    db.session.add(complaint)
    db.session.commit()

    # Layer 3: Check delivery partner reputation
    if order.delivery_partner_id and complaint_type in ["short_quantity", "wrong_item"]:
        check_delivery_partner_reputation(order.delivery_partner_id)

    return jsonify({"message": "Complaint filed successfully.", "complaint": complaint.to_dict()}), 201

from datetime import timedelta
from app.notifications import NotificationService

def check_delivery_partner_reputation(partner_id):
    # Count complaints in last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_complaints = Complaint.query.join(Order).filter(
        Order.delivery_partner_id == partner_id,
        Complaint.created_at >= thirty_days_ago,
        Complaint.complaint_type.in_(["short_quantity", "wrong_item"])
    ).count()

    partner = User.query.get(partner_id)
    if not partner:
        return
        
    partner.complaint_count_30d = recent_complaints

    # Find admins to notify
    admins = User.query.filter_by(role="admin", is_deleted=False).all()

    if recent_complaints >= 3:
        # Flag for Admin Review (Do NOT auto-suspend to prevent malicious complaint DoS)
        for admin in admins:
            NotificationService.notify(
                admin.id, "delivery_partner_flagged",
                f"ALERT: Delivery partner '{partner.name}' (ID: {partner.id}) has received {recent_complaints} complaints within 30 days. Please review and investigate."
            )
    elif recent_complaints >= 2 and partner.is_platform_verified:
        # Downgrade tier
        partner.is_platform_verified = False
        db.session.commit()
        for admin in admins:
            NotificationService.notify(
                admin.id, "trust_downgraded",
                f"Delivery partner {partner.name}-à¦à¦° Platform Verified status à¦¬à¦¾à¦¤à¦¿à¦² à¦•à¦°à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡ (à§¨à¦Ÿà¦¾ complaint)à¥¤"
            )
    else:
        db.session.commit()


# ------------------------------------------------------------------
#  Notifications  (Feature 5)
# ------------------------------------------------------------------

def run_auto_cancel_checks():
    from datetime import datetime, timedelta
    from app.models import Order, Shop, Notification, WalletTransaction, User
    
    # Orders pending for more than 5 minutes
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    ignored_orders = Order.query.filter(Order.status == 'pending', Order.created_at < cutoff).all()
    
    for o in ignored_orders:
        o.status = 'cancelled'
        
        shop = db.session.get(Shop, o.shop_id)
        if shop:
            shop.is_active = False
            notif_seller = Notification(user_id=shop.owner_id, event_type="shop_offline", message=f"Your shop was taken offline because you did not accept Order #{o.id} within 5 minutes.")
            db.session.add(notif_seller)
            
        if o.payment_method == "online":
            buyer = db.session.get(User, o.user_id)
            if buyer:
                buyer.wallet_balance += o.total_amount
                txn = WalletTransaction(order_id=o.id, from_type="platform", from_id=1, to_type="user", to_id=buyer.id, amount=o.total_amount, transaction_type="refund")
                db.session.add(txn)
                
        notif_buyer = Notification(user_id=o.user_id, event_type="order_cancelled", message=f"Order #{o.id} was cancelled because the shop did not respond.")
        db.session.add(notif_buyer)

    # Orders awaiting buyer for more than 10 minutes (approx created_at + 15 mins)
    cutoff_buyer = datetime.utcnow() - timedelta(minutes=15)
    stuck_buyer_orders = Order.query.filter(Order.status == 'awaiting_buyer_decision', Order.created_at < cutoff_buyer).all()
    
    for o in stuck_buyer_orders:
        o.status = 'cancelled'
        if o.payment_method == "online":
            buyer = db.session.get(User, o.user_id)
            if buyer:
                buyer.wallet_balance += o.total_amount
                txn = WalletTransaction(order_id=o.id, from_type="platform", from_id=1, to_type="user", to_id=buyer.id, amount=o.total_amount, transaction_type="refund")
                db.session.add(txn)
                
        db.session.add(Notification(user_id=o.user_id, event_type="order_cancelled", message=f"Order #{o.id} cancelled (You didn't confirm partial order)."))
        shop = db.session.get(Shop, o.shop_id)
        if shop:
            db.session.add(Notification(user_id=shop.owner_id, event_type="order_cancelled", message=f"Order #{o.id} cancelled (Buyer didn't confirm)."))
        
    if ignored_orders or stuck_buyer_orders:
        db.session.commit()

@user_bp.route("/notifications", methods=["GET"])
@role_required("user", "seller", "delivery", "admin")
def get_notifications():
    page = int(request.args.get('page', 1))
    paginated = Notification.query.filter_by(user_id=current_user.id).order_by(
        Notification.created_at.desc()
    ).paginate(page=page, per_page=20, error_out=False)
    
    return jsonify({
        "notifications": [n.to_dict() for n in paginated.items],
        "page": paginated.page,
        "pages": paginated.pages,
        "has_next": paginated.has_next
    }), 200


@user_bp.route("/notifications/<int:notif_id>/read", methods=["PATCH"])
@role_required("user", "seller", "delivery", "admin")
def mark_notification_read(notif_id):
    notif = db.session.get(Notification, notif_id)
    if not notif or notif.user_id != current_user.id:
        return jsonify({"error": "Notification not found."}), 404

    notif.is_read = True
    db.session.commit()
    return jsonify({"message": "Marked as read.", "notification": notif.to_dict()}), 200



@user_bp.route("/orders/<int:order_id>/confirm-partial", methods=["POST"])
@role_required("user")
def confirm_partial(order_id):
    from app.models import Order, OrderItem, Shop, Notification, WalletTransaction
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order or order.user_id != current_user.id:
        return jsonify({"error": "Order not found"}), 404
        
    if order.status != "awaiting_buyer_decision":
        return jsonify({"error": "Order not in partial state"}), 400
        
    data = request.get_json() or {}
        
    # Recalculate totals based on available items
    items = OrderItem.query.filter_by(order_id=order.id).all()
    new_total = 0.0
    for i in items:
        if i.is_available:
            new_total += i.subtotal
            
    old_total = order.total_amount
    order.items_total = new_total
    
    # Re-apply discount logic
    total_discount = 0.0
    from app.models import Offer
    active_offers = Offer.query.filter_by(shop_id=order.shop_id, is_active=True).all()
    temp_delivery_charge = order.delivery_charge
    for offer in active_offers:
        if offer.threshold_amount and order.items_total >= offer.threshold_amount:
            if offer.offer_type == "free_delivery_threshold":
                if temp_delivery_charge > 0:
                    total_discount += temp_delivery_charge
                    temp_delivery_charge = 0.0
            elif offer.offer_type == "cart_discount_threshold":
                total_discount += offer.discount_value
                
    order.total_amount = order.items_total + order.delivery_charge + order.cod_fee - total_discount
    if order.total_amount < 0: order.total_amount = 0.0
    
    refund_amount = old_total - order.total_amount
    
    buyer_lat = data.get("lat")
    buyer_lng = data.get("lng")
    if buyer_lat and buyer_lng:
        current_user.lat = safe_float(buyer_lat)
        current_user.lng = safe_float(buyer_lng)

    order.status = "confirmed"
    
    # Refund the difference if online
    if order.payment_method == "online" and refund_amount > 0:
        locked_user = db.session.query(User).with_for_update().get(current_user.id)
        locked_user.wallet_balance += refund_amount
        txn = WalletTransaction(
            order_id=order.id, from_type="platform", from_id=1,
            to_type="user", to_id=current_user.id, amount=refund_amount,
            transaction_type="partial_refund", reason=f"Partial refund for missing items"
        )
        db.session.add(txn)
        
    shop = db.session.get(Shop, order.shop_id)
    if shop:
        db.session.add(Notification(user_id=shop.owner_id, event_type="order_accepted", message=f"Buyer confirmed partial Order #{order.id}. Please prepare it."))
        
    db.session.commit()
    return jsonify({"message": "Partial order confirmed!"}), 200

@user_bp.route("/orders/<int:order_id>/reject-partial", methods=["POST"])
@role_required("user")
def reject_partial(order_id):
    from app.models import Order, Shop, Notification, WalletTransaction
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order or order.user_id != current_user.id:
        return jsonify({"error": "Order not found"}), 404
        
    if order.status != "awaiting_buyer_decision":
        return jsonify({"error": "Order not in partial state"}), 400
        
    order.status = "cancelled"
    
    if order.payment_method == "online":
        locked_user = db.session.query(User).with_for_update().get(current_user.id)
        locked_user.wallet_balance += order.total_amount
        txn = WalletTransaction(order_id=order.id, from_type="platform", from_id=1, to_type="user", to_id=current_user.id, amount=order.total_amount, transaction_type="refund")
        db.session.add(txn)
        
    shop = db.session.get(Shop, order.shop_id)
    if shop:
        db.session.add(Notification(user_id=shop.owner_id, event_type="order_cancelled", message=f"Buyer rejected partial Order #{order.id}."))
        
    db.session.commit()
    return jsonify({"message": "Partial order rejected and cancelled."}), 200


@user_bp.route("/wallet/withdraw", methods=["POST"])
@role_required("seller", "delivery")
def request_withdrawal():
    data = request.get_json() or {}
    amount = safe_float(data.get("amount", 0))
    payment_details = data.get("payment_details", "").strip()
    
    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400
    if not payment_details:
        return jsonify({"error": "Payment details required (e.g. bKash 017...)"}), 400
        
    user = db.session.query(User).with_for_update().get(current_user.id)
    if user.wallet_balance < amount:
        return jsonify({"error": "Insufficient wallet balance"}), 400
        
    # Deduct amount instantly to hold it in escrow/pending
    user.wallet_balance -= amount
    
    from app.models import WithdrawalRequest, WalletTransaction
    req = WithdrawalRequest(user_id=user.id, amount=amount, payment_details=payment_details)
    db.session.add(req)
    
    # Log transaction
    txn = WalletTransaction(
        uid="WTH-" + user.uid[-6:],
        from_type="user", from_id=user.id,
        to_type="platform", to_id=1,
        amount=amount,
        transaction_type="withdrawal_hold"
    )
    db.session.add(txn)
    
    db.session.commit()
    return jsonify({"message": "Withdrawal requested successfully.", "new_balance": user.wallet_balance}), 201


@user_bp.route("/orders/<int:order_id>/rate", methods=["POST"])
@role_required("user")
def rate_order(order_id):
    from app.models import Order
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order or order.user_id != current_user.id:
        return jsonify({"error": "Order not found"}), 404
        
    if order.status != "delivered":
        return jsonify({"error": "You can only rate delivered orders."}), 400
        
    if order.seller_rating or order.delivery_rating:
        return jsonify({"error": "You have already rated this order."}), 400
        
    data = request.get_json() or {}
    seller_rating = data.get("seller_rating")
    delivery_rating = data.get("delivery_rating")
    comment = data.get("comment", "")
    
    if not seller_rating and not delivery_rating:
        return jsonify({"error": "Please provide at least one rating."}), 400
        

    if seller_rating:
        sr = int(seller_rating)
        if not (1 <= sr <= 10): return jsonify({"error": "Rating must be between 1 and 10."}), 400
        order.seller_rating = sr
    if delivery_rating:
        dr = int(delivery_rating)
        if not (1 <= dr <= 10): return jsonify({"error": "Rating must be between 1 and 10."}), 400
        order.delivery_rating = dr

    order.rating_comment = comment
    
    db.session.commit()
    return jsonify({"message": "Thank you for your feedback!"}), 200


# ------------------------------------------------------------------
#  Wishlist
# ------------------------------------------------------------------
@user_bp.route("/wishlist", methods=["GET"])
@role_required("user")
def get_wishlist():
    from app.models import WishlistItem
    from sqlalchemy.orm import joinedload
    items = WishlistItem.query.options(joinedload(WishlistItem.product).joinedload(Product.global_item)).filter_by(user_id=current_user.id).all()
    return jsonify({"wishlist": [item.to_dict() for item in items]}), 200

@user_bp.route("/wishlist/<int:product_id>", methods=["POST"])
@role_required("user")
def toggle_wishlist(product_id):
    from app.models import WishlistItem, Product
    product = db.session.get(Product, product_id)
    if not product: return jsonify({"error": "Product not found"}), 404
    
    item = WishlistItem.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if item:
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Removed from wishlist", "is_wishlisted": False}), 200
    else:
        new_item = WishlistItem(user_id=current_user.id, product_id=product_id)
        db.session.add(new_item)
        db.session.commit()
        return jsonify({"message": "Added to wishlist", "is_wishlisted": True}), 201



@user_bp.route("/notifications/read-all", methods=["PATCH"])
@role_required("user", "seller", "delivery", "admin")
def mark_all_notifications_read():
    db.session.query(Notification).filter_by(user_id=current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200

@user_bp.route("/notifications/unread-count", methods=["GET"])
@role_required("user", "seller", "delivery", "admin")
def get_unread_count():
    count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
    return jsonify({"unread_count": count}), 200


@user_bp.route("/orders/<int:order_id>/tracking", methods=["GET"])
@jwt_required()
def get_order_tracking(order_id):
    from app.models import Order, User, Shop
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    is_buyer = order.user_id == current_user.id
    is_admin = current_user.role == "admin"
    is_seller = order.shop.owner_id == current_user.id if order.shop else False
    
    if not (is_buyer or is_admin or is_seller):
        return jsonify({"error": "Unauthorized"}), 403
    
    if order.status not in ["picked_up", "pending_redelivery"]:
        return jsonify({"error": "Tracking not available for this status"}), 400
        
    partner = db.session.get(User, order.delivery_partner_id)
    shop = db.session.get(Shop, order.shop_id)
    
    return jsonify({
        "order_status": order.status,
        "delivery_boy": {
            "name": partner.name if partner else "Unknown",
            "lat": partner.lat if partner else None,
            "lng": partner.lng if partner else None
        },
        "shop": {
            "name": shop.name if shop else "Unknown",
            "address": shop.address if shop else ""
        }
    }), 200

@user_bp.route("/wallet/topup", methods=["POST"])
@role_required("user")
def user_wallet_topup():
    data = request.get_json() or {}
    amount = safe_float(data.get("amount", 0))
    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400
        
    user = db.session.query(User).with_for_update().get(current_user.id)
    user.wallet_balance += amount
    
    from app.models import WalletTransaction
    # Log transaction
    txn = WalletTransaction(
        from_type="system",
        to_type="user",
        to_id=user.id,
        amount=amount,
        transaction_type="mock_topup"
    )
    db.session.add(txn)
    db.session.commit()
    
    return jsonify({"message": f"Successfully added ?{amount} to wallet", "balance": user.wallet_balance}), 200
# ------------------------------------------------------------------
#  Confirm Self Delivery (Buyer) (Bug 3)
# ------------------------------------------------------------------
@user_bp.route("/orders/<int:order_id>/confirm-self-delivery", methods=["POST"])
@role_required("user")
def confirm_self_delivery(order_id):
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order or order.user_id != current_user.id:
        return jsonify({"error": "Order not found."}), 404

    if order.delivery_type != "self_delivery":
        return jsonify({"error": "This is not a self-delivery order."}), 400

    if order.status != "picked_up":
        return jsonify({"error": "Order is not marked as picked_up by the shop yet."}), 400

    order.status = "delivered"
    shop = db.session.get(Shop, order.shop_id)

    if order.payment_method == "online":
        order.shop_payment_claimed = False
        from app.models import Notification
        db.session.add(Notification(
            user_id=shop.owner_id,
            event_type="order_delivered",
            related_id=order.id,
            message=f"Order #{order.id} is confirmed delivered! Click 'Receive Payment' to get \u09f3{order.items_total}."
        ))

    db.session.commit()
    
    NotificationService.notify(shop.owner_id, "order_delivered", f"Customer has confirmed delivery of Order #{order.id}.")
    return jsonify({"message": "Delivery confirmed successfully.", "order": order.to_dict()}), 200

