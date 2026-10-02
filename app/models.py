from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

import random
import string

from app import db

import secrets

def generate_uid(length=16):
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


# ======================================================================
#  User
# ======================================================================

class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(16), unique=True, index=True, default=generate_uid)
    name = db.Column(db.String(100), nullable=False)
    nickname = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    is_suspended = db.Column(db.Boolean, default=False)
    session_version = db.Column(db.Integer, default=1)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user", index=True)  # user | seller | delivery | admin
    is_approved = db.Column(db.Boolean, default=False, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    lat = db.Column(db.Float, nullable=True, index=True)
    lng = db.Column(db.Float, nullable=True, index=True)
    is_platform_verified = db.Column(db.Boolean, default=False)
    complaints_count = db.Column(db.Integer, default=0)
    shop_last_active_at = db.Column(db.DateTime, nullable=True)  # Last time seller was active      # Tier 1 Trusted
    wallet_balance = db.Column(db.Numeric(20, 2, asdecimal=False), default=0.0)               # Feature 1

    @db.validates('wallet_balance')
    def sync_shop_wallet(self, key, value):
        if hasattr(self, 'shop') and self.shop:
            self.shop._wallet_balance = value
        return value
    # Soft Delete
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Location Tracking
    current_latitude = db.Column(db.Float, nullable=True)
    current_longitude = db.Column(db.Float, nullable=True)
    location_updated_at = db.Column(db.DateTime, nullable=True)

    # User Profile
    default_address = db.Column(db.String(500), nullable=True)

    complaint_count_30d = db.Column(db.Integer, default=0)
    last_seen_at = db.Column(db.DateTime, nullable=True, index=True)  # Heartbeat tracking

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # relationships
    shop = db.relationship("Shop", back_populates="owner", uselist=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "uid": self.uid,
            "name": self.name,
            "nickname": self.nickname,
            "email": self.email,
            "phone": self.phone,
            "default_address": self.default_address,
            "role": self.role,
            "is_approved": self.is_approved,
            "is_active": self.is_active,
            "is_suspended": self.is_suspended,
            "is_platform_verified": self.is_platform_verified,
            "wallet_balance": self.wallet_balance,
            "complaints_count": getattr(self, "complaints_count", 0),
            "current_latitude": self.current_latitude,
            "current_longitude": self.current_longitude,
            "location_updated_at": self.location_updated_at.isoformat() if self.location_updated_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ======================================================================
#  Shop Trusted Partner (Tier 2 Trusted)
# ======================================================================
class ShopTrustedPartner(db.Model):
    __tablename__ = "shop_trusted_partners"
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False, index=True)
    delivery_partner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Make combination unique so a shop can't add the same boy twice
    __table_args__ = (db.UniqueConstraint('shop_id', 'delivery_partner_id', name='_shop_partner_uc'),)

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "delivery_partner_id": self.delivery_partner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ======================================================================
#  Shop
# ======================================================================
class EmailOTP(db.Model):
    __tablename__ = "email_otps"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    otp = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

class Shop(db.Model):
    __tablename__ = "shops"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(300), nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    is_approved = db.Column(db.Boolean, default=False, index=True)
    _wallet_balance = db.Column("wallet_balance", db.Numeric(10, 2, asdecimal=False), default=0.0)               # Feature 1

    @property
    def wallet_balance(self):
        if self.owner:
            return self.owner.wallet_balance
        if self.owner_id:
            from app.models import User
            owner = db.session.get(User, self.owner_id)
            if owner:
                return owner.wallet_balance
        return self._wallet_balance or 0.0

    @wallet_balance.setter
    def wallet_balance(self, value):
        self._wallet_balance = value
        if self.owner:
            self.owner.wallet_balance = value
        elif self.owner_id:
            from app.models import User
            owner = db.session.get(User, self.owner_id)
            if owner:
                owner.wallet_balance = value
    # payment_mode:
    #   'wallet_settlement' (default) — delivery boy collects cash from customer,
    #       system auto-deducts from delivery partner wallet and credits shop wallet.
    #   'cash_purchase' — delivery boy physically pays cash to shop at pickup;
    #       no wallet deduction on delivery.
    shop_category = db.Column(db.String(50), default="Grocery", nullable=False)
    payment_mode = db.Column(db.String(30), default="wallet_settlement", nullable=False)
    pickup_shortage_count_30d = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True, index=True)
    lat = db.Column(db.Float, nullable=True, index=True)
    lng = db.Column(db.Float, nullable=True, index=True)
    self_delivery_active = db.Column(db.Boolean, default=True)
    opening_time = db.Column(db.String(5), default="00:00")
    closing_time = db.Column(db.String(5), default="23:59")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    owner = db.relationship("User", back_populates="shop")
    products = db.relationship("Product", back_populates="shop", cascade="all, delete-orphan")

    def to_dict(self, include_products=False):
        data = {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "owner_id": self.owner_id,
            "owner_uid": self.owner.uid if self.owner else None,
            "owner_name": self.owner.name if self.owner else None,
            "owner_nickname": self.owner.nickname if self.owner else None,
            "is_approved": self.is_approved,
            "is_active": self.is_active,
            "wallet_balance": self.wallet_balance,
            "complaints_count": getattr(self, "complaints_count", 0),
            "payment_mode": self.payment_mode,
            "self_delivery_active": self.self_delivery_active,
            "opening_time": self.opening_time,
            "closing_time": self.closing_time,
            "shop_category": self.shop_category,
            "pickup_shortage_count_30d": self.pickup_shortage_count_30d,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_products:
            data["products"] = [p.to_dict() for p in self.products]
        return data


# ======================================================================
#  Product
# ======================================================================

# ======================================================================
#  Global Items & Requests (Platform Catalog)
# ======================================================================

class GlobalItem(db.Model):
    __tablename__ = "global_items"

    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(8), unique=True, nullable=False, index=True)
    company = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    specification = db.Column(db.String(150), nullable=False)
    quantity_type = db.Column(db.String(20), nullable=False)  # kg|gm|litre|ml|piece|packet|box|dozen
    image_url = db.Column(db.String(500), nullable=True)
    is_image_hidden = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (db.UniqueConstraint('company', 'category', 'specification', name='_global_item_uc'),)

    def to_dict(self):
        return {
            "id": self.id,
            "uid": self.uid,
            "company": self.company,
            "category": self.category,
            "specification": self.specification,
            "image_url": self.image_url if not self.is_image_hidden else None,
            "original_image_url": self.image_url,
            "is_image_hidden": self.is_image_hidden,
            "quantity_type": self.quantity_type,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class ItemRequest(db.Model):
    __tablename__ = "item_requests"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False, index=True)
    requested_company = db.Column(db.String(100), nullable=False)
    requested_category = db.Column(db.String(100), nullable=False)
    requested_specification = db.Column(db.String(150), nullable=False)
    quantity_type = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(30), default="pending", index=True) # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    shop = db.relationship("Shop")

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "shop_name": self.shop.name if self.shop else None,
            "requested_company": self.requested_company,
            "requested_category": self.requested_category,
            "requested_specification": self.requested_specification,
            "quantity_type": self.quantity_type,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    global_item_id = db.Column(db.Integer, db.ForeignKey("global_items.id"), nullable=True)
    name = db.Column(db.String(120), nullable=True)
    price = db.Column(db.Numeric(10, 2, asdecimal=False), nullable=False)
    unit_value = db.Column(db.Float, nullable=True)
    unit_measure = db.Column(db.String(20), nullable=True)
    description = db.Column(db.String(500), nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False, index=True)
    is_available = db.Column(db.Boolean, default=True)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    shop = db.relationship("Shop", back_populates="products")
    global_item = db.relationship("GlobalItem")

    __table_args__ = (db.UniqueConstraint("shop_id", "global_item_id", name="_shop_product_uc"),)

    def to_dict(self):
        gi = self.global_item if self.global_item_id else None
        is_loose = False
        unit = self.unit_measure
        if gi:
            unit = gi.quantity_type
            if gi.quantity_type == 'weight' or gi.company == 'Local/Loose':
                is_loose = True
                
        return {
            "id": self.id,
            "global_item_id": self.global_item_id,
            "name": self.name,
            "price": self.price,
            "unit_value": self.unit_value,
            "unit_measure": self.unit_measure,
            "unit": unit,
            "is_loose": is_loose,
            "description": self.description,
            "image_url": gi.image_url if (gi and not gi.is_image_hidden) else None,
            "shop_id": self.shop_id,
            "is_available": self.is_available,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ======================================================================
#  Order
# ======================================================================
class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(16), unique=True, index=True, default=generate_uid)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False, index=True)
    delivery_partner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)

    # Status: pending | confirmed | awaiting_buyer_decision | ready
    #         | picked_up | delivered | cancelled | pending_redelivery
    status = db.Column(db.String(30), default="pending", index=True)

    items_total = db.Column(db.Numeric(10, 2, asdecimal=False), default=0.0)
    delivery_charge = db.Column(db.Numeric(10, 2, asdecimal=False), default=0.0)

    # Feature 2 — delivery type
    delivery_type = db.Column(db.String(20), default="instant_delivery")  # instant_delivery | self_delivery

    # Payment
    payment_method = db.Column(db.String(20), default="cod")  # cod | online
    is_cash_on_delivery = db.Column(db.Boolean, default=True)
    cod_fee = db.Column(db.Numeric(10, 2, asdecimal=False), default=0.0)

    total_amount = db.Column(db.Numeric(10, 2, asdecimal=False), default=0.0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Track when the order became ready (for Trusted head-start delays)
    ready_at = db.Column(db.DateTime, nullable=True)

    # Feature 4 — confirm-first flow deadlines
    seller_response_deadline = db.Column(db.DateTime, nullable=True)
    buyer_decision_deadline = db.Column(db.DateTime, nullable=True)
    cancellation_reason = db.Column(db.String(50), nullable=True)
    
    # Feature C: Ratings
    seller_rating = db.Column(db.Integer, nullable=True)
    delivery_rating = db.Column(db.Integer, nullable=True)
    rating_comment = db.Column(db.String(500), nullable=True)

    # Feature 6 — edge cases
    delivery_attempt_failed = db.Column(db.Boolean, default=False)
    delivery_address = db.Column(db.String(500), nullable=True)
    delivery_notes = db.Column(db.String(500), nullable=True)
    locked_deposit_percentage = db.Column(db.Float, nullable=True)

    pickup_confirmed_at = db.Column(db.DateTime, nullable=True)
    pickup_shortage_reported = db.Column(db.Boolean, default=False)
    is_flagged_suspicious = db.Column(db.Boolean, default=False)
    shop_payment_claimed = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # relationships
    customer = db.relationship("User", foreign_keys=[user_id])
    delivery_partner = db.relationship("User", foreign_keys=[delivery_partner_id])
    shop = db.relationship("Shop")
    items = db.relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")
    complaints = db.relationship("Complaint", back_populates="order", cascade="all, delete-orphan")

    def recalculate_totals(self):
        """Recalculate items_total and total_amount from available items and pickup quantities."""
        self.items_total = sum(
            item.unit_price * (item.quantity_received_at_pickup if item.quantity_received_at_pickup is not None else item.quantity)
            for item in self.items
            if item.is_available
        )
        self.total_amount = self.items_total + self.delivery_charge + self.cod_fee

    def to_dict(self, include_items=True):
        data = {
            "id": self.id,
            "uid": self.uid,
            "user_id": self.user_id,
            "shop_id": self.shop_id,
            "delivery_partner_id": self.delivery_partner_id,
            "status": self.status,
            "items_total": self.items_total,
            "delivery_charge": self.delivery_charge,
            "delivery_type": self.delivery_type,
            "payment_method": self.payment_method,
            "shop_lat": self.shop.lat if self.shop else None,
            "shop_lng": self.shop.lng if self.shop else None,
            "shop_category": self.shop.shop_category if self.shop else None,
            "buyer_lat": self.customer.lat if self.customer else None,
            "buyer_lng": self.customer.lng if self.customer else None,
            "shop_payment_claimed": self.shop_payment_claimed,
            "is_cash_on_delivery": self.is_cash_on_delivery,
            "cod_fee": self.cod_fee,
            "total_amount": self.total_amount,
            "cancellation_reason": self.cancellation_reason,
            "seller_rating": self.seller_rating,
            "delivery_rating": self.delivery_rating,
            "rating_comment": self.rating_comment,
            "delivery_attempt_failed": self.delivery_attempt_failed,
            "delivery_address": self.delivery_address,
            "delivery_notes": self.delivery_notes,
            "locked_deposit_percentage": self.locked_deposit_percentage,
            "pickup_confirmed_at": self.pickup_confirmed_at.isoformat() if self.pickup_confirmed_at else None,
            "pickup_shortage_reported": self.pickup_shortage_reported,
            "is_flagged_suspicious": self.is_flagged_suspicious,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_items:
            data["items"] = [item.to_dict() for item in self.items]
        
        data["complaints"] = [c.to_dict() for c in self.complaints] if self.complaints else []
        return data


# ======================================================================
#  OrderItem
# ======================================================================
class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    quantity = db.Column(db.Float, nullable=False, default=1.0)
    unit_price = db.Column(db.Numeric(10, 2, asdecimal=False), nullable=False)
    is_available = db.Column(db.Boolean, default=True)  # Feature 4
    quantity_received_at_pickup = db.Column(db.Float, nullable=True)

    order = db.relationship("Order", back_populates="items")
    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "quantity": self.quantity,
            "quantity_received_at_pickup": self.quantity_received_at_pickup,
            "unit_price": self.unit_price,
            "is_available": self.is_available,
            "subtotal": self.unit_price * (self.quantity_received_at_pickup if self.quantity_received_at_pickup is not None else self.quantity),
        }


# ======================================================================
#  WalletTransaction  (Feature 1)
# ======================================================================
class WalletTransaction(db.Model):
    __tablename__ = "wallet_transactions"

    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(16), unique=True, index=True, default=generate_uid)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=True)
    from_type = db.Column(db.String(20))    # delivery_partner | admin | system
    from_id = db.Column(db.Integer, nullable=True)
    to_type = db.Column(db.String(20))      # shop | delivery_partner
    to_id = db.Column(db.Integer, nullable=True)
    amount = db.Column(db.Numeric(10, 2, asdecimal=False), nullable=False)
    transaction_type = db.Column(db.String(30))  # cod_settlement | security_deposit | withdrawal
    description = db.Column(db.String(255), nullable=True)
    balance_after = db.Column(db.Numeric(20, 2, asdecimal=False), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "uid": self.uid,
            "order_id": self.order_id,
            "from_type": self.from_type,
            "from_id": self.from_id,
            "to_type": self.to_type,
            "to_id": self.to_id,
            "amount": self.amount,
            "transaction_type": self.transaction_type,
            "description": self.description,
            "balance_after": self.balance_after,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ======================================================================
#  Notification  (Feature 5)
# ======================================================================
class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    event_type = db.Column(db.String(50))
    related_id = db.Column(db.Integer, nullable=True)
    message = db.Column(db.String(500))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_type": self.event_type,
            "related_id": self.related_id,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ======================================================================
#  Complaint  (Feature 6)
# ======================================================================
class Complaint(db.Model):
    __tablename__ = "complaints"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    
    complaint_type = db.Column(db.String(50))  # "short_quantity" | "wrong_item" | "damaged" | "other"
    order_item_id = db.Column(db.Integer, db.ForeignKey("order_items.id"), nullable=True)
    reported_shortage = db.Column(db.String(255), nullable=True)
    
    reason = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(20), default="pending")
    image_url = db.Column(db.String(500), nullable=True)
    is_image_hidden = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    otp_expiry = db.Column(db.DateTime, nullable=True) # pending, resolved
    against_role = db.Column(db.String(20), nullable=True) # user, seller, delivery
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    order = db.relationship("Order", back_populates="complaints")
    order_item = db.relationship("OrderItem")
    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "user_id": self.user_id,
            "reporter_name": self.user.name if self.user else "System",
            "reporter_role": self.user.role if self.user else "system",
            "complaint_type": self.complaint_type,
            "order_item_id": self.order_item_id,
            "reported_shortage": self.reported_shortage,
            "reason": self.reason,
            "status": self.status,
            "against_role": self.against_role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ======================================================================
