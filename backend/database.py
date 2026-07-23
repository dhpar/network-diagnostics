from datetime import datetime
import os
import sqlite3;
from typing import TypedDict

class Device(TypedDict):
    id: int
    mac: str
    ip: str
    hostname: str | None
    vendor: str | None
    last_seen: datetime
    status: str | None
    vendor: str | None
    
class network_scans(TypedDict):
    id: int
    scan_type: str
    timestamp: datetime
    results: str

class Mac_w_Label(TypedDict):
    id: int
    mac: str
    label: str | None
    updated_at: str | None
    
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
                    mac TEXT UNIQUE NOT NULL,
                    random_mac BOOLEAN,
                    ip TEXT,
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
    
def insert_or_replace_device_db(device:Device, resolved_hostname, now, random_mac):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        ip = device.get('ip') or 'Unknown'
        mac = device.get('mac') or 'Unknown'
        vendor = device.get('vendor') or 'Unknown'
        hostname = device.get('hostname') or resolved_hostname or 'Unknown'
        random_mac = bool(device.get('random_mac'))
        
        c.execute('''
            INSERT INTO 
                devices (
                    mac, random_mac, ip, hostname, status, vendor, last_seen)
            VALUES 
                (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(mac) DO UPDATE SET
                ip = CASE WHEN ip IS NOT excluded.ip THEN excluded.ip ELSE ip END,
                random_mac = CASE WHEN random_mac IS NOT excluded.random_mac THEN excluded.random_mac ELSE random_mac END,
                hostname = CASE WHEN hostname IS NOT excluded.hostname THEN excluded.hostname ELSE hostname END,
                status = CASE WHEN status IS NOT excluded.status THEN excluded.status ELSE status END,
                vendor = CASE WHEN vendor IS NOT excluded.vendor THEN excluded.vendor ELSE vendor END,
                last_seen = excluded.last_seen
            ''', 
            (
                mac, random_mac, ip, hostname, 'online', vendor, now
            )
        )
    
def get_devices_with_label_db() -> list[Device]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        rows = c.execute('''
            SELECT 
                d.ip, d.mac, d.random_mac, d.hostname, d.vendor, d.last_seen, d.status, l.label
            FROM 
                devices d
            LEFT JOIN 
                device_labels l ON UPPER(d.mac) = l.mac
            ORDER BY 
                length(d.ip) ASC, d.ip 
            ASC
        ''')
        rows_list = rows.fetchall()
    
        return rows_list

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
    