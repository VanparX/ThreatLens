# 🛡️ ThreatLens — Security Threat Monitoring & Incident Response Platform

ThreatLens is an autonomous, full-stack Security Operations Center (SOC) platform that unifies security log ingestion, real-time threat correlation, dynamic risk scoring, alert triage, and incident response tracking into a centralized console.

Modern enterprise IT infrastructures generate vast volumes of fragmented security telemetry across firewalls, SSH bastions, ingress proxies, and host operating systems. Traditional enterprise SIEM solutions can be prohibitively complex and resource-heavy for smaller teams, while basic logging tools lack correlation, risk scoring, and structured containment workflows. ThreatLens addresses this challenge by providing an end-to-end security operations pipeline that normalizes incoming telemetry, correlates events against sliding-window rules, computes deterministic risk scores ($0–100$), and coordinates incident response.

Designed as an engineering capstone in Full Stack Development and Cybersecurity Engineering, ThreatLens demonstrates defense-in-depth security monitoring—from low-level Linux kernel and systemd journal collection on monitored endpoints to executive posture visualizations.

---

## ✨ Key Features

- 🛡️ **Security Log Monitoring**: Centralized ingestion and normalization of security events into a standardized schema with categorized event types, normalized severity ratings, IP tracking, and structured metadata.
- 🐧 **Linux Telemetry Collection**: Lightweight, zero-dependency Python daemon that streams authentic OpenSSH and sudo security telemetry directly from `systemd-journald` with persistent cursor tracking.
- ⚡ **Rule-Based Threat Detection**: Asynchronous correlation engine supporting single-event pattern matches and temporal sliding-window frequency thresholds (e.g., detecting brute-force bursts within a configurable time window).
- 🎯 **Risk Scoring & Automated Alerting**: Deterministic composite risk scoring ($0–100$) based on event severity, rule severity, frequency multipliers, and event-type risk weights, with automatic alert escalation for High and Critical threats.
- 🚨 **Incident Management & Containment**: Collaborative case management for triaging alerts, assigning investigators, documenting findings, and tracking containment playbooks (IP quarantine, user account lockout, session token revocation).
- 📊 **Real-Time SOC Dashboard**: Live operations dashboard visualizing security posture scores, 24-hour log ingestion trends, alert severity distributions, and active incident velocity.
- 🔔 **Multi-Channel Notifications**: Real-time alerting supporting automated HTML security bulletins via SMTP email, emergency notification dispatch, and configurable severity filters.
- 🔐 **Role-Based Access Control (RBAC)**: Fine-grained access control with distinct operational roles (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`) and stateless HMAC-SHA512 JWT authentication.
- 📜 **Application Audit Trail**: Application-level, append-only audit trail recording user logins, rule updates, alert triage decisions, and containment actions for strict operational accountability.
- 🎨 **Precision SOC Theme System**: High-contrast, accessibility-conscious interface designed in a Slate & Charcoal Grey aesthetic with seamless dark and light theme switching.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 6, React Router 7, Axios, Recharts, Lucide Icons | Responsive SOC console, navigation tile grid, interactive telemetry charts, and authentication transitions |
| **Backend** | Java 21 LTS, Spring Boot 4.1.1, Spring Security, Spring Boot Actuator, Spring Mail | REST APIs, asynchronous event pipeline, security filter chain, and system health telemetry |
| **Authentication** | JSON Web Tokens (`io.jsonwebtoken` 0.12.6, HMAC-SHA512), BCrypt | Stateless bearer authentication and password hashing (work factor 10) |
| **Database** | MongoDB 7.0 (via Spring Data MongoDB) | High-throughput document store for security logs, rules, alerts, incidents, and audit records |
| **Collector** | Python 3.10+ (Standard Library only) | Zero-dependency Linux daemon for `systemd-journald` log streaming, parsing, and buffered delivery |
| **DevOps & Tooling** | Docker, Docker Compose, Maven Wrapper (`./mvnw`), npm | Containerized database provisioning, reproducible builds, and dependency management |

---

## 🏛️ System Architecture

ThreatLens follows a decoupled client-server architecture with an independent Linux endpoint collector:

```text
                      +-----------------------------+
                      |   Monitored Linux Host      |
                      |   (systemd-journald)        |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |    Linux Log Collector      |
                      | (threatlens_collector.py)   |
                      +--------------+--------------+
                                     | HTTP / JSON (Bearer JWT)
                                     v
                      +-----------------------------+
                      |     Spring Boot Backend     |
                      |   • REST Ingestion & APIs   |
                      |   • Security & Auth (JWT)   |
                      +-------+--------------+------+
                              |              |
             Persist Telemetry|              | Async Ingest Event
                              v              v
                      +---------------+ +-----------------------------+
                      |    MongoDB    | | Detection & Alert Engine    |
                      | (Port 27018)  | | • Rule Matcher (Sliding Win)|
                      +---------------+ | • Risk Scoring (0–100)      |
                                        | • Alert Auto-Escalation     |
                                        +--------------+--------------+
                                                       | REST API (Bearer JWT)
                                                       v
                                        +-----------------------------+
                                        |   React SOC Web Console     |
                                        |   • Command Hub & Dashboard |
                                        |   • Triage & Investigations |
                                        +-----------------------------+
```

### Component Responsibilities

- **Linux Collector**: Tails systemd journal events on the monitored host, normalizes OpenSSH and sudo activity, manages an on-disk cursor for at-least-once delivery, and forwards events via authenticated HTTP requests.
- **Spring Boot Backend**: Validates incoming logs, persists records to MongoDB, publishes asynchronous processing events, evaluates detection rules, computes risk scores, and dispatches outbound notifications.
- **MongoDB**: Serves as the primary operational data store for security logs, detection rules, alert cases, incidents, notification logs, and audit entries.
- **React Console**: Provides the web interface for analysts to monitor system health, explore logs, triage alerts, investigate incidents, and administer detection rules and users.

---

## 📋 Getting Started & Prerequisites

Ensure the following tools are installed on your system:

- ☕ **Java**: OpenJDK 21 LTS (`java -version`)
- 🟢 **Node.js**: Node.js 20+ and npm (`node -v`, `npm -v`)
- 🐳 **Docker**: Docker Engine and Docker Compose v2 (`docker compose version`)
- 🐍 **Python**: Python 3.10+ (required only if running the Linux collector)
- 🐙 **Git**: Git command-line client (`git --version`)

---

## ⚙️ Installation & Configuration

### 1. Clone the Repository

```bash
git clone https://github.com/vanparx/Threatlens.git
cd Threatlens
```

### 2. Configure Backend Environment

Copy the example environment file and customize it if needed:

```bash
cp .env.example .env
```

The default values in `.env.example` are pre-configured to work out-of-the-box with the local Docker Compose MongoDB setup.

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. (Optional) Configure Linux Collector

If you plan to collect authentic telemetry from an active Linux machine:

```bash
cd collectors/linux
cp collector.env.example collector.env
chmod 600 collector.env
cd ../..
```

Update `collector.env` with your backend server URL and collector service account credentials.

---

## 🚀 Running the Application

### Step 1: Start MongoDB

Start the containerized MongoDB instance from the repository root:

```bash
docker compose up -d
```

*MongoDB runs on `localhost:27018` with data persisted to a dedicated Docker volume.*

### Step 2: Start the Backend

In a terminal window:

```bash
cd backend
./mvnw spring-boot:run
```

The Spring Boot backend will compile, connect to MongoDB, seed the initial administrator account and default detection rules, and begin listening on `http://localhost:8080`.

Verify service health:
```bash
curl http://localhost:8080/actuator/health
# Expected response: {"status":"UP"}
```

### Step 3: Start the Frontend

In a second terminal window:

```bash
cd frontend
npm run dev
```

The Vite development server will start and provide a local URL:
```text
http://localhost:5173
```

Open this address in your browser to access the ThreatLens SOC Console.

### 🔑 Default Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **SOC Administrator** | `admin` | `ChangeMe!Admin123` |

*(A "Prefill credentials" shortcut is available on the login page for rapid local evaluation).*

### Step 4: (Optional) Start the Linux Collector

For standard local evaluation or dashboard demonstration, the collector is **not required**; you can use the built-in **Attack Simulator** inside the Log Explorer to generate sample security events with a single click.

To stream authentic telemetry from an active Linux machine:

```bash
cd collectors/linux
python3 threatlens_collector.py
```

---

## 📁 Project Structure

```text
Threatlens/
├── .env.example                   # Environment configuration template
├── docker-compose.yml             # MongoDB 7 container definition
├── README.md                      # Project documentation
│
├── backend/                       # Spring Boot 4.1.1 Core Backend (Java 21)
│   ├── mvnw / mvnw.cmd            # Maven wrapper scripts
│   ├── pom.xml                    # Maven project configuration
│   └── src/
│       ├── main/java/com/threatlens/
│       │   ├── alert/             # Alert management domain
│       │   ├── audit/             # Append-only audit logging
│       │   ├── auth/              # JWT security, users, and RBAC
│       │   ├── common/            # Global responses and error handlers
│       │   ├── dashboard/         # Aggregated SOC metrics & statistics
│       │   ├── detection/         # Rule matching & risk scoring engine
│       │   ├── incident/          # Incident response & containment tracking
│       │   ├── log/               # Log ingestion, normalization, and search
│       │   ├── notification/      # Email and notification dispatch services
│       │   └── rule/              # Detection rule configuration & tuning
│       └── test/java/com/threatlens/ # Comprehensive backend test suites
│
├── frontend/                      # React 18 / Vite 6 SOC Console
│   ├── index.html                 # HTML application entry point
│   ├── package.json               # Frontend dependencies & build scripts
│   ├── vite.config.js             # Vite configuration
│   └── src/
│       ├── api/                   # Axios HTTP client with JWT interceptors
│       ├── components/            # Reusable UI primitives, shell, animations
│       ├── context/               # Auth, theme, and transition state providers
│       ├── pages/                 # SOC views (Dashboard, Logs, Incidents, etc.)
│       └── index.css              # Global design system & theme variables
│
└── collectors/
    └── linux/                     # Standalone Python Linux Collector
        ├── collector.env.example  # Collector configuration template
        ├── threatlens_collector.py # Log streaming daemon with retry & backoff
        ├── parser.py              # OpenSSH and sudo journal normalization
        └── test_collector.py      # Collector unit test suite
```

---

## ⚠️ Scope & Operational Boundaries

To maintain technical transparency, please note the following current architectural boundaries:

- **Rule-Based Correlation**: Threat detection uses deterministic rule matching and sliding-window frequency thresholds; it does not employ machine learning or statistical anomaly modeling.
- **Simulated Containment**: Incident containment actions (Quarantine IP, Lock User, Revoke Token) are recorded within ThreatLens for case management and auditing (`mode: SIMULATED`). They do not alter external firewall rules, operating systems, or cloud identity providers.
- **Notification Channels**: Email delivery via SMTP (e.g., Gmail, Mailtrap) is fully functional. SMS notifications are processed by an internal telecom gateway simulator for demonstration purposes. Webhook delivery is currently configuration-only.
- **Deployment Scope**: The application is configured for local evaluation and internal network deployment over HTTP. Production deployments require a reverse proxy (e.g., Nginx, Caddy) to terminate TLS/HTTPS.

---

## 🔮 Future Roadmap

- 🛡️ **Active SOAR Connectors**: Implement direct integrations with firewalls (`iptables`, `nftables`, AWS Security Groups) and identity providers for live automated containment.
- ⚡ **Real-Time Streaming**: Replace polling with WebSockets or Server-Sent Events (SSE) for live telemetry feeds and instant alert banners.
- 🌐 **Threat Intelligence Enrichment**: Integrate automated lookups against external reputation feeds (e.g., AbuseIPDB, VirusTotal) during event ingestion.
- 🔑 **Distributed Agent Management**: Add mutual TLS (mTLS) and centralized policy management for multi-host collector deployments.
