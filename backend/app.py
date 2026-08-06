import os
from dotenv import load_dotenv
import threading
from flask import Flask
from flask_cors import CORS
from backend.routes import routes
from backend.database import init_db
from backend.utils import background_scan
import logging
from uuid import uuid4
from werkzeug.exceptions import HTTPException
from flask import jsonify, g

load_dotenv()
app = Flask(__name__)
domain = os.getenv('DOMAIN')
SQL_Alchemy_DB = f"sqlite:///{os.getenv('SQLALCHEMY_DATABASE_URI')}/"

CORS(app, origins = domain or "http://localhost:3000")

@app.before_request
def set_request_id():
    g.request_id = str(uuid4())

@app.errorhandler(HTTPException)
def handle_http_error(error):
    return jsonify(
        error={
            "code": error.name.lower().replace(" ", "_"),
            "message": error.description,
            "request_id": g.request_id,
        }
    ), error.code

@app.errorhandler(Exception)
def handle_unexpected_error(error):
    app.logger.exception(
        "Unhandled request error",
        extra={"request_id": g.get("request_id")},
    )
    return jsonify(
        error={
            "code": "internal_error",
            "message": f"An unexpected server error occurred ({error}).",
            "request_id": g.get("request_id"),
        }
    ), 500
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