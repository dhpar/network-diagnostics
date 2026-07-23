import os
from dotenv import load_dotenv
import sqlite3
import threading
from flask import Flask
from flask_cors import CORS
from backend.routes import routes
from backend.database import DB_PATH, get_db, init_db
from backend.utils import background_scan

load_dotenv()
app = Flask(__name__)
domain = os.getenv('DOMAIN')
SQL_Alchemy_DB = f"sqlite:///{os.getenv('SQLALCHEMY_DATABASE_URI')}/"

CORS(app, origins = domain or "http://localhost:3000")

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