# System Health Monitoring Dashboard

A cross-platform system health monitoring project that collects and reports system status data (disk encryption, OS update status, antivirus status, sleep timeout) from client machines to a backend server, and displays a real-time dashboard in the frontend.

---

## Project Structure

- `backend/` — Node.js Express backend server with SQLite database to store system reports.
- `client/` — Node.js utility script to collect system health data and send it periodically to the backend.
- `frontend/` — React app displaying the system health dashboard with a table view.

---

## Features

### Client Utility
- Collects system information every 10 seconds:
  - **Machine ID** (hostname)
  - **Platform** (Windows, macOS, Linux)
  - **Disk Encryption Status**
    - Windows: Checks BitLocker status
    - macOS: Checks FileVault status
    - Linux: Detects encrypted volumes
  - **OS Update Status**
    - Windows: Retrieves date of last installed update
    - macOS: Checks for available software updates
    - Linux: Checks for upgradable packages (APT-based distros)
  - **Antivirus Status**
    - Windows: Uses PowerShell to detect Windows Defender status
    - macOS/Linux: Checks presence of common AV tools
  - **Sleep Timeout**
    - Reads system sleep timeout settings (<=10 mins flagged as good)
- Sends data to backend **only if system state changes** since last check.
- Stores last sent state locally to avoid redundant network calls.

### Backend Server
- REST API implemented with Express.js and SQLite:
  - `POST /report` — Receive and store system report from clients.
  - `GET /reports` — Get latest report per machine.
  - `GET /history` — Get full history of all reports.
- Database schema tracks:
  - machine_id, platform, disk_encryption, antivirus_status, sleep_timeout, and timestamp.

### Frontend Dashboard
- React app displaying:
  - Table of all machines with their latest health report.
  - Color-coded rows:
    - Green (safe) if disk is encrypted
    - Red (danger) if disk not encrypted
  - Columns:
    - Machine ID
    - Platform
    - Disk Encryption (✅/❌)
    - Antivirus status
    - Sleep Timeout (in minutes)
    - Last Seen timestamp
- Responsive styling with dark theme and hover effects.
