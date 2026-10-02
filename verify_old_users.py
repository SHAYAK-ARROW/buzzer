from app import create_app, db
from app.models import User

app = create_app('development')
with app.app_context():
    db.session.query(User).update({User.is_verified: True})
    db.session.commit()
    print('All existing users marked as verified!')
