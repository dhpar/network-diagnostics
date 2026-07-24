# Network Diagnostics Project — Conversation Summary

**Repo:** https://github.com/dhpar/network-diagnostics
**Stack:** Flask (backend, plain `sqlite3`, no ORM) + React/Vite + TanStack Router/Query (frontend) + scapy (network layer)
**Dev environment:** WSL2 on Windows, currently mid-decision about migrating to native Windows (see final section)

This document summarizes an extended debugging/feature-building session. Treat it as context, not as a spec, some described bugs have been fixed, some fixes were later found to have side effects, and the project may currently be **mid-migration to native Windows**.

---

## 1. Project structure (as of last review)

```
network-diagnostics/
├── backend/
│   ├── app.py              # Flask entrypoint, starts background_scan() thread, calls init_db()
│   ├── routes.py           # All API routes (Blueprint)
│   ├── utils.py            # Core network logic: scan_network, traceroute_host, get_local_ip,
│   │                       #   get_net_mask, get_gateway, get_vendor, is_using_vpn, background_scan
│   ├── database.py         # Raw sqlite3, DB_PATH pinned to absolute path, init_db(), get_db()
│   ├── wifi.py             # WSL→Windows bridge for WiFi scanning (currently broken, see §5)
│   ├── windows/
│   │   └── wifi_scan.py    # Meant to run under NATIVE Windows Python only (pywifi-based)
│   ├── requirements.txt
│   ├── ensure_venv.sh       # Auto-creates venv + installs deps + setcap, used as VS Code preLaunchTask
│   ├── Dockerfile
│   └── network_diagnostics.db
├── frontend/                # Vite + React + TanStack Router/Query + Tailwind
│   ├── src/routes/          # Devices.tsx, Traceroute.tsx, etc.
│   ├── Dockerfile
│   └── vite.config.ts
├── docker-compose.yml
└── .vscode/
    ├── launch.json          # Flask debug config, pinned interpreter, preLaunchTask
    └── tasks.json            # ensure-venv task
```

**Known dead/leftover code still in the repo:** `wifi.py`'s old monitor-mode `sniff()`/`iface()`/`callBack()` functions (guarded behind `if __name__ == "__main__"` now, harmless but unused), `get_arp_table()` (superseded by scapy ARP broadcast approach).

---

## 2. Major topics covered, roughly chronological

### 2.1 Environment & tooling setup
- Where to put unit tests (`tests/` mirroring `netwatch/`, pytest recommended over `unittest`).
- WSL2 networking mode: switched from NAT to **mirrored networking** (`.wslconfig` → `networkingMode=mirrored`) to fix WSL reporting its own virtual interface instead of real LAN info. Requires Windows 11 22H2+.
- Identifying the correct network interface among WSL2's mirrored interfaces (`eth-0`, `eth-4`, plus Docker's `br-*`/`veth*` noise) via `ip route get 8.8.8.8`.
- Fixed `wifi.py`'s hardcoded `"eth4"` interface lookup (fragile, breaks if interface numbering shifts).

### 2.2 Device scanning (`scan_network`)
- **Original bug:** only pinged 3 hardcoded IPs (`.1`, `.2`, `.254`) then read the OS ARP cache, which is lazily populated — massively undercounted real devices on the LAN.
- **Fix:** rewritten to send a single scapy ARP broadcast (`srp()`) across the `/24` subnet, collecting all replies at once. Faster and works around devices that block ICMP but must answer ARP.
- Requires elevated privileges (raw sockets) — solved via `sudo setcap cap_net_raw,cap_net_admin=eip $(readlink -f venv/bin/python)`. **This grant is tied to the specific interpreter binary** — breaks every time the venv is recreated or the interpreter is switched (happened multiple times this conversation).
- `background_scan()`: runs every 30s in a background thread, upserts devices, marks previously-seen devices `offline` if they don't respond to the current scan (initially this was missing — devices only ever showed whichever responded in the last 3-second window).
- **Found later: `background_scan()` was never actually being called anywhere** (dead code) — same for `init_db()`. Fixed by wiring both into `app.py` at startup, with a reloader-safety guard (later found to be wrong for this project, see below).

