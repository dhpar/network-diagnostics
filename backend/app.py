import os
import threading
from flask import Flask
from flask_cors import CORS
from backend.routes import routes
from backend.database import init_db
from backend.utils import background_scan

app = Flask(__name__)

CORS(
    app, 
    origins = "http://localhost:3000", 
)

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