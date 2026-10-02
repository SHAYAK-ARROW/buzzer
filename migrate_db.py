from app import create_app, db
from sqlalchemy import text

app = create_app('development')
with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;'))
        db.session.execute(text('ALTER TABLE users ADD COLUMN otp VARCHAR(6);'))
        db.session.execute(text('ALTER TABLE users ADD COLUMN otp_expiry TIMESTAMP;'))
        db.session.commit()
        print('Users table altered successfully!')
    except Exception as e:
        print('Alter failed (maybe columns exist?):', e)
        db.session.rollback()
        
    db.create_all()
    print('All tables created/verified!')
