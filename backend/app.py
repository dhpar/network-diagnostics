import os
import threading
from flask import Flask
from routes import routes
from flask_cors import CORS
from database import init_db
from utils import background_scan

app = Flask(__name__)

CORS(
    app, 
    origins = "http://localhost:3000", 
)

app.register_blueprint(routes)

init_db()

# Guard against Flask's debug reloader starting this twice: in debug mode,
# Flask spawns a child process to watch for file changes, and without this
# check the background thread would start once in the parent AND once in
# the child, running two scans in parallel every cycle.
if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
    scan_thread = threading.Thread(target=background_scan, daemon=True)
    scan_thread.start()

if __name__ == '__main__':
    app.run(
        debug=True, 
        host="0.0.0.0", 
        port=5000
    )