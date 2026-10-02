from app.utils import safe_float
"""
Delivery partner routes.

Prefix: /api/delivery
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import current_user

from app import db
from app.auth_helpers import role_required
from app.models import Order, WalletTransaction, Shop, User
from app.notifications import NotificationService
from datetime import datetime, timedelta

delivery_bp = Blueprint("delivery", __name__)

@delivery_bp.route("/status", methods=["PATCH"])
@role_required("delivery")
def toggle_status():
    data = request.get_json() or {}
    user = db.session.get(User, current_user.id)
    user.is_active = data.get("is_active", True)
    db.session.commit()
    return jsonify({"message": f"Status updated.", "is_active": user.is_active}), 200


# ------------------------------------------------------------------
#  Drop/Release Order (ONLY before pickup â€” blocked after)
# ------------------------------------------------------------------
@delivery_bp.route("/orders/<int:order_id>/drop", methods=["POST"])
@role_required("delivery")
def drop_order(order_id):
    """Delivery boy can drop an order ONLY if they haven't picked it up yet."""
    order = db.session.query(Order).with_for_update().get(order_id)

    if not order or order.delivery_partner_id != current_user.id:
        return jsonify({"error": "Order not found."}), 404

    if order.status == "picked_up":
        return jsonify({"error": "You cannot drop this order â€” you have already picked it up. Contact admin if there is an issue."}), 403

    if order.status not in ["delivery_partner_assigned"]:
        return jsonify({"error": f"Cannot drop order in status '{order.status}'."}), 400

        # Penalty for dropping order (5 Taka)
    from app.models import Notification, WalletTransaction
    penalty_amount = round(order.total_amount * 0.10, 2)
    current_user.wallet_balance -= penalty_amount
    txn = WalletTransaction(
        order_id=order.id,
        from_type="delivery_partner",
        from_id=current_user.id,
        to_type="platform",
        to_id=1,
        amount=penalty_amount,
        transaction_type="penalty_drop_order"
    )
    db.session.add(txn)
    
    dp_notif = Notification(user_id=current_user.id, event_type="penalty", message=f"A penalty of à§³{penalty_amount} has been deducted from your wallet for dropping Order #{order.id}.")
    db.session.add(dp_notif)

    # Release the order back to the open pool
    order.delivery_partner_id = None
    order.status = "ready"
    order.locked_deposit_percentage = None
    db.session.commit()

    # Notify seller & buyer
    from app.models import Notification
    shop = db.session.query(Shop).with_for_update().get(order.shop_id)
    if shop:
        n = Notification(user_id=shop.owner_id, event_type="order_rejected",
                         message=f"The delivery partner rejected Order #{order.id} before pickup. It is back in the pool.")
        db.session.add(n)
        
    n2 = Notification(user_id=order.user_id, event_type="delivery_update",
                      message=f"The assigned delivery boy was unable to fulfill your order. It is being reassigned to a new delivery partner.")
    db.session.add(n2)
    db.session.commit()

    return jsonify({"message": "Order rejected. It is back in the open pool."}), 200


# ------------------------------------------------------------------
#  Available Orders  (Feature 2 â€” exclude self_delivery)
# ------------------------------------------------------------------

