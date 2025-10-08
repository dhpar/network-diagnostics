from flask import Flask
# from flask_cors import CORS
# from flask_socketio import SocketIO, emit
import threading
from datetime import datetime
from database import init_db
# from utils import scan_network

app = Flask(__name__)
# CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
# socketio = SocketIO(
#         app, 
#         cors_allowed_origins="http://localhost:3000", 
#         message_queue='http://localhost:3000'
#     )

# init_db()

# Start background scanning thread
# scan_thread = threading.Thread(target=background_scan, daemon=True)
# scan_thread.start()

# WebSocket events
# @socketio.on('connect')
# def handle_connect():
#     print('Client connected')
#     emit('connection_status', {'status': 'connected'})

# @socketio.on('disconnect')
# def handle_disconnect():
#     print('Client disconnected')

# @socketio.on('request_scan')
# def handle_scan_request():
#     # devices = scan_network()
#     # emit('devices_update', {'devices': 'devices'})
#     print('devices')

# @app.route("/spec")
# def spec():
#     return jsonify(swagger(app))

@app.route("/")
def helloworld():
    return "Hello World!"

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
    # socketio.run(
    #     app, 
    #     host='0.0.0.0', 
    #     port=5000, 
    #     debug=True, 
    #     allow_unsafe_werkzeug=True
    # )
    