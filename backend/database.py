from datetime import datetime
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'network_diagnostics.db')
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS 
                devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip TEXT UNIQUE,
                    mac TEXT,
                    hostname TEXT,
                    vendor TEXT,
                    last_seen TIMESTAMP,
                    status TEXT
                )
            ''')

        c.execute('''
            CREATE TABLE IF NOT EXISTS 
                network_scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_type TEXT,
                    timestamp TIMESTAMP,
                    results TEXT
                )
            ''')

        # Separate from `devices` on purpose: this table is keyed by MAC (stable
        # across DHCP renewals) rather than IP, and survives independently of
        # anything that touches or resets the scan-derived `devices` table.
        c.execute('''
            CREATE TABLE IF NOT EXISTS 
                device_labels
                (
                    mac TEXT PRIMARY KEY,
                    label TEXT NOT NULL,
                    updated_at TIMESTAMP
                )
        ''')

        conn.commit()
    

def insert_or_replace_device_db( device, resolved_hostname, now):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO 
                devices (ip, mac, hostname, status, last_seen) 
            VALUES 
                (?, ?, ?, ?, ?)
            ''',
            (device['ip'], device.get('mac', 'unknown'), resolved_hostname, 'online', now)
        )
    
    
def get_devices_with_label_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        rows = c.execute('''
            SELECT 
                d.ip, d.mac, d.hostname, d.last_seen, d.status, l.label
            FROM 
                devices d
            LEFT JOIN 
                device_labels l ON UPPER(d.mac) = l.mac
            ORDER BY 
                d.last_seen 
            DESC
        ''')
        rows_list = rows.fetchall()
        dict_rows = [dict(row) for row in rows_list]
        return dict_rows

def update_devices_label_db(normalized_mac, label):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            INSERT INTO 
                device_labels (mac, label, updated_at)
            VALUES 
                (?, ?, ?)
            ON CONFLICT(mac) DO UPDATE SET 
                label=excluded.label, updated_at=excluded.updated_at
            ''',
            (normalized_mac, label, datetime.now())
        )
        conn.commit()
    
    
def delete_label_db(normalized_mac, label):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            DELETE FROM 
                device_labels 
            WHERE mac = ?
            ''', 
            (normalized_mac, label)
        )
        deleted = c.rowcount > 0
        conn.commit()
        
        return deleted
    