@delivery_bp.route("/stats", methods=["GET"])
@role_required("delivery")
def delivery_stats():
    from sqlalchemy import func
    from datetime import datetime, timedelta
    from app.models import Order
    import calendar
    
    day_str = request.args.get('day')      # YYYY-MM-DD
    month_str = request.args.get('month')  # YYYY-MM
    
    today = datetime.utcnow().date()
    
    # Process Day
    target_day = today
    if day_str:
        try:
            target_day = datetime.strptime(day_str, '%Y-%m-%d').date()
        except:
            pass
            
    # Process Month
    target_month_year = today.year
    target_month_month = today.month
    if month_str:
        try:
            target_month_year = int(month_str.split('-')[0])
            target_month_month = int(month_str.split('-')[1])
        except:
            pass

    # Earnings for target day
    earned_day = db.session.query(func.sum(Order.delivery_charge)).filter(
        Order.delivery_partner_id == current_user.id, Order.status == 'delivered', func.date(Order.updated_at) == target_day
    ).scalar() or 0.0

    # Earnings for target month
    start_of_month = datetime(target_month_year, target_month_month, 1).date()
    last_day_int = calendar.monthrange(target_month_year, target_month_month)[1]
    end_of_month = datetime(target_month_year, target_month_month, last_day_int).date()
    
    earned_month = db.session.query(func.sum(Order.delivery_charge)).filter(
        Order.delivery_partner_id == current_user.id, Order.status == 'delivered', func.date(Order.updated_at) >= start_of_month, func.date(Order.updated_at) <= end_of_month
    ).scalar() or 0.0

    # All time earned
    earned_all_time = db.session.query(func.sum(Order.delivery_charge)).filter(
        Order.delivery_partner_id == current_user.id, Order.status == 'delivered'
    ).scalar() or 0.0
    
    # --- PIE CHART (Daily Context) ---
    query_day = Order.query.filter_by(delivery_partner_id=current_user.id).filter(
        func.date(Order.updated_at) == target_day
    )
    successful_count = query_day.filter(Order.status == 'delivered').count()
    failed_count = query_day.filter(Order.status == 'attempt_failed').count()
    dropped_count = query_day.filter(Order.status == 'cancelled').count()
    # Active is always currently active, regardless of date, or active assigned on that day.
    # We will use currently active.
    active_count = query_day.filter(
        Order.status.in_(['picked_up', 'delivery_partner_assigned'])
    ).count()

    # --- LINE CHART (Monthly Context) ---
    chart_labels = []
    platform_total_data = []
    boy_taken_data = []
    boy_success_data = []
    boy_dropped_data = []
    
    # Determine up to what day to loop (either last day of month, or today if it's current month)
    # The user asked for "month's 1st to current date" but usually it's just the whole month range
    loop_end_day = last_day_int
    if today.year == target_month_year and today.month == target_month_month:
        loop_end_day = today.day

    # Instead of doing 30 queries, let's just group by date (much faster!)
    # But since SQLite might not have complex group by, we can just do a loop if it's small (max 31).
    for i in range(1, loop_end_day + 1):
        d = datetime(target_month_year, target_month_month, i).date()
        chart_labels.append(str(i))
        
        # 1. Total platform deliveries (status=delivered, any delivery boy)
        pt = db.session.query(func.count(Order.id)).filter(func.date(Order.updated_at) == d, Order.delivery_partner_id.isnot(None)).scalar() or 0
        platform_total_data.append(pt)
        
        # 2. Boy Taken (assigned to him on that day, regardless of current status, assuming updated_at reflects it)
        bt = db.session.query(func.count(Order.id)).filter(
            Order.delivery_partner_id == current_user.id, func.date(Order.updated_at) == d
        ).scalar() or 0
        boy_taken_data.append(bt)
        
        # 3. Boy Success
        bs = db.session.query(func.count(Order.id)).filter(
            Order.delivery_partner_id == current_user.id, Order.status == 'delivered', func.date(Order.updated_at) == d
        ).scalar() or 0
        boy_success_data.append(bs)
        
        # 4. Boy Dropped
        bd = db.session.query(func.count(Order.id)).filter(
            Order.delivery_partner_id == current_user.id, Order.status == 'cancelled', func.date(Order.updated_at) == d
        ).scalar() or 0
        boy_dropped_data.append(bd)

    return jsonify({
        "day_earned": float(earned_day),
        "month_earned": float(earned_month),
        "all_time_earned": float(earned_all_time),
        "successful_deliveries": successful_count,
        "failed_deliveries": failed_count,
        "dropped_orders": dropped_count,
        "active_orders": active_count,
        "monthly_chart": {
            "labels": chart_labels,
            "platform_total": platform_total_data,
            "boy_taken": boy_taken_data,
            "boy_success": boy_success_data,
            "boy_dropped": boy_dropped_data
        }
    }), 200

