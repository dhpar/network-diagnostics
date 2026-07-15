import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'network_diagnostics.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS devices
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  ip TEXT UNIQUE,
                  mac TEXT,
                  hostname TEXT,
                  vendor TEXT,
                  last_seen TIMESTAMP,
                  status TEXT)''')

    c.execute('''CREATE TABLE IF NOT EXISTS network_scans
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  scan_type TEXT,
                  timestamp TIMESTAMP,
                  results TEXT)''')

    # Separate from `devices` on purpose: this table is keyed by MAC (stable
    # across DHCP renewals) rather than IP, and survives independently of
    # anything that touches or resets the scan-derived `devices` table.
    c.execute('''CREATE TABLE IF NOT EXISTS device_labels
                 (mac TEXT PRIMARY KEY,
                  label TEXT NOT NULL,
                  updated_at TIMESTAMP)''')

    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn