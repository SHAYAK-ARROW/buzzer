import codecs
import re

c = codecs.open('app/routes/user.py', 'r', 'utf-8').read()

new_validations = '''    if not shop.is_active:
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
'''

if 'Advanced Offline Check' not in c:
    c = re.sub(
        r'if not shop\.is_active:\s+return jsonify\(\{"error": "Shop is currently closed\. You cannot place orders at this time\."\}\), 400',
        new_validations,
        c
    )

with codecs.open('app/routes/user.py', 'w', 'utf-8') as f:
    f.write(c)

print('Successfully injected using regex!')