@delivery_bp.route("/available-orders", methods=["GET"])
@role_required("delivery")
def available_orders():
    """Orders that are 'ready' + instant_delivery + not yet claimed. (The Open Pool)"""
    if not current_user.is_approved:
        return jsonify({"error": "Your account is pending admin approval."}), 403

    from sqlalchemy.orm import joinedload
    page = int(request.args.get('page', 1))
    paginated = Order.query.options(
        joinedload(Order.shop),
        joinedload(Order.customer)
    ).filter_by(
        status="ready",
        delivery_type="instant_delivery",
        delivery_partner_id=None,
    ).order_by(Order.ready_at.asc()).paginate(page=page, per_page=20, error_out=False)
    orders = paginated.items

    # Pre-fetch all shop IDs where this user is a ShopTrustedPartner
    from app.models import ShopTrustedPartner
    trusted_shop_links = ShopTrustedPartner.query.filter_by(delivery_partner_id=current_user.id).all()
    shop_trusted_ids = {link.shop_id for link in trusted_shop_links}

    result = []
    now = datetime.utcnow()
    
    for o in orders:
        # If ready_at is missing for some reason, treat it as ready now
        ready_time = o.ready_at or o.updated_at or now
        seconds_since_ready = (now - ready_time).total_seconds()
        
        # Determine visibility based on tier
        if current_user.is_platform_verified:
            # Tier 1: Sees instantly (0 seconds)
            can_see = True
            trust_tier = "Tier 1: Platform Verified"
            required_pct = 0.75
        elif o.shop_id in shop_trusted_ids:
            # Tier 2: Shop Trusted sees after 10 seconds
            can_see = seconds_since_ready >= 10
            trust_tier = "Tier 2: Shop Trusted"
            required_pct = 0.90
        else:
            # Tier 3: General delivery boys see after 30 seconds
            can_see = seconds_since_ready >= 30
            trust_tier = "Tier 3: General Pool"
            required_pct = 1.20

        if not can_see:
            continue

        shop = o.shop
        
        # Calculate distance if we have both coordinates
        dist = 0.0
        try:
            if current_user.current_latitude and shop.lat:
                from app.geo_utils import haversine
                dist = haversine(
                    current_user.current_latitude, current_user.current_longitude,
                    shop.lat, shop.lng
                )
        except Exception:
            pass

        # We don't expose customer details until accepted
        result.append({
            "distance_km": dist,
            "id": o.id,
            "shop_name": shop.name,
            "shop_category": shop.shop_category,
            "shop_address": shop.address,
            "shop_lat": shop.lat,
            "shop_lng": shop.lng,
            "buyer_lat": o.customer.current_latitude if o.customer else None,
            "buyer_lng": o.customer.current_longitude if o.customer else None,
            "payment_mode": shop.payment_mode,
            "items_total": o.items_total,
            "delivery_charge": o.delivery_charge,
            "cod_fee": o.cod_fee,
            "is_cash_on_delivery": o.is_cash_on_delivery,
            "total_amount": o.total_amount,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "ready_at": o.ready_at.isoformat() if o.ready_at else None,
            "trust_tier": trust_tier,
            "required_deposit_percentage": required_pct,
        })

    return jsonify({"orders": result, "page": paginated.page, "pages": paginated.pages}), 200


# ------------------------------------------------------------------
#  Accept Order  (Feature 1 â€” wallet balance check)
# ------------------------------------------------------------------
@delivery_bp.route("/orders/<int:order_id>/accept", methods=["POST"])
@role_required("delivery")
def accept_order(order_id):
    if not current_user.is_approved:
        return jsonify({"error": "Not approved"}), 403

    # Fix Zero-Day Bug: Race Condition. Use with_for_update() to lock the row.
    order = db.session.query(Order).with_for_update().get(order_id)
    if not order:
        return jsonify({"error": "Order not found."}), 404

    if order.status != "ready":
        return jsonify({"error": f"Cannot accept order in status '{order.status}'."}), 400

    if order.delivery_type != "instant_delivery":
        return jsonify({"error": "This order is self_delivery."}), 400

    if order.delivery_partner_id is not None:
        return jsonify({"error": "Order already accepted by another partner."}), 400

    shop = db.session.query(Shop).with_for_update().get(order.shop_id)

    # Calculate dynamic percentage based on trust tier
    if shop.payment_mode == "wallet_settlement":
        from app.models import ShopTrustedPartner
        if current_user.is_platform_verified:
            new_order_pct = 0.75
        else:
            is_shop_trusted = ShopTrustedPartner.query.filter_by(
                shop_id=shop.id,
                delivery_partner_id=current_user.id
            ).first() is not None
            new_order_pct = 0.90 if is_shop_trusted else 1.20

        new_order_lock = order.items_total * new_order_pct

        # Find all currently locked orders
        active_orders = Order.query.filter(
            Order.delivery_partner_id == current_user.id,
            Order.status.in_(["accepted", "delivery_partner_assigned", "picked_up", "pending_redelivery"])
        ).all()

        total_locked = 0.0
        for ao in active_orders:
            ao_shop = db.session.get(Shop, ao.shop_id)
            if ao_shop.payment_mode == "wallet_settlement":
                locked_pct = ao.locked_deposit_percentage or 1.20
                total_locked += ao.items_total * locked_pct

        required_total = total_locked + new_order_lock

        if required_total > current_user.wallet_balance:
            return jsonify({
                "error": f"Insufficient wallet balance! You need à§³{required_total:.2f} total security deposit for all your active orders. Currently locked: à§³{total_locked:.2f}, Needed for this order: à§³{new_order_lock:.2f}.",
                "required_total": required_total,
                "your_balance": current_user.wallet_balance,
            }), 400

        # Snapshot the percentage used
        order.locked_deposit_percentage = new_order_pct
    else:
        order.locked_deposit_percentage = 0.0

    order.delivery_partner_id = current_user.id
    order.status = "delivery_partner_assigned"
    db.session.commit()

    return jsonify({"message": "Order accepted! Please head to the shop to pick it up."}), 200


