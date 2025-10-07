# Network Diagnostics Tool - MVP

A locally-hosted web application for diagnosing and monitoring network issues with real-time visualization.

## Features (MVP)

✅ **Network Discovery**
- Automatic device detection via ARP scanning
- Real-time device status monitoring
- Gateway and local IP identification

✅ **WiFi Scanning**
- Scan available WiFi networks
- Signal strength visualization
- Channel information

✅ **DNS Diagnostics**
- DNS resolution testing
- Response time measurement
- Multi-domain testing

✅ **Real-time Updates**
- WebSocket-based live updates
- Background network scanning
- Automatic device refresh

## Tech Stack

**Backend:**
- Python 3.11
- Flask + Flask-SocketIO
- SQLite database
- Network utilities (ping, arp, ip)

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS
- Socket.io-client
- Lucide React (icons)

**Infrastructure:**
- Docker & Docker Compose
- Network mode: host (for network scanning)

## Project Structure

```
network-diagnostics/
├── backend/
│   ├── app.py                 # Flask application
│   ├── requirements.txt       # Python dependencies
│   └── data/                  # SQLite database directory
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.tsx           # Main React component (TypeScript)
│   │   ├── index.tsx
│   │   ├── index.css
│   │   └── react-app-env.d.ts
│   ├── package.json
│   └── tsconfig.json          # TypeScript configuration
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Installation & Setup

### Prerequisites
- Docker and Docker Compose installed
- (Optional) Node.js 18+ and Python 3.11+ for local development

### Quick Start with Docker (Recommended)

1. **Clone or create the project structure**
   ```bash
   mkdir network-diagnostics
   cd network-diagnostics
   # Create the directory structure and copy all files
   ```

2. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Local Development (Without Docker)

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Usage

### Dashboard
- View network overview with local IP, gateway, and active devices
- Quick actions for scanning network, WiFi, and testing DNS
- Real-time device updates

### Devices Tab
- Complete list of discovered network devices
- Status indicators (online/offline)
- MAC addresses and hostnames
- Last seen timestamps

### WiFi Tab
- Available WiFi networks in range
- Signal strength visualization
- Real-time scanning

### DNS Tab
- Test DNS resolution for common domains
- Response time measurements
- Success/failure indicators

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/network/info` | GET | Get local network information |
| `/api/devices` | GET | List all discovered devices |
| `/api/scan/network` | POST | Trigger network scan |
| `/api/ping/<ip>` | GET | Ping specific IP address |
| `/api/wifi/scan` | GET | Scan WiFi networks |
| `/api/dns/test` | GET | Test DNS resolution |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client → Server | Connection established |
| `disconnect` | Client → Server | Connection closed |
| `devices_update` | Server → Client | Real-time device updates |
| `request_scan` | Client → Server | Request immediate scan |

## Configuration

### Docker Network Mode
The application uses `network_mode: host` to access the host's network interfaces. This is required for:
- ARP table access
- Network interface scanning
- WiFi detection

### Security Considerations

⚠️ **Local Access Only**
- By default, the backend binds to `0.0.0.0` for Docker compatibility
- In production, restrict to `127.0.0.1` or use authentication
- Never expose to the internet without proper security

### Elevated Privileges
Some features require elevated privileges:
- Packet capture (future feature)
- WiFi scanning (on some systems)
- Raw socket access

The Docker container has `NET_ADMIN` and `NET_RAW` capabilities for these operations.

## Troubleshooting

### WiFi Scanning Not Working
- On Linux: Install `network-manager` (`sudo apt-get install network-manager`)
- On Windows: Ensure WiFi adapter is enabled
- May require elevated privileges on some systems

### No Devices Detected
- Check if ARP table is populated: `arp -a` (Windows) or `arp -n` (Linux)
- Ensure Docker container has host network access
- Verify firewall isn't blocking ICMP (ping)

### WebSocket Connection Failed
- Check if backend is running on port 5000
- Verify CORS settings in backend
- Check browser console for errors

### Docker Issues
- If network scanning doesn't work, verify `network_mode: host`
- On Windows/Mac: Docker Desktop may have limitations with host networking
- Try running backend directly on host system

## Future Enhancements

Planned features for future releases:
- [ ] Network topology visualization (graph view)
- [ ] Port scanning functionality
- [ ] Packet capture and analysis
- [ ] Router/modem diagnostics (SNMP)
- [ ] DHCP lease information
- [ ] Bandwidth monitoring
- [ ] Historical data and trends
- [ ] Alert system for network issues
- [ ] Export reports (PDF/CSV)
- [ ] Custom device naming
- [ ] Network speed testing

## Development Notes

### Background Scanning
The backend runs a background thread that scans the network every 30 seconds and updates connected clients via WebSocket.

### Database Schema
```sql
devices (
    id INTEGER PRIMARY KEY,
    ip TEXT UNIQUE,
    mac TEXT,
    hostname TEXT,
    vendor TEXT,
    last_seen TIMESTAMP,
    status TEXT
)

network_scans (
    id INTEGER PRIMARY KEY,
    scan_type TEXT,
    timestamp TIMESTAMP,
    results TEXT
)
```

### Platform Support
- ✅ Linux (full support)
- ⚠️ Windows (limited WiFi scanning)
- ⚠️ macOS (limited WiFi scanning)

## Contributing

This is an MVP (Minimum Viable Product). Contributions are welcome!

Areas for improvement:
- Cross-platform compatibility
- More robust error handling
- Additional network diagnostic tools
- UI/UX enhancements
- Performance optimizations

## License

MIT License - feel free to use and modify as needed.

## Acknowledgments

Built with:
- Flask & Flask-SocketIO
- React & Tailwind CSS
- Lucide React Icons
- Socket.io

---

**Note:** This tool is designed for diagnosing your own local network. Always ensure you have permission before scanning any network.
