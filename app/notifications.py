import logging
from app import db
from app.models import Notification

logger = logging.getLogger(__name__)

EVENT_CHANNELS = {
    "order_cancelled":   ("push", "sms"),
    "partial_stock":     ("push", "sms"),
    "order_confirmed":   ("push",),
    "order_ready":       ("push",),
    "delivery_claimed":  ("push",),
    "order_delivered":   ("push",),
}

class NotificationService:
    @staticmethod
    def notify(user_id, event_type, message, channels=None):
        if channels is None:
            channels = EVENT_CHANNELS.get(event_type, ("push",))

        if "push" in channels:
            notif = Notification(
                user_id=user_id,
                event_type=event_type,
                message=message,
            )
            db.session.add(notif)

        if "sms" in channels:
            print(f"\n[MOCK SMS] To User ID {user_id}: {message}\n")
            logger.info("[SMS STUB] Would send SMS to user %s: %s", user_id, message)
            
        if "email" in channels:
            from app.models import User
            from app.email_utils import send_email_async
            # We need the user's email address
            user = db.session.get(User, user_id)
            if user and user.email:
                subject = f"Buzzer Notification: {event_type.replace('_', ' ').title()}"
                send_email_async(user.email, subject, message)
            else:
                logger.warning(f"Could not send email. User {user_id} has no email address.")

        try:
            db.session.flush()
        except Exception:
            pass
