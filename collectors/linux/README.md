# ThreatLens Genuine Linux Security Event Collector

A lightweight, zero-dependency Python 3 collector agent designed for **Arch Linux** (and systemd-based Linux systems). It taps into `systemd-journald` in real time, normalizes OpenSSH and Sudo security events into the ThreatLens `SecurityLogRequest` contract, and forwards them over HTTP to the ThreatLens SIEM backend.

---

## 🛠️ Architecture & Reliability Model

```
 Arch Linux (Acer Predator)                          MacBook Air M4 (SIEM Host)
+------------------------------------+              +-------------------------------------+
| Systemd Journald                   |              | Spring Boot Backend (Port 8080)     |
|   ├── sshd.service                 |              |   ├── POST /api/auth/login          |
|   └── sudo / PAM logs              |              |   └── POST /api/logs                |
|           │ (JSON Stream)          |              |            │                        |
|           ▼                        |              |            ▼                        |
| threatlens_collector.py            |              | Threat Detection Engine             |
|   ├── Event Filter & Normalizer    |              |   ├── SSH Brute Force (Threshold >=3)
|   ├── Cursor Tracker (cursor.json) |  LAN HTTP    |   └── Privilege Escalation (Match)  |
|   ├── Backpressure Buffer Queue    |─────────────>|            │                        |
|   ├── Dead-Letter Store (400/422)  |              |            ▼                        |
|   └── JWT Authenticator & Retry    |              | SMTP Outbound Alert Notification    |
+------------------------------------+              +-------------------------------------+
```

### Key Reliability & Security Properties
1. **Zero External Dependencies**: Implemented using the Python 3 standard library only (`urllib`, `json`, `subprocess`, `re`, `ipaddress`, `time`). No `pip install` required.
2. **Delivery Semantics (At-Least-Once)**:
   - The collector guarantees **at-least-once delivery** subject to systemd journal retention (`SystemMaxUse` / `MaxRetentionSec`).
   - The on-disk cursor is durably updated (`fsync` on temporary file and parent directory) strictly upon confirmed backend receipt or explicit dead-letter quarantine.
   - If the backend accepts an event but cursor persistence fails, retries will re-deliver the event, which may produce duplicate records in backend storage; neither ThreatLens nor MongoDB automatically deduplicates ingested log records.
   - Restarts resume from the last committed cursor, ensuring no events are skipped unless rotated out by journald.
3. **No Head-of-Line Blocking (Poison Event Quarantine)**:
   - If the backend returns `HTTP 400 Bad Request` or `HTTP 422 Unprocessable Entity` (e.g. schema rejection), the collector appends the poison payload and error reason to `dead_letter.jsonl` and advances the cursor.
   - A single malformed event will **never** stall the forwarding pipeline for subsequent events.
4. **Arch Linux Journal Filtering Architecture**:
   - On Arch Linux, `sudo` is an interactive setuid CLI binary (`/usr/bin/sudo`), **not a systemd daemon service** (there is no `sudo.service`).
   - Specifying `-u sudo.service` in journalctl filters strictly by `_SYSTEMD_UNIT=sudo.service`, which matches zero entries and completely silences all sudo events.
   - Recommended configuration: Leave `COLLECTOR_JOURNAL_UNITS=""` (empty) so `journalctl` streams new journal entries, and the collector's parser normalizes `sshd` and `sudo` events (via `_SYSTEMD_UNIT`, `_COMM`, `SYSLOG_IDENTIFIER`, and `MESSAGE`) while discarding irrelevant system noise in microseconds.
   - Alternatively, to filter at the journald command level, specify field matches: `COLLECTOR_JOURNAL_UNITS=_COMM=sshd,+,_COMM=sudo`.
5. **Backpressure & Saturation Control**:
   - The buffer has a hard cap (`MAX_BUFFER_SIZE=1000`).
   - If the buffer is full during an outage, the collector **pauses journal consumption** rather than silently evicting items.
6. **Authorization Error Pausing (HTTP 403)**:
   - If the collector credentials lack the required `SECURITY_ANALYST` or `ADMIN` role, delivery pauses with a critical log message without discarding events.
7. **JWT Session Lifecycle**:
   - Automatically authenticates via `POST /api/auth/login`, caches the bearer token in memory, and transparently refreshes upon HTTP `401 Unauthorized`.
8. **Credential & Log Hygiene**:
   - Passwords and full/partial JWT strings are never printed to logs or state files.
   - `collector.env` is restricted via POSIX permissions (`chmod 600 collector.env`).
   - Local console events (such as local `sudo`) report an empty `sourceIp: ""` rather than a fabricated `127.0.0.1` address.

