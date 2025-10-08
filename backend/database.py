# Database initialization
import sqlite3

def init_db():
    conn = sqlite3.connect('network_diagnostics.db')
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
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect('network_diagnostics.db')
    conn.row_factory = sqlite3.Row
    return conn