# ------------------------------------------------------------------
#  Mark Picked Up  (Delivery Boy picks up from shop)
# ------------------------------------------------------------------

from app.models import Complaint, OrderItem

@delivery_bp.route("/orders/<int:order_id>/confirm-pickup", methods=["POST"])
@role_required("delivery")
def confirm_pickup(order_id):
    order = db.session.query(Order).with_for_update().get(order_id)

    if not order or order.delivery_partner_id != current_user.id:
        return jsonify({"error": "Order not found."}), 404

    # Geofencing
    if current_user.lat and current_user.lng and order.shop.lat and order.shop.lng:
        import math
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371
            dLat = math.radians(lat2 - lat1)
            dLon = math.radians(lon2 - lon1)
            a = math.sin(dLat/2) * math.sin(dLat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2) * math.sin(dLon/2)
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c
        if haversine(current_user.lat, current_user.lng, order.shop.lat, order.shop.lng) > 0.5: # 500 meters
            return jsonify({"error": "You must be near the shop to confirm pickup."}), 403


    if order.status == "picked_up":
        return jsonify({"message": "Already picked up.", "order": order.to_dict()}), 200

    if order.status not in ["ready", "delivery_partner_assigned"]:
        return jsonify({"error": f"Cannot pick up from status '{order.status}'."}), 400

    data = request.get_json() or {}
    all_received = data.get("all_received", True)
    
    order.pickup_confirmed_at = datetime.utcnow()

    # ------------------------------------------------------------------
    # Cash Purchase Mode: Delivery partner pays shop IN CASH at pickup.
    # We must verify they have enough wallet balance for the security logic,
    # and we log a WalletTransaction to record this physical cash payment.
    # ------------------------------------------------------------------
    shop = db.session.query(Shop).with_for_update().get(order.shop_id)
    if shop and shop.payment_mode == "cash_purchase" and order.payment_method == "cod":
        # For cash_purchase: delivery partner physically gives cash to shop.
        # Their wallet balance must cover items_total (they're "buying" the goods).
        if current_user.wallet_balance < order.items_total:
            return jsonify({
                "error": f"Insufficient wallet balance for Cash Purchase mode. "
                         f"You need à§³{order.items_total:.2f} to purchase from shop at pickup. "
                         f"Your balance: à§³{current_user.wallet_balance:.2f}. "
                         f"Please top up your wallet first."
            }), 400

        # Deduct from delivery partner wallet, credit shop wallet (reflecting cash payment)
        delivery_partner = db.session.query(User).with_for_update().get(current_user.id)
        delivery_partner.wallet_balance -= order.items_total
        shop.wallet_balance += order.items_total

        txn = WalletTransaction(
            order_id=order.id,
            from_type="delivery_partner",
            from_id=current_user.id,
            to_type="shop",
            to_id=shop.id,
            amount=order.items_total,
            transaction_type="cash_purchase_pickup"
        )
        db.session.add(txn)

    if all_received:
        order.status = "picked_up"
        notif_msg = f"Your order #{order.id} has been picked up and is on the way!"
        notif_type = "order_picked_up"
    else:
        order.status = "awaiting_shortage_approval"
        
        shortages = data.get("shortages", [])
        for shortage in shortages:
            item = db.session.get(OrderItem, shortage["order_item_id"])
            if item and item.order_id == order.id:
                # Store the requested shortage temporarily in quantity_received_at_pickup
                item.quantity_received_at_pickup = shortage["quantity_received"]
        
        notif_msg = f"Delivery boy reported a shortage for Order #{order.id}. Please approve it to release the order."
        notif_type = "shortage_approval_needed"
        db.session.commit()
        NotificationService.notify(shop.owner_id, notif_type, notif_msg)
        return jsonify({"message": "Shortage reported. Awaiting shop approval.", "order": order.to_dict()}), 200

    db.session.commit()
    NotificationService.notify(order.user_id, notif_type, notif_msg)
    
    return jsonify({"message": "Pickup confirmed.", "order": order.to_dict()}), 200

