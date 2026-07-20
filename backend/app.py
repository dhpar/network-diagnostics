import os
import sqlite3
import threading
from flask import Flask
from flask_cors import CORS
from backend.routes import routes
from backend.database import DB_PATH, get_db, init_db
from backend.utils import background_scan

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Avoids a warning
CORS(app, origins = "http://localhost:3000")



app.register_blueprint(routes)

init_db()

scan_thread = threading.Thread(target=background_scan, daemon=True)
scan_thread.start()

if __name__ == '__main__':
    app.run(
        debug=True, 
        host="0.0.0.0", 
        port=5000
    )