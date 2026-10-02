"""
Background scheduler — deadline checker  (Feature 4).

Uses Flask-APScheduler to run `check_order_deadlines()` every 60 seconds.
"""

import os
import logging
from datetime import datetime

from flask_apscheduler import APScheduler

from app.notifications import NotificationService

logger = logging.getLogger(__name__)
scheduler = APScheduler()


def init_scheduler(app):
    """Initialise and start the scheduler inside the app context."""
    scheduler.init_app(app)

    # In production or when reloader is disabled, just start it.
    # We remove the WERKZEUG_RUN_MAIN check because socketio.run uses use_reloader=False

    scheduler.start()
    logger.info("[Scheduler] Started — checking deadlines every 60 s.")


@scheduler.task("interval", id="check_order_deadlines", seconds=60,
                misfire_grace_time=120)
def check_order_deadlines():
    """
    Runs every minute:
      1. pending + seller_response_deadline expired → cancelled (seller_no_response)
      2. awaiting_buyer_decision + buyer_decision_deadline expired → cancelled (buyer_no_response)
    """
    with scheduler.app.app_context():
        from app import db
        from app.models import Order

        now = datetime.utcnow()

        # --- Seller no-response ---
        expired_pending = Order.query.filter(
            Order.status == "pending",
            Order.seller_response_deadline.isnot(None),
            Order.seller_response_deadline < now,
        ).all()

        for order in expired_pending:
            order.status = "cancelled"
            order.cancellation_reason = "seller_no_response"
            order.seller_response_deadline = None
            
            # Put shop offline automatically
            shop = order.shop
            if shop and shop.is_active:
                shop.is_active = False
                NotificationService.notify(
                    shop.owner_id, "shop_offline",
                    f"Your shop was taken offline automatically because you did not accept Order #{order.id} in time."
                )

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

            NotificationService.notify(
                order.user_id, "order_cancelled",
                f"Order from '{order.shop.name}' cancelled — seller did not respond in time."
            )
            logger.info("[Scheduler] Order #%s cancelled (seller_no_response).", order.id)

        # --- Buyer no-response ---
        expired_awaiting = Order.query.filter(
            Order.status == "awaiting_buyer_decision",
            Order.buyer_decision_deadline.isnot(None),
            Order.buyer_decision_deadline < now,
        ).all()

        for order in expired_awaiting:
            order.status = "cancelled"
            order.cancellation_reason = "buyer_no_response"
            order.buyer_decision_deadline = None

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

            NotificationService.notify(
                order.user_id, "order_cancelled",
                f"Order from '{order.shop.name}' cancelled — no response received."
            )
            logger.info("[Scheduler] Order #%s cancelled (buyer_no_response).", order.id)

        if expired_pending or expired_awaiting:
            db.session.commit()