def record_shop_shortage_complaint(shop_id, order_id, shortages):
    from app.models import User
    # Create generic shop_shortage complaint
    c = Complaint(
        order_id=order_id,
        user_id=current_user.id,
        complaint_type="shop_shortage"
    )
    db.session.add(c)
    db.session.flush()

    shop = db.session.get(Shop, shop_id)
    if not shop: return

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_count = Complaint.query.join(Order).filter(
        Order.shop_id == shop_id,
        Complaint.complaint_type == "shop_shortage",
        Complaint.created_at >= thirty_days_ago
    ).count()

    shop.pickup_shortage_count_30d = recent_count

    if recent_count >= 3:
        # Flag for Admin Review (Do NOT auto-suspend to prevent malicious shortage report DoS)
        admins = User.query.filter_by(role="admin", is_deleted=False).all()
        for admin in admins:
            NotificationService.notify(
                admin.id, "shop_flagged_shortage",
                f"ALERT: Shop '{shop.name}' (ID: {shop.id}) has {recent_count} pickup shortage reports within 30 days. Please review and investigate."
            )
# ------------------------------------------------------------------
#  Mark Delivered  (Feature 1 â€” wallet settlement)
# ------------------------------------------------------------------
@delivery_bp.route("/orders/<int:order_id>/delivered", methods=["PATCH"])
@role_required("delivery")
def mark_delivered(order_id):
    from app.models import Notification
    order = db.session.query(Order).with_for_update().get(order_id)

    if not order or order.delivery_partner_id != current_user.id:
        return jsonify({"error": "Order not found."}), 404

    if order.status == "delivered":
        return jsonify({"message": "Already delivered.", "order": order.to_dict()}), 200

    if order.status != "picked_up":
        return jsonify({"error": f"Cannot deliver from status '{order.status}'."}), 400

    shop = db.session.query(Shop).with_for_update().get(order.shop_id)
    earnings = order.delivery_charge + order.cod_fee

    if order.payment_method == "online":
        # Online Payment: Delivery boy gets earnings. Shop money stays in Platform Escrow.
        delivery_partner = db.session.query(User).with_for_update().get(current_user.id)
        delivery_partner.wallet_balance += order.delivery_charge
        
        txn_dp = WalletTransaction(
            order_id=order.id, from_type="platform", from_id=1,
            to_type="delivery_partner", to_id=current_user.id,
            amount=order.delivery_charge, transaction_type="online_settlement",
            description=f"Delivery charge earnings for Order #{order.id}",
            balance_after=delivery_partner.wallet_balance
        )
        db.session.add(txn_dp)
        
        settlement_msg = "Online Payment settled."
        settlement_info = {
            "mode": "online",
            "items_total_held_in_escrow": order.items_total,
            "your_earnings_credited": order.delivery_charge,
            "your_new_wallet_balance": delivery_partner.wallet_balance,
        }
        
        # Notify shop to claim payment
        db.session.add(Notification(
            user_id=shop.owner_id, event_type="order_delivered", related_id=order.id,
            message=f"Order #{order.id} is delivered! Click 'Receive Payment' to get &#2547; {order.items_total}."
        ))
        
    else:
        # COD Payment
        if shop.payment_mode == "wallet_settlement":
            # DP owes platform for collected cash. Deduct from DP, keep in platform escrow.
            delivery_partner = db.session.query(User).with_for_update().get(current_user.id)
            delivery_partner.wallet_balance -= order.items_total

            txn = WalletTransaction(
                order_id=order.id,
                from_type="delivery_partner",
                from_id=current_user.id,
                to_type="platform",
                to_id=1,
                amount=order.items_total,
                transaction_type="cod_escrow",
                description=f"COD cash collected for Order #{order.id} (held for shop)",
                balance_after=delivery_partner.wallet_balance
            )
            db.session.add(txn)
            settlement_msg = "Wallet settled automatically."
            settlement_info = {
                "mode": "wallet_settlement",
                "items_total_deducted_for_escrow": order.items_total,
                "your_earnings": earnings,
                "your_new_wallet_balance": delivery_partner.wallet_balance,
            }
            
            # Notify shop to claim payment
            db.session.add(Notification(
                user_id=shop.owner_id, event_type="order_delivered", related_id=order.id,
                message=f"Order #{order.id} is delivered! Click 'Receive Payment' to get &#2547; {order.items_total}."
            ))
            
        else:
            # cash_purchase mode: Delivery boy already paid shop in cash at pickup.
            settlement_msg = "Cash already paid to shop at pickup."
            order.shop_payment_claimed = True
            settlement_info = {
                "mode": "cash_purchase",
                "note": "You paid the shop in cash at pickup. No wallet deduction.",
                "your_earnings": earnings,
                "your_wallet_balance": db.session.query(User).with_for_update().get(current_user.id).wallet_balance,
            }

    order.status = "delivered"
    db.session.commit()

    NotificationService.notify(
        order.user_id, "order_delivered",
        f"Order #{order.id} (UID: {order.uid}) has been delivered successfully!"
    )
    db.session.commit()

    return jsonify({
        "message": f"Order delivered! {settlement_msg}",
        "order": order.to_dict(),
        "settlement": settlement_info,
    }), 200