### 2.3 Devices table schema evolution
- Originally keyed by `ip` (`UNIQUE` constraint) — **wrong**, since DHCP reassigns IPs over time, orphaning history.
- Added separate `device_labels` table (keyed by `mac`, decoupled from the scan-derived `devices` table) so user-entered labels survive DB resets and IP churn. Endpoints: `PUT`/`DELETE /api/devices/<mac>/label`.
- Later, the main `devices` table itself was also switched to be keyed by `mac` (not `ip`), with a conditional `INSERT ... ON CONFLICT(mac) DO UPDATE` upsert that only rewrites columns that actually changed, while `last_seen` always bumps (deliberately excluded from the "did anything change" check, since a timestamp always differs).
- Added `vendor` (OUI/MAC-vendor lookup via `scapy.conf.manufdb._get_manuf()`, no new dependency) and was in progress of adding `random_mac` (detecting privacy-randomized MACs via the U/L bit) when a **SQL bug** (typo `excluded.vendro`, plus a missing comma in the `SET` clause) caused the entire upsert to silently fail every cycle (caught by a broad `except Exception` in `background_scan()`, only visible via terminal print).
- **TanStack Query wiring done:** `useDevices()` (polls every 30s to match `background_scan`'s cadence), `useSetDeviceLabel()` / `useDeleteDeviceLabel()` mutations with `invalidateQueries` on success.

### 2.4 Traceroute feature
- Originally asked for FastAPI, clarified user wanted a **Flask** route instead (project has no FastAPI anywhere).
- First implementation used scapy `sr1()` with increasing TTL — **failed on WSL2**: packets sent and received (confirmed via `sr1` verbose output) but scapy couldn't correlate replies to probes. Root cause determined to be a WSL2 mirrored-networking limitation with raw packet capture/correlation, not a permissions issue (ruled out via testing — `sr1`/`sniff` behave differently from `srp`, and `iface=` has no effect on L3 `sr1()` per scapy's own `SyntaxWarning`).
- **Fix: shell out to the system `traceroute` binary** (UDP-mode, no raw sockets/sudo needed) and parse its text output with regex instead of reimplementing via scapy.
- Added: reverse DNS hostnames per hop (parallelized via `ThreadPoolExecutor`, bounded per-lookup timeout since PTR lookups can hang), fallback to the originally-queried hostname for the final hop if it has no PTR record, split timing (`traceroute_ms` / `dns_lookup_ms` / `total_ms`).
- Clarified: hop RTTs are cumulative round-trips from the origin, not incremental per-hop; summing them is meaningless. The last hop's RTT is already the full round-trip; halving it gives a rough (assumes symmetric routing) one-way estimate.
- Explained: timeout hops are often normal (routers deliberately not replying to traceroute probes) — the real red flag is timeouts persisting to `max_hops` with the destination never reached.

### 2.5 WiFi scanning — the most troubled subsystem
- Goal: get WiFi signal/network info, but **WSL2 has no driver-level access to the WiFi radio**, ruled out entirely for monitor-mode scapy sniffing.
- **Chosen approach:** shell out from WSL to a **separate, native Windows Python process** running `windows/wifi_scan.py`, which uses `pywifi` (Windows Native WiFi API) — gives per-network signal strength (`signal_dbm`), NOT raw per-packet `dBm_AntSignal`/`dBm_AntNoise` (that would require true monitor-mode capture, a bigger, separate lift, likely via Npcap).
- Numerous interop bugs fought through, in order:
  1. Leading space typo in `script_path_wsl`.
  2. Bare `"python.exe"` call resolving to a *different* Windows Python install than the one `pywifi` was actually installed into (multiple Pythons on PATH) — solved via `get_windows_python_path()` using `where.exe` + `wslpath -u`.
  3. Forward-slashes vs backslashes in the `wslpath -w` output confusing Windows path resolution — fixed by `.replace('/', '\\')`.
  4. **User then introduced a regression**: pasted the WSL-side `wslpath`-based path-conversion logic into `windows/wifi_scan.py` itself (the file meant to run natively on Windows), creating confusing self-referential code. Since `wslpath` doesn't exist on native Windows, this failed with `FileNotFoundError`, caught and returned as a literal string `"Error: The specified command or executable could not be found."` — which then got `json.loads()`'d on the WSL side and reported as `"networks"`, with `"count": 62` being `len()` of that error *string*, not a device count. Diagnosed by literally counting the string's characters (62) to confirm.
  5. Confirmed the actual `pywifi` scan logic was disabled the whole time (commented out), replaced by the broken redirection above.
  6. After restoring proper `pywifi` code: user ran it via VS Code's "Run" button, which used the **WSL interpreter** (traceback showed a `/home/david/...` path, not a Windows path) instead of routing through the actual subprocess bridge — explains `ModuleNotFoundError: No module named 'pywifi'` despite it being installed on the Windows side.
  7. When run correctly via a real Windows Python, hit `ModuleNotFoundError` (implied) on `comtypes` (a `pywifi` dependency not always auto-installed). Installed via `pip install comtypes`, but **still failed** — at this point the user decided to pursue a full migration to native Windows rather than keep fighting the WSL/Windows boundary.
  8. Along the way, flagged that the interpreter shown in tracebacks (`AppData\Local\Packages\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0`) is the **Microsoft Store Python**, which runs sandboxed (AppContainer) and has a known history of causing exactly this kind of deep-OS-access failure (COM/WLAN API access via `comtypes`) — recommended switching to a python.org install as a likely real fix, not yet confirmed.