---

## 🛡️ Event Mappings & Severity Classification

| System Activity | Raw Journal Pattern | ThreatLens `eventType` | Severity | SOC Alert Triggered? |
| :--- | :--- | :--- | :--- | :--- |
| **Failed SSH Password (Invalid user)** | `Failed password for invalid user <user> from <ip>` | `AUTHENTICATION_FAILURE` | `HIGH` | Evaluates `"SSH Brute Force Detection"` rule. |
| **Failed SSH Password (Valid user)** | `Failed password for <user> from <ip>` | `AUTHENTICATION_FAILURE` | `MEDIUM` | Evaluates `"SSH Brute Force Detection"` rule. |
| **Failed SSH Public Key** | `Failed publickey for <user> from <ip>` | `AUTHENTICATION_FAILURE` | `MEDIUM` | Evaluates `"SSH Brute Force Detection"` rule. |
| **Successful SSH Login** | `Accepted publickey/password for <user> from <ip>` | `AUTHENTICATION_SUCCESS` | `INFO` / `LOW` | No alert (stored as audit trail telemetry). |
| **Unauthorized Sudo Elevation** | `<user> : user NOT in sudoers ...` | `PRIVILEGE_ESCALATION` | `HIGH` | **IMMEDIATE HIGH ALERT** + Email Notification. |
| **Sudo Authentication Failure** | `<user> : 1 incorrect password attempt ...` | `AUTHENTICATION_FAILURE` | `MEDIUM` | Ingested for anomaly correlation. |
| **Interactive Root Shell Spawn** | `sudo su`, `sudo -i`, `sudo -s`, `sudo /bin/bash` | `OTHER` | `LOW` | Logged as privileged execution with `is_interactive_shell=true` (**Audit Trail**). |
| **Routine Sudo Script/Command** | `sudo bash /opt/backup.sh`, `sudo pacman -Syu` | `OTHER` | `INFO` | Stored as routine administrative audit log (**No Alert**). |

> [!NOTE]
> **OpenSSH Duplicate Event Prevention**:
> OpenSSH logs two consecutive lines for invalid user logins: `Invalid user <user>` followed by `Failed password for invalid user <user>`. The collector deliberately ignores standalone `Invalid user` pre-auth notices to ensure one failed attempt emits exactly **one** `AUTHENTICATION_FAILURE` event.

---

## 🚀 Setup & Execution Guide (Arch Linux)

### Step 1: Copy Collector Files to Arch Linux
Copy the `collectors/linux/` directory to your Acer Predator (Arch Linux) machine:
```bash
scp -r collectors/linux/ <arch_user>@10.226.72.231:~/threatlens-collector/
```

### Step 2: Configure Environment & Permissions
On Arch Linux:
```bash
cd ~/threatlens-collector/
cp collector.env.example collector.env
chmod 600 collector.env
nano collector.env
```

Ensure configuration targets your MacBook:
```ini
THREATLENS_BACKEND_URL=http://10.226.72.236:8080
COLLECTOR_USERNAME=collector_arch_predator    # Or dedicated collector user
COLLECTOR_PASSWORD=your_secure_password
COLLECTOR_SOURCE_SYSTEM=archlinux-predator
COLLECTOR_HOST_IP=10.226.72.231
COLLECTOR_JOURNAL_UNITS=                      # Leave empty on Arch Linux to capture all sudo & sshd
```

### Step 3: Run Collector Tests
```bash
python3 test_collector.py
```
*Expected Output: `Ran 20 tests ... OK`.*

### Step 4: Run Collector in Foreground
```bash
python3 threatlens_collector.py
```

---

## 🧪 Real-World Verification Scenarios

### Scenario A: Unauthorized Sudo Attempt
```bash
sudo -k whoami
```
*Result*: Mapped to `PRIVILEGE_ESCALATION` (`HIGH`), triggering an immediate security incident and email bulletin.

### Scenario B: SSH Brute Force Detection
From another machine on the network, trigger 3 failed SSH logins:
```bash
ssh invaliduser@10.226.72.231
```
*Result*: The 3rd failure from the same IP within 60s triggers the `"SSH Brute Force Detection"` rule, creating a **HIGH Alert** and sending an email advisory.

### Scenario C: Routine Authorized Sudo Execution
```bash
sudo pacman -Syu
sudo bash /usr/local/bin/deploy.sh
```
*Result*: Mapped to `eventType: OTHER` (`INFO`), logging the administrative audit trail without raising a false-positive incident.