#  AdminAuditLog
# ======================================================================
class AdminAuditLog(db.Model):
    __tablename__ = "admin_audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    target_id = db.Column(db.Integer, nullable=True)
    description = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    admin = db.relationship("User", backref="audit_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "admin_id": self.admin_id,
            "admin_name": self.admin.name if self.admin else "Unknown",
            "action": self.action,
            "target_id": self.target_id,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }



# ======================================================================
#  WithdrawalRequest
# ======================================================================
class WithdrawalRequest(db.Model):
    __tablename__ = "withdrawal_requests"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    amount = db.Column(db.Numeric(10, 2, asdecimal=False), nullable=False)
    payment_details = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(20), default="pending") # pending, paid, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    
    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Unknown",
            "user_role": self.user.role if self.user else "Unknown",
            "amount": self.amount,
            "payment_details": self.payment_details,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }


class WishlistItem(db.Model):
    __tablename__ = "wishlist_items"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    product = db.relationship("Product")
    
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product": self.product.to_dict() if self.product else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class SystemSetting(db.Model):
    __tablename__ = "system_settings"
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)
    
    def to_dict(self):
        return {"key": self.key, "value": self.value}

class Offer(db.Model):
    __tablename__ = "offers"
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=True, index=True) # If null, platform-wide
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    offer_type = db.Column(db.String(50), nullable=False) # e.g., 'product_discount', 'bogo', 'free_delivery', 'cart_discount'
    target_product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    threshold_amount = db.Column(db.Numeric(10, 2, asdecimal=False), nullable=True) # Minimum cart value
    discount_value = db.Column(db.Numeric(10, 2, asdecimal=False), nullable=False) # E.g., 50 for 50Tk, or 10 for 10%
    is_percentage = db.Column(db.Boolean, default=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, index=True)

    shop = db.relationship("Shop", backref="offers")
    target_product = db.relationship("Product", backref="offers")

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "shop_name": self.shop.name if self.shop else "Platform Wide",
            "title": self.title,
            "description": self.description,
            "offer_type": self.offer_type,
            "target_product_id": self.target_product_id,
            "threshold_amount": self.threshold_amount,
            "discount_value": self.discount_value,
            "is_percentage": self.is_percentage,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "is_active": self.is_active
        }