### 2.6 `get_local_ip()` / `get_net_mask()` / routing table quirks
- `scapy.conf.route.routes` entries are **6-tuples** `(net, msk, gw, iface, addr, metric)`, not 5 — a bug (`for net, msk, gw, iface, addr in ...`, missing `metric`) was found via a user-shared traceback pointing at a previously-unseen `get_net_mask()` function (using `netifaces` at the time).
- `netifaces` dependency caused a **build failure on a fresh venv** (`Failed building wheel for netifaces`) — root cause was missing `build-essential`/`python3-dev`, not a broken package (confirmed by successfully building it in a clean sandbox venv). Also flagged `netifaces` as unmaintained (last release 2022) and unnecessary, given scapy already provides equivalent routing-table access.
- **Rewrote `get_net_mask()` using only scapy**, filtering out `/32` host-specific routes and `224.0.0.0/4` multicast entries to isolate the real LAN subnet route, tested against live routing table data.
- **VPN complication:** user reported `get_net_mask()` returning `None` while behind a VPN. Root cause: VPN tunnel interfaces are legitimately point-to-point `/32` links, which the filter above (correctly, for normal LAN interfaces) excludes — breaking specifically for VPN tunnels. Added `is_using_vpn()` heuristic (interface name pattern matching + detecting a lone `/32` default-route entry) and a fallback in `get_net_mask()` that allows `/32` if nothing else qualifies.
- **User later reported the VPN theory was wrong** — disconnecting the VPN and rolling back the VPN-related code didn't fix a related "all devices show offline" symptom. Real root cause turned out to be **scapy caching the OS routing table in memory at load time**, never refreshing it — a long-running Flask process's scapy state can go stale across network changes (VPN connect/disconnect, switching networks) without a restart. Recommended `scapy.conf.route.resync()` at the top of each `background_scan()` cycle, and rewriting `get_local_ip()` to query `scapy.conf.route.route("0.0.0.0")[1]` fresh rather than trusting the separately-cached `scapy.conf.iface`.
- **However, the actual final root cause of "all devices offline" was unrelated to any of the above**: `app.py`'s reloader-safety guard (`if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':`) assumed Werkzeug's auto-reloader was active, but the user's `launch.json` has always used `--no-reload`, meaning `WERKZEUG_RUN_MAIN` is never set — **the guard silently prevented `background_scan()` from ever starting, full stop.** Confirmed by the user noting a breakpoint inside `scan_network()` never triggered. Fixed by removing the conditional guard entirely (safe specifically because this project's launch config never uses the reloader).

### 2.7 Router/DHCP/SSH exploration
- Discussed DHCP lease time discovery: not obtainable from other devices via ARP/broadcast; only the DHCP server (router) genuinely knows it. Options: router's own admin UI, SSH into router (if OpenWRT/DD-WRT-like, `/tmp/dhcp.leases`), or a router API if available.
- User found router SSH credentials; provided `ssh user@ip "cat /proc/net/arp"` and `cat /tmp/dhcp.leases` commands.
- Built a generic `run_command()` helper (list-based subprocess wrapper, deliberately avoiding `shell=True` to prevent command injection).
- Discussed secure password storage for the router SSH: recommended SSH keys over passwords where possible; if password-only, `.env` (already using `python-dotenv`) + confirmed `.gitignore` coverage + **`paramiko`** instead of shelling out to `ssh`/`sshpass` (avoids exposing the password in the process list via `ps aux`).

### 2.8 Docker
- `frontend/Dockerfile`: site wasn't reachable from the host despite `EXPOSE 3000` and correct `host: true` in `vite.config.ts` (ruled out the classic Vite-binding gotcha). **Actual root cause**: missing `.dockerignore` — local `node_modules` (built on the host, glibc) was being copied via `COPY . .` into the `node:alpine` (musl libc) image, overwriting the correctly-installed Alpine-compatible one, crashing Vite on startup before it could bind to any port at all. Fixed via `.dockerignore` (`node_modules`, `dist`, `.git`) and cleaned up a redundant double-`COPY` plus inconsistent `WORKDIR /` (should be `/frontend`, matching `docker-compose.yml`'s `develop.watch` target).
- Follow-up: site was reachable but **not live-reloading** on file changes — because `docker-compose.yml`'s `volumes:` bind mount was commented out. Fixed by uncommenting, with an **anonymous volume** for `node_modules` specifically (`- /frontend/node_modules`) to prevent the bind mount from re-overwriting the container's own correct `node_modules` with the host's. Also fixed `develop.watch`'s `target: /frontend/dist` (wrong — should be `/frontend/src`, since `dist` is a production build artifact, not what `vite dev` reads from).
- `backend/Dockerfile` has the same `WORKDIR /` vs. `docker-compose.yml`'s `./backend:/backend` volume mismatch — flagged as likely needing the same fix, not yet addressed.

### 2.9 VS Code `launch.json` / debugging
- Explained `"jinja": true` (Jinja2 template debugging support — **unused**, this project has no server-rendered templates, pure JSON API) and `--no-debugger`/`--no-reload` flags (disable Werkzeug's own interactive debugger and auto-reloader respectively, to avoid conflicting with VS Code's attached `debugpy` debugger — **this is also why the reloader-guard bug in §2.6 existed and went unnoticed for a while**).
- Diagnosed a `ModuleNotFoundError: No module named 'routes'` Flask CLI startup error down to `cwd`/`FLASK_APP` relative path resolution nuances (ultimately resolved by the user independently before a root cause was fully confirmed).
- Built `ensure_venv.sh` (auto-creates venv + `pip install -r requirements.txt` + `setcap` **only on first creation**) wired in via `.vscode/tasks.json` as a `preLaunchTask`, with `launch.json`'s `"python"` field pinned to the venv path explicitly (avoids depending on VS Code's currently-selected interpreter, which broke once already when the venv was deleted).
- Discussed (but did not implement) converting `backend/` into a real Python package via `__init__.py` — flagged as a **breaking change**, not a simple addition, since Flask's `prepare_import()` specifically relies on the *absence* of `__init__.py` for the current flat-import scheme (`from routes import routes`, etc.) to work. User decided not to pursue this.

### 2.10 Other backend bugs fixed along the way
- CORS errors in the browser (`No 'Access-Control-Allow-Origin' header`) were a **red herring** — the actual issue was an unhandled 500 error inside an endpoint (`get_local_ip()`/`get_gateway()` crashing), and Flask-CORS doesn't attach CORS headers to error responses that occur before its `after_request` hook runs cleanly. Confirmed by reproducing both the working (200, header present) and broken (500, header absent) cases side-by-side.
- SQLite `attempt to write a readonly database` — traced to the DB file having been created once under `sudo` (root-owned), then later accessed as a normal user. Fixed by deleting and letting it recreate, plus pinning `DB_PATH` to an absolute path (via `os.path.dirname(os.path.abspath(__file__))`) to prevent the DB file's location silently depending on whatever the current working directory happens to be at Flask startup (a recurring theme in this project).
- `CAP_NET_RAW`/`CAP_NET_ADMIN` permission errors recurred **multiple times** across the conversation, each time a new venv/interpreter was created (interpreter switch forced by VS Code, venv deleted/recreated, etc.) — this is why `ensure_venv.sh` now automates the `setcap` grant automatically on venv creation.

---

## 3. Constraints & environment facts worth remembering

- **OS/dev environment:** WSL2 (Ubuntu) on Windows, mirrored networking mode enabled. **Currently mid-decision on migrating fully to native Windows** (see §5) due to the accumulated WiFi-scanning pain.
- **Python:** 3.12 in the WSL venv. Windows-side Python has been the Microsoft Store version (`PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0`) — **flagged as likely problematic** due to AppContainer sandboxing; a python.org install is recommended but not yet confirmed switched.
- **No ORM** — raw `sqlite3`, hand-written SQL, `Row` factory for dict-like access.
- **Frontend:** Vite + React + TanStack Router + TanStack Query + Tailwind (NOT Next.js, despite user's stated general background being Next.js-leaning — this specific project uses Vite/TanStack Router based on files seen in the repo).
- **User's stated background:** full-stack engineer, strong in React/Next/TypeScript, newer to Python/AI — explanations have generally been pitched with more detail on the Python/networking side, less on frontend/React concepts.
- **Raw socket privilege model on Linux:** `setcap cap_net_raw,cap_net_admin=eip` on the specific venv interpreter binary — must be re-run every time the venv/interpreter changes. No direct equivalent on Windows (would require either full Administrator elevation or Npcap-specific permission handling).
- **`docker-compose.yml` implies Docker Desktop**, which itself depends on WSL2 (or Hyper-V) even on Windows — relevant if/when the native-Windows migration happens, since Docker wouldn't actually remove the WSL2 dependency, just hide it.

---

## 4. Open items / things not yet finished

1. **WiFi scanning is currently broken** on the WSL/Windows bridge approach (`comtypes`/`pywifi` failing even after installing `comtypes`, suspected Microsoft Store Python sandboxing). This is the immediate trigger for considering a full native-Windows migration.
2. **`random_mac` column/detection** was being added (alongside `vendor`) when the SQL syntax bug (§2.3) was found and fixed — worth confirming the `random_mac` logic itself (the U/L bit check discussed in §2 "other device info") was actually completed and wired in correctly, not just the syntax fix.
3. **`backend/wifi.py`'s WSL-side function was reverted** back to a bare `"python.exe"` call at some point (regression from the `get_windows_python_path()`/`where.exe` discovery fix built earlier) — flagged but not yet re-fixed as of the last exchange.
4. **`backend/Dockerfile`** likely has the same `WORKDIR /` vs. volume-mount mismatch as `frontend/Dockerfile` did — flagged, not yet fixed.
5. **`traceroute_host()` on native Windows** would need a full rewrite (different `tracert.exe` flags, different output format) if the migration proceeds — not started.
6. **Full Windows migration** was outlined step-by-step (Npcap install, python.org Python, `ensure_venv.ps1` rewrite, `launch.json` path updates, `wifi.py` simplification, `traceroute_host()` rewrite, Docker-still-needs-WSL2 consideration) but not yet executed — this was the last topic discussed before this summary was requested.
7. Suggested-but-not-yet-built features from the "other scapy features" discussion: ARP spoofing/poisoning detection (ranked highest value), Wake-on-LAN (cheap, reliable), DNS-server-comparison testing (untested against the same WSL2 reply-correlation risk traceroute hit), mDNS/SSDP passive listening for richer device identification (biggest lift, not started).

---

## 5. Native Windows migration plan (as last discussed, not yet executed)

1. Install Python from **python.org** (not MS Store), Npcap (WinPcap-compatible mode checked), Node.js, native Git.
2. Clone repo directly onto Windows filesystem (`C:\...`), not via a WSL/UNC path.
3. `python -m venv venv`, `pip install -r requirements.txt` inside it.
4. **Permissions:** no `setcap` equivalent — run terminal/VS Code as Administrator instead (coarser than the current Linux setup).
5. **Rewrite `wifi.py`**: delete the WSL↔Windows subprocess bridge entirely, merge `pywifi` logic directly in-process. Delete `windows/` folder.
6. **Rewrite `traceroute_host()`**: `tracert.exe` uses different flags (`-d`, `-h`, `-w` in milliseconds) and a different output format — needs a new parser, not an adapted one.
7. Re-verify `get_local_ip()`/`get_net_mask()`/`is_using_vpn()` against real Windows interface names (won't look like `eth0`/`wlan0`).
8. Rewrite `ensure_venv.sh` → `ensure_venv.ps1`, drop the `setcap` step, add an elevation check/reminder instead.
9. Update `launch.json`: interpreter path becomes `...\\backend\\venv\\Scripts\\python.exe` (`Scripts`, not `bin`); `"sudo": true` becomes meaningless.
10. **Decide on Docker explicitly**: Docker Desktop for Windows still runs Linux containers via a hidden WSL2/Hyper-V backend — keeping the current `docker-compose.yml` means WSL2 isn't actually fully gone, just one layer removed from view.
