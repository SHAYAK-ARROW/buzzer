from flask import request
from flask_socketio import join_room, leave_room, emit, disconnect
from flask_jwt_extended import decode_token
from app import socketio, db
from app.models import User
import traceback
import functools

# -------------------------------------------------------------------
# Error Handling Decorator (Silent Failure Prevention)
# -------------------------------------------------------------------
def safe_socket_event(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            print(f"WebSocket Error in {f.__name__}: {traceback.format_exc()}")
            emit("server_error", {"message": "A technical error occurred on the server.", "details": str(e)})
    return wrapper

# -------------------------------------------------------------------
# Authentication & Connection
# -------------------------------------------------------------------
@socketio.on("connect")
@safe_socket_event
def handle_connect(auth):
    """
    Called when a client attempts to connect. 
    `auth` is a dictionary passed from the client containing the token.
    """
    token = auth.get('token') if auth else None
    
    if not token:
        # Check query string as fallback
        token = request.args.get('token')
        
    if not token:
        print("Connection rejected: No token provided.")
        return False  # Reject connection

    try:
        # Verify Token
        decoded_token = decode_token(token)
        user_id = int(decoded_token['sub'])
        
        from flask import session
        session['user_id'] = user_id

        # Join personal room
        room_name = f"user_{user_id}"
        join_room(room_name)
        print(f"Client connected and joined personal room: {room_name}")
        
        # If user is a delivery boy, they also join the global delivery room
        # We check role from decoded token (if we included it) or query DB.
        user = db.session.get(User, user_id)
        if user:
            session['user_role'] = user.role
        if user and user.role == "delivery":
            join_room("active_delivery_boys")
            print(f"Delivery boy joined global room: active_delivery_boys")
        
    except Exception as e:
        print(f"Connection rejected: Invalid token - {str(e)}")
        return False # Reject connection

@socketio.on("disconnect")
@safe_socket_event
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

# -------------------------------------------------------------------
# Location Update Event (Delivery Boys)
# -------------------------------------------------------------------
@socketio.on("update_location")
@safe_socket_event
def handle_update_location(data):
    """
    Delivery boy sends: {"lat": 23.8, "lng": 90.4}
    We can save it or broadcast it.
    For now, since they connect with JWT, we should ideally know their user_id.
    However, SocketIO contexts are tricky. We can require them to send their token again,
    or better: store the user_id in the socket session on connect.
    """
    # Just a placeholder for now. The real DB update usually happens via HTTP POST /api/delivery/location
    # But doing it via WS is faster.
    lat = data.get("lat")
    lng = data.get("lng")
    token = data.get("token")
    if lat and lng and token:
        try:
            decoded = decode_token(token)
            uid = int(decoded['sub'])
            user = db.session.get(User, uid)
            if user:
                user.current_latitude = lat
                user.current_longitude = lng
                db.session.commit()
        except Exception:
            pass

# -------------------------------------------------------------------
# Order Rooms (For tracking a specific order)
# -------------------------------------------------------------------
@socketio.on("join_order_room")
@safe_socket_event
def handle_join_order_room(data):
    from flask import session
    from app.models import Order
    order_id = data.get("order_id") if isinstance(data, dict) else None
    if not order_id:
        return

    # Check user identity from session or token in payload
    user_id = session.get("user_id")
    token = data.get("token") if isinstance(data, dict) else None
    if not user_id and token:
        try:
            decoded = decode_token(token)
            user_id = int(decoded["sub"])
        except Exception:
            user_id = None

    if not user_id:
        emit("socket_error", {"message": "Authentication required to join order room."})
        return

    order = db.session.get(Order, int(order_id))
    if not order:
        emit("socket_error", {"message": "Order not found."})
        return

    user = db.session.get(User, user_id)
    if not user:
        return

    is_buyer = (order.user_id == user.id)
    is_seller = (order.shop and order.shop.owner_id == user.id)
    is_delivery = (order.delivery_partner_id == user.id)
    is_admin = (user.role == "admin")

    if not (is_buyer or is_seller or is_delivery or is_admin):
        emit("socket_error", {"message": "Unauthorized to join this order room."})
        print(f"Unauthorized join attempt: User {user.id} tried to join room for Order #{order_id}")
        return

    room = f"order_{order_id}"
    join_room(room)
    print(f"Client {user.id} ({user.role}) authorized and joined room: {room}")

@socketio.on("leave_order_room")
@safe_socket_event
def handle_leave_order_room(data):
    order_id = data.get("order_id")
    if order_id:
        room = f"order_{order_id}"
        leave_room(room)
        print(f"Client left room: {room}")
