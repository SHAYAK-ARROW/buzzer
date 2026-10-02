from app import create_app, db
from sqlalchemy import text
app = create_app('development')
with app.app_context():
    try:
        db.session.execute(text('CREATE INDEX ix_users_lat ON users (lat);'))
        db.session.execute(text('CREATE INDEX ix_users_lng ON users (lng);'))
        db.session.execute(text('CREATE INDEX ix_shops_lat ON shops (lat);'))
        db.session.execute(text('CREATE INDEX ix_shops_lng ON shops (lng);'))
        db.session.commit()
        print('Indexes created in DB!')
    except Exception as e:
        print('Error (might already exist):', e)
        db.session.rollback()
