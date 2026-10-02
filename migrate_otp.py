from app import create_app, db
from sqlalchemy import text
app = create_app('development')
with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(6);'))
        db.session.commit()
        print('Added delivery_otp to DB')
    except Exception as e:
        print('Error:', e)
        db.session.rollback()