class LocationHistory(db.Model):
    __tablename__ = "location_history"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    role = db.Column(db.String(20)) # user, delivery
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role": self.role,
            "lat": self.lat,
            "lng": self.lng,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None
        }

class ShopActivityLog(db.Model):
    __tablename__ = "shop_activity_log"
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False, index=True)
    status = db.Column(db.String(20)) # online / offline
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "status": self.status,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None
        }

from sqlalchemy import event

def after_order_update_listener(mapper, connection, target):
    try:
        from app import socketio
        from app.models import Shop
        import sqlalchemy as sa
        
        data = {"order_id": target.id, "status": target.status}
        
        # Notify buyer
        socketio.emit("order_updated", data, room=f"user_{target.user_id}")
        
        # Notify shop owner
        owner_id = connection.scalar(sa.select(Shop.owner_id).where(Shop.id == target.shop_id))
        if owner_id:
            socketio.emit("order_updated", data, room=f"user_{owner_id}")
            
        # Notify delivery partner if assigned
        if target.delivery_partner_id:
            socketio.emit("order_updated", data, room=f"user_{target.delivery_partner_id}")
            
        # Also emit to the specific order tracking room
        socketio.emit("order_updated", data, room=f"order_{target.id}")
        
    except Exception as e:
        print(f"Failed to emit socket event: {e}")

event.listen(Order, 'after_update', after_order_update_listener)
event.listen(Order, 'after_insert', after_order_update_listener)


from sqlalchemy import event

def strip_xss_tags(mapper, connection, target):
    """Automatically strip < and > from all string columns to prevent XSS without double-escaping issues."""
    for column in mapper.columns:
        if isinstance(column.type, db.String) or isinstance(column.type, db.Text):
            val = getattr(target, column.key)
            if isinstance(val, str):
                # We strip < and > to prevent HTML/Script injection
                new_val = val.replace('<', '').replace('>', '')
                if new_val != val:
                    setattr(target, column.key, new_val)

for cls in [User, Shop, Product, GlobalItem, Order, OrderItem, Complaint, WithdrawalRequest, WishlistItem, Notification, SystemSetting, ShopTrustedPartner, ItemRequest, ShopActivityLog]:
    event.listen(cls, 'before_insert', strip_xss_tags)
    event.listen(cls, 'before_update', strip_xss_tags)
