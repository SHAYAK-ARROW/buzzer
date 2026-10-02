"""
Application entry-point.

    python run.py
"""

import os
from app import create_app, db

app = create_app(os.getenv("FLASK_ENV", "development"))

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    from app import socketio
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, use_reloader=False)

