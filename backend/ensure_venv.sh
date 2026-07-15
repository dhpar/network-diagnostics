#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "Ensuring build tools are installed for native extensions (netifaces, etc)..."
    sudo apt-get install -y build-essential python3-dev

    echo "No venv found, creating one..."
    python3 -m venv venv

    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
    echo "venv created and dependencies installed."

    PYTHON_BIN=$(readlink -f ./venv/bin/python)
    echo "Granting raw socket capability to $PYTHON_BIN (needed for ARP scanning/traceroute)..."
    sudo setcap cap_net_raw,cap_net_admin=eip "$PYTHON_BIN"
    echo "Capability granted:"
    getcap "$PYTHON_BIN"
else
    echo "venv already exists, skipping setup."
fi