# ------------------------------------------------------------------
#  Attempt Failed  (Feature 6)
# ------------------------------------------------------------------
@delivery_bp.route("/orders/<int:order_id>/attempt-failed", methods=["PATCH"])
@role_required("delivery")
def delivery_attempt_failed(order_id):
    order = db.session.query(Order).with_for_update().get(order_id)

    if not order or order.delivery_partner_id != current_user.id:
        return jsonify({"error": "Order not found."}), 404

    if order.status != "picked_up":
        return jsonify({"error": f"Cannot mark attempt failed from status '{order.status}'."}), 400

    order.delivery_attempt_failed = True
    order.status = "pending_redelivery"
    db.session.commit()

    return jsonify({"message": "Delivery attempt marked as failed. Pending redelivery.",
                    "order": order.to_dict()}), 200

# ------------------------------------------------------------------
#  Return to Shop (Fixes Cash Purchase Deadlock)
# ------------------------------------------------------------------
# @delivery_bp.route("/orders/<int:order_id>/return-to-shop", methods=["POST"])
# @role_required("delivery")
# def return_to_shop(order_id):
#     order = db.session.query(Order).with_for_update().get(order_id)
# 
#     if not order or order.delivery_partner_id != current_user.id:
#         return jsonify({"error": "Order not found."}), 404
# 
#     if order.status not in ["pending_redelivery", "picked_up"]:
#         return jsonify({"error": f"Cannot return order from status '{order.status}'."}), 400
# 
#     shop = db.session.query(Shop).with_for_update().get(order.shop_id)
#     
#     # If it was a cash purchase, the delivery boy paid their own cash. 
#     # We must reimburse their virtual wallet and deduct the shop's virtual wallet.
#     refund_msg = ""
#     if shop and shop.payment_mode == "cash_purchase" and order.payment_method == "cod":
#         current_user.wallet_balance += order.items_total
#         shop.wallet_balance -= order.items_total
#         
#         txn = WalletTransaction(
#             order_id=order.id,
#             from_type="shop",
#             from_id=shop.id,
#             to_type="delivery_partner",
#             to_id=current_user.id,
#             amount=order.items_total,
#             transaction_type="cash_purchase_return_refund"
#         )
#         db.session.add(txn)
#         refund_msg = f" Your wallet has been refunded  3{order.items_total}."
#     
#     order.status = "cancelled_returned"
#     order.delivery_partner_id = None # Release the partner
#     db.session.commit()
#     
#     NotificationService.notify(
#         shop.owner_id, "order_returned",
#         f"Order #{order.id} was returned by the delivery boy. Please collect the physical items."
#     )
#     
#     return jsonify({
#         "message": f"Order marked as Returned to Shop.{refund_msg}",
#         "order": order.to_dict()
#     }), 200
# 
# 
# 
# ------------------------------------------------------------------
#  My Orders (delivery partner's assigned orders)
# ------------------------------------------------------------------
@delivery_bp.route("/orders", methods=["GET"])
@role_required("delivery")
def my_delivery_orders():
    from sqlalchemy.orm import joinedload
    
    # Active orders first, then last 50 completed/cancelled
    active_orders = Order.query.options(
        joinedload(Order.shop),
        joinedload(Order.customer),
        joinedload(Order.delivery_partner),
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(
        Order.delivery_partner_id == current_user.id,
        Order.status.in_(["delivery_partner_assigned", "picked_up", "pending_redelivery"])
    ).order_by(Order.created_at.desc()).all()

    page = int(request.args.get('page', 1))
    paginated = Order.query.options(
        joinedload(Order.shop),
        joinedload(Order.customer),
        joinedload(Order.delivery_partner),
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(
        Order.delivery_partner_id == current_user.id,
        Order.status.in_(["delivered", "cancelled", "attempt_failed"])
    ).order_by(Order.created_at.desc()).paginate(page=page, per_page=20, error_out=False)
    past_orders = paginated.items

    all_orders = active_orders + past_orders
    return jsonify({"orders": [o.to_dict() for o in all_orders]}), 200


# ------------------------------------------------------------------
#  Delivery Wallet  (Feature 1)
# ------------------------------------------------------------------
@delivery_bp.route("/wallet", methods=["GET"])
@role_required("delivery")
def delivery_wallet():
    # Transactions where this user is involved (from or to), last 100
    page = int(request.args.get('page', 1))
    paginated = WalletTransaction.query.filter(
        db.or_(
            db.and_(WalletTransaction.from_type == "delivery_partner",
                    WalletTransaction.from_id == current_user.id),
            db.and_(WalletTransaction.to_type == "delivery_partner",
                    WalletTransaction.to_id == current_user.id),
        )
    ).order_by(WalletTransaction.created_at.desc()).paginate(page=page, per_page=20, error_out=False)
    transactions = paginated.items

    return jsonify({
        "wallet_balance": current_user.wallet_balance,
        "transactions": [t.to_dict() for t in transactions],
        "page": paginated.page, "pages": paginated.pages
    }), 200



@delivery_bp.route("/location", methods=["POST"])
@role_required("delivery")
def update_location():
    data = request.get_json() or {}
    lat = data.get("lat")
    lng = data.get("lng")
    if lat is not None and lng is not None:
        current_user.lat = safe_float(lat)
        current_user.lng = safe_float(lng)
        db.session.commit()
        
        # Broadcast via WebSocket if there's an active order
        from app import socketio
        from app.models import Order
        active_order = Order.query.filter_by(
            delivery_partner_id=current_user.id, 
            status="picked_up"
        ).first()
        
        if active_order:
            socketio.emit("location_update", {
                "lat": safe_float(lat),
                "lng": safe_float(lng),
                "delivery_boy_name": current_user.name
            }, room=f"order_{active_order.id}")
            
    return jsonify({"message": "Location updated"}), 200
# # ------------------------------------------------------------------
# #  Settle COD Balance (Mock Gateway) (Bug 4)
# # ------------------------------------------------------------------
# @delivery_bp.route("/wallet/settle", methods=["POST"])
# @role_required("delivery")
# def settle_cod_balance():
#     data = request.get_json() or {}
#     amount = data.get("amount")
#     
#     if not amount or safe_float(amount) <= 0:
#         return jsonify({"error": "Invalid amount."}), 400
#         
#     amount = safe_float(amount)
#     
#     # In a real app, this would redirect to SSLCommerz/Stripe.
#     # Here we mock a successful payment to the platform.
#     
#     current_user.wallet_balance += amount
#     
#     txn = WalletTransaction(
#         from_type="delivery_partner",
#         from_id=current_user.id,
#         to_type="platform",
#         to_id=1,
#         amount=amount,
#         transaction_type="cod_debt_settlement_mock"
#     )
#     db.session.add(txn)
#     db.session.commit()
#     
#     NotificationService.notify(current_user.id, "wallet_settled", f"Successfully paid à§³{amount} to the platform. Your debt is cleared.")
#     
#     return jsonify({"message": f"Successfully settled à§³{amount}.", "wallet_balance": current_user.wallet_balance}), 200

