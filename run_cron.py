from app import create_app, db
from app.models import Order, Notification, WalletTransaction
from datetime import datetime, timedelta

def run_cleanup():
    app = create_app()
    with app.app_context():
        now = datetime.utcnow()
        stale_pending = Order.query.filter(
            Order.status == 'pending',
            Order.created_at <= now - timedelta(minutes=10)
        ).all()
        
        # 2. Release hoarded/lazy assigned orders
        stale_assigned = Order.query.filter(
            Order.status == 'delivery_partner_assigned',
            Order.updated_at <= now - timedelta(minutes=45)
        ).all()
        
        for o in stale_assigned:
            o.delivery_partner_id = None
            o.status = "ready_for_pickup"  # Return to pool
            db.session.add(Notification(user_id=o.user_id, event_type="delivery_reassigned", message=f"Order #{o.id} reassigned due to delayed pickup."))

        
        for o in stale_pending:
            o.status = "cancelled"
            o.cancellation_reason = "seller_no_response"
            if o.payment_method == "online":
                db.session.add(WalletTransaction(to_type="user", to_id=o.user_id, amount=o.total_amount, transaction_type="refund_cancellation"))
            db.session.add(Notification(user_id=o.user_id, event_type="order_cancelled", message=f"Order #{o.id} cancelled. Seller did not respond."))
        
        stale_partial = Order.query.filter(
            Order.status == 'awaiting_buyer_decision',
            Order.updated_at <= now - timedelta(minutes=15)
        ).all()
        
        for o in stale_partial:
            o.status = "cancelled"
            o.cancellation_reason = "buyer_timeout"
            if o.payment_method == "online":
                db.session.add(WalletTransaction(to_type="user", to_id=o.user_id, amount=o.total_amount, transaction_type="refund_cancellation"))
            db.session.add(Notification(user_id=o.user_id, event_type="order_cancelled", message=f"Order #{o.id} cancelled. You didn't confirm the partial items in time."))
            
        db.session.commit()
        print(f"Cleanup done! Cancelled {len(stale_pending)} pending and {len(stale_partial)} partial orders.")

if __name__ == "__main__":
    run_cleanup()
