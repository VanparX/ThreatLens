# ThreatLens — Autonomous Security Threat Monitoring & Incident Response Platform

ThreatLens is an autonomous, full-stack Security Operations Center (SOC) platform that integrates **SIEM (Security Information and Event Management)** log collection and normalization with **SOAR (Security Orchestration, Automation, and Response)** alerting, investigation, and containment tracking.

Built as an engineering capstone in Full Stack Development and Cybersecurity Engineering, ThreatLens demonstrates end-to-end cyber defense workflows: from authentic Linux kernel/systemd journal ingestion, through deterministic sliding-window correlation and multi-factor risk scoring, to multi-channel alert dispatch and incident response tracking.

---

## Table of Contents

1. [Project Introduction](#1-project-introduction)
2. [Project Objectives](#2-project-objectives)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Core Features — Detailed Explanation](#5-core-features--detailed-explanation)
6. [Linux Collector — Technical Documentation](#6-linux-collector--technical-documentation)
7. [Detection and Risk Scoring Engine](#7-detection-and-risk-scoring-engine)
8. [Alert and Incident Lifecycle](#8-alert-and-incident-lifecycle)
9. [Notification System](#9-notification-system)
10. [Security Architecture](#10-security-architecture)
11. [Installation and Setup](#11-installation-and-setup)
12. [Configuration Reference](#12-configuration-reference)
13. [API Overview](#13-api-overview)
14. [Testing and Verification](#14-testing-and-verification)
15. [Current Limitations](#15-current-limitations)
16. [Future Improvements](#16-future-improvements)
17. [Project Structure](#17-project-structure)
18. [Author and Project Information](#18-author-and-project-information)

---

## 1. Project Introduction

### What is ThreatLens?
ThreatLens is a modular, full-stack Security Operations Center (SOC) application designed to monitor IT infrastructure, ingest heterogeneous security logs, identify malicious behaviors in near-real-time, and provide security analysts with structured investigation and containment tools.

### What problem does it solve?
Modern organizational infrastructures produce high volumes of disparate security logs across firewalls, authentication gateways, ingress proxies, and endpoints. Security analysts face three distinct challenges:
1. **Telemetry Fragmentation**: Logs arrive in uncoordinated formats (syslog, JSON, systemd journal text) without unified schema normalization.
2. **Alert Fatigue**: Raw log flooding makes it difficult to distinguish routine operational events from active intrusions without correlation.
3. **Investigation Disconnect**: Many organizations maintain separate, siloed tools for log storage, alert triage, incident documentation, and operator auditing.

ThreatLens bridges these gaps into a single, cohesive SOC console that normalizes incoming logs into a strict schema, correlates events using configurable sliding-window rules, computes deterministic risk scores ($0 - 100$), automatically generates alerts, manages incident tracking, and dispatches external notifications.

### Why was this project developed?
ThreatLens was developed as an academic capstone project in Full Stack Development & Cybersecurity Engineering. The objective was to design, implement, and verify a complete, defense-in-depth security monitoring platform using enterprise technologies (Java 21, Spring Boot, MongoDB, React, Python) without relying on commercial third-party SaaS platforms for core detection and triage logic.

### What is its intended audience?
- **SOC Tier 1 & Tier 2 Analysts**: Triaging alerts, reviewing normalized log telemetry, assigning cases, and recording containment actions.
- **Security Engineers**: Authoring and tuning detection rules, configuring sliding time windows, and managing notification routes.
- **SOC Administrators**: Managing analysts, controlling role-based access, auditing operator actions, and verifying system health.
- **Academic Evaluators & Engineers**: Studying the implementation of modern security event processing, reliable collector design, and SOC dashboard UX.

### What makes it different from a basic log-monitoring application?
Unlike basic log viewers (which merely display raw database records or grep through log files), ThreatLens implements the complete security operations lifecycle:
- **Event Normalization**: Ingested events are mapped into a standardized `SecurityLog` contract with categorized event types, normalized severity, source/destination IP parsing, and structured metadata.
- **Stateful Sliding-Window Correlation**: The detection engine evaluates temporal frequency patterns (e.g., $\ge 3$ authentication failures within 60 seconds from the same source IP) alongside single-event pattern matches.
- **Multi-Factor Risk Scoring**: Every triggered detection receives an explainable $0 - 100$ risk score computed from log severity, rule severity, frequency multipliers, and event-type risk weights.
- **Automated Escalation Pipeline**: High and Critical detections automatically create triage alerts and trigger outbound notification dispatches.
- **Incident Management with Containment Tracking**: Alerts escalate into formal incident tickets with investigation notes and response action records.
- **Append-Only Audit Logging**: All analyst actions (login, triage, rule edits, user role changes, response actions) are recorded in an internal audit trail.

---

## 2. Project Objectives

ThreatLens was engineered to satisfy specific operational and technical goals:

1. **Centralized Security Log Ingestion**: Expose a high-throughput, authenticated REST endpoint (`POST /api/logs`) capable of accepting telemetry from diverse endpoints and infrastructure components.
2. **Security Event Normalization**: Transform heterogeneous log streams into a unified data model comprising timestamps, source/destination IP addresses, standardized event types (`AUTHENTICATION_FAILURE`, `BRUTE_FORCE`, `PRIVILEGE_ESCALATION`, `PORT_SCAN`, `RANSOMWARE_DETECTED`), severity ratings, and extensible JSON metadata.
3. **Rule-Based Threat Detection**: Implement an asynchronous, decoupled detection engine that evaluates newly ingested logs against active rules using both exact pattern matching and sliding-window frequency thresholds.
4. **Risk Scoring and Alert Generation**: Compute a transparent, deterministic composite score for each detection and automatically promote High and Critical detections to active alerts.
5. **Incident Investigation and Response Tracking**: Enable analysts to elevate alerts to formal incident investigations, document analyst notes, and log containment actions.
6. **Notification Delivery**: Dispatch immediate notifications to on-duty analysts via SMTP HTML email bulletins, simulated telecom SMS gateways, and configurable webhook endpoints.
7. **Audit Logging and Access Control**: Enforce stateless JWT authentication, fine-grained Role-Based Access Control (RBAC), and persistent audit trails across all administrative and operational touchpoints.

---

## 3. System Architecture

ThreatLens follows a decoupled client-server architecture with an independent endpoint collector agent:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               ARCH LINUX ENDPOINT                                      │
│                                                                                        │
│  systemd-journald (OpenSSH, PAM, Sudo)                                                 │
│         │                                                                              │
│         ▼ (JSON Stream via journalctl)                                                 │
│  threatlens_collector.py                                                               │
│    ├── parser.py (Event Filter & Normalizer)                                           │
│    ├── In-Memory Bounded Queue (Capacity: 1000)                                        │
│    ├── Dead-Letter Store (dead_letter.jsonl for HTTP 400/422)                          │
│    ├── Atomic Cursor State (collector_cursor.json)                                     │
│    └── HTTP Forwarder with JWT Session Management & Backoff                            │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ LAN HTTP (POST /api/logs with JWT)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SPRING BOOT BACKEND (Port 8080)                           │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Security Filter Chain & JWT Authentication Filter (HMAC-SHA512)                   │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                         │                                              │
│         ┌───────────────────────────────┴───────────────────────────────┐              │
│         ▼                                                               ▼              │
│  SecurityLogController                                          AuthController         │
│         │                                                               │              │
│         ▼                                                               ▼              │
│  SecurityLogService ──▶ MongoDB (security_logs)                   AuthService          │
│         │                                                               │              │
│         ▼ (Spring ApplicationEventPublisher: Async)                     ▼              │
│  ThreatDetectionService                                           MongoDB (users)      │
│    ├── RuleMatcher (PATTERN_MATCH & FREQUENCY_THRESHOLD)                               │
│    └── RiskScoringEngine (0-100 Composite Score)                                       │
│         │                                                                              │
│         ├──▶ MongoDB (threat_detections)                                               │
│         │                                                                              │
│         ▼ (If Severity == HIGH or CRITICAL)                                            │
│  AlertService ──▶ MongoDB (alerts)                                                     │
│         │                                                                              │
│         ├──▶ AuditService ──▶ MongoDB (audit_logs)                                     │
│         │                                                                              │
│         ▼ (Async)                                                                      │
│  NotificationService                                                                   │
│    ├── SMTP JavaMailSender ──▶ Analyst Email Inbox                                     │
│    ├── SMS Gateway Simulator ──▶ Simulated Carrier Dispatch                            │
│    └── MongoDB (notification_records, notification_settings)                           │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ REST API (Bearer JWT, JSON)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               REACT FRONTEND (Vite, Port 5173)                         │
│                                                                                        │
│  • Precision SOC Console Design System (Slate & Charcoal Grey, Dark/Light Themes)      │
│  • Command Hub (Executive Posture Barometer, Ingestion Health, Navigation Tiles)       │
│  • Security Dashboard (Recharts Telemetry, Incident Velocity, Severity Breakdowns)    │
│  • Security Log Explorer (Live Filtering, Severity Badges, Raw JSON Inspector)         │
│  • Attack Simulator (1-Click Brute Force, Ransomware, Port Scan, Sudo Elevation)       │
│  • Threat Detection Center & Alert Triage Center (Status Transitions, Assignments)     │
│  • Incident Response Workspace (Note Collaboration, Simulated Containment Playbooks)  │
│  • Detection Rules Manager (Sliding Window & Threshold Authoring)                     │
│  • Notification Settings & Dispatch Audit History                                      │
│  • User Management & RBAC Administration (ADMIN only)                                  │
│  • System Audit Log Explorer (Append-Only Operation Records)                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Lifecycle

1. **Ingestion**: The Linux collector (or attack simulator) transmits a JSON payload to `POST /api/logs`. The `JwtAuthenticationFilter` validates the bearer token, establishes security context, and the `SecurityLogService` persists the log into MongoDB.
2. **Event Publication**: Upon successful database persistence, `SecurityLogService` publishes an internal `SecurityLogIngestedEvent` via Spring's `ApplicationEventPublisher`.
3. **Decoupled Evaluation**: The `ThreatDetectionService` consumes the event asynchronously (`@Async`), querying all active `DetectionRule` definitions.
4. **Correlation & Scoring**:
   - `RuleMatcher` evaluates pattern conditions or executes a sliding-window count query across the database.
   - If a rule matches, `RiskScoringEngine` computes a $0 - 100$ score based on log severity, rule severity, frequency bonuses, and event-type weights.
   - The resulting `ThreatDetection` is stored with status `NEW`.
5. **Alert Promotion**: If the rule severity is `HIGH` or `CRITICAL`, `ThreatDetectionService` triggers `AlertService.createFromDetection()`, creating an `Alert` with status `OPEN` and updating the detection status to `ALERT_CREATED`.
6. **Notification Dispatch**: `AlertService` invokes `NotificationService.dispatchAlertNotifications()`, which checks minimum severity thresholds and dispatches HTML email bulletins over SMTP and creates delivery records.
7. **Incident Triage & Response**: Operators use the React console to inspect alerts, assign owners, escalate them to formal incidents, add investigation notes, and execute response playbooks.

---

## 4. Technology Stack

| Layer | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Java OpenJDK | `21 LTS` | Modern LTS Java runtime utilizing pattern matching, record types, and enhanced virtual threads. |
| **Backend Framework**| Spring Boot | `4.1.1` | Enterprise microframework providing auto-configuration, dependency injection, and data persistence. |
| **Database** | MongoDB | `7.0` | High-throughput, document-oriented NoSQL database optimized for JSON log storage, dynamic metadata schemas, and time-range indexing. |
| **Persistence Layer**| Spring Data MongoDB | *Managed* | Repository abstraction providing fluent queries, pagination, and document mapping. |
| **Security & Auth** | Spring Security & JJWT | `0.12.6` | Stateless security architecture using HMAC-SHA512 signed JWTs and BCrypt password encryption (strength 10). |
| **Observability** | Spring Boot Actuator | *Managed* | Production-grade health checks (`/actuator/health`), metrics, and readiness probes. |
| **Outbound Mail** | Spring Mail (Jakarta) | *Managed* | SMTP client abstraction configured with STARTTLS for authentic HTML security advisory delivery. |
| **Endpoint Collector**| Python | `3.10+` | Zero-dependency agent utilizing Python standard libraries (`urllib`, `subprocess`, `json`) for Linux telemetry collection. |
| **Frontend Runtime** | Node.js / Vite | `6.1.0` | Ultra-fast frontend build tooling, hot module replacement (HMR), and optimized production bundling. |
| **UI Framework** | React | `18.3.1` | Component-based UI library with declarative state management. |
| **Routing** | React Router | `7.18.5` | Declarative client-side routing, protected route guards, and navigation state management. |
| **HTTP Client** | Axios | `1.7.9` | Promise-based HTTP client with request/response interceptors for JWT injection and 401 token expiration handling. |
| **Data Visualization**| Recharts | `3.10.1` | Composable charting library built on React SVG components for real-time security telemetry graphs. |
| **Iconography** | Lucide React | `0.475.0` | Clean, standardized vector iconography across all SOC navigation and status displays. |
| **Containerization** | Docker & Compose | `Compose v2` | Containerized MongoDB orchestration ensuring reproducible database provisioning on port `27018`. |

---

## 5. Core Features — Detailed Explanation

### 1. Authentication and RBAC
- **What it does**: Provides secure user authentication, token issuance, session verification, and role-based route protection.
- **How it works internally**: Users submit credentials to `POST /api/auth/login`. Passwords are verified against BCrypt hashes in MongoDB. Upon verification, the backend issues an HMAC-SHA512 signed JWT containing username and roles. The frontend stores the token in `localStorage`, attaches it via Axios interceptors, and enforces access control via `ProtectedRoute.jsx`.
- **Components involved**: `AuthController.java`, `AuthService.java`, `JwtService.java`, `JwtAuthenticationFilter.java`, `AuthContext.jsx`, `ProtectedRoute.jsx`.
- **Backend APIs**: `POST /api/auth/login`, `POST /api/auth/register`.
- **Limitations**: JWT tokens are stateless with 24-hour expiration; immediate server-side revocation before token expiration relies on client-side token deletion.

### 2. SOC Command Hub
- **What it does**: Serves as the primary operational landing portal immediately following analyst authentication.
- **How it works internally**: Aggregates environment health status, active threat counts, and telemetry rates into an executive barometer. Renders a modern two-column navigation tile grid organizing workspaces across Operations, Threat Intelligence, and Governance.
- **Components involved**: `CommandHub.jsx`, `DashboardController.java`, `DashboardService.java`, `KPICard.jsx`.
- **Backend APIs**: `GET /api/dashboard/stats`, `GET /actuator/health`.
- **Limitations**: Telemetry widgets display computed real-time database counts; decorative telemetry animations reflect illustrative network throughput.

### 3. Security Dashboard
- **What it does**: Visualizes security metrics, event trends, severity distributions, and recent threat activity.
- **How it works internally**: Queries MongoDB aggregation pipelines for 24-hour log volume histograms, alert severity breakdowns (Critical, High, Medium, Low), and unresolved incident tallies. Renders charts using Recharts.
- **Components involved**: `Dashboard.jsx`, `DashboardController.java`, `DashboardService.java`.
- **Backend APIs**: `GET /api/dashboard/stats`.
- **Limitations**: Metrics are calculated upon page load and manual refresh; background auto-polling occurs every 30 seconds.

### 4. Security Log Explorer
- **What it does**: Provides centralized browsing, filtering, and deep inspection of all normalized security logs.
- **How it works internally**: Supports server-side pagination and filtering by event type, severity, and text search. Selecting a log row opens an inspector drawer displaying full JSON metadata.
- **Components involved**: `LogExplorer.jsx`, `SecurityLogController.java`, `SecurityLogService.java`, `DetailDrawer.jsx`.
- **Backend APIs**: `GET /api/logs`, `GET /api/logs/{id}`.
- **Limitations**: Full-text searching operates over MongoDB regex matching; high-volume production deployments would benefit from dedicated Elasticsearch/OpenSearch indexing.

### 5. Linux Telemetry Collection
- **What it does**: Continuously captures authentic systemd journal security telemetry from Linux hosts.
- **How it works internally**: Subprocess streams `journalctl -o json --follow`, parses OpenSSH authentication and sudo commands, maps them to `SecurityLog` contracts, and transmits them via HTTP with at-least-once delivery semantics.
- **Components involved**: `threatlens_collector.py`, `parser.py`, `SecurityLogController.java`.
- **Backend APIs**: `POST /api/auth/login`, `POST /api/logs`.
- **Limitations**: Bounded in-memory buffer (1,000 events); requires journald on the monitored host.

### 6. Threat Detection Center
- **What it does**: Displays all automated detections generated by the detection engine.
- **How it works internally**: Displays detection records with associated rule names, matched logs, risk scores ($0 - 100$), risk categories, and score explanation tags. Allows analysts to acknowledge detections or transition them to dismissed/resolved.
- **Components involved**: `DetectionCenter.jsx`, `ThreatDetectionController.java`, `ThreatDetectionService.java`.
- **Backend APIs**: `GET /api/detections`, `GET /api/detections/{id}`, `PUT /api/detections/{id}/status`.
- **Limitations**: Detections reflect rule matches; they do not automatically cluster related alerts into incidents without analyst or rule escalation.

### 7. Rule-Based Detection Engine
- **What it does**: Evaluates newly ingested security logs against enabled detection rules in real time.
- **How it works internally**: Runs asynchronously via Spring event listeners. Supports `PATTERN_MATCH` (evaluating event type, severity, and message content) and `FREQUENCY_THRESHOLD` (querying the count of matching events within a sliding time window).
- **Components involved**: `ThreatDetectionService.java`, `RuleMatcher.java`, `RiskScoringEngine.java`.
- **Backend APIs**: Internal event pipeline triggered by `POST /api/logs`.
- **Limitations**: Evaluation is deterministic and rule-bound; does not perform unsupervised anomaly detection or statistical baseline profiling.

### 8. Alert Center
- **What it does**: Manages actionable security alerts requiring analyst investigation.
- **How it works internally**: Lists alerts with status (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `CLOSED`) and severity. Analysts can claim ownership, acknowledge triage, mark resolution, or escalate directly to an incident case.
- **Components involved**: `AlertCenter.jsx`, `AlertController.java`, `AlertService.java`.
- **Backend APIs**: `GET /api/alerts`, `GET /api/alerts/{id}`, `PUT /api/alerts/{id}/acknowledge`, `PUT /api/alerts/{id}/assign`, `PUT /api/alerts/{id}/resolve`, `PUT /api/alerts/{id}/close`.
- **Limitations**: Auto-alert creation is triggered only for rules configured with `HIGH` or `CRITICAL` severity.

### 9. Incident Response Workspace
- **What it does**: Provides a case management workspace for confirmed security incidents.
- **How it works internally**: Tracks incident status (`OPEN`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, `CLOSED`), severity, assigned lead, investigation notes, and containment actions. Analysts can execute containment playbooks (Quarantine IP, Lock User Account, Revoke JWT Session).
- **Components involved**: `IncidentResponse.jsx`, `IncidentController.java`, `IncidentService.java`.
- **Backend APIs**: `POST /api/incidents`, `GET /api/incidents`, `GET /api/incidents/{id}`, `PUT /api/incidents/{id}/status`, `PUT /api/incidents/{id}/assign`, `POST /api/incidents/{id}/notes`, `POST /api/incidents/{id}/actions`.
- **Limitations**: Response actions are strictly recorded within ThreatLens for audit and case documentation (`mode: SIMULATED`); they do not modify external firewalls, Active Directory, or cloud IAM.

### 10. Detection Rules Management
- **What it does**: Allows authorized security analysts and administrators to create, edit, enable, disable, and tune detection rules.
- **How it works internally**: Rules define rule type, match criteria (event type, log severity, message pattern), sliding window duration in seconds, threshold counts, and output severity.
- **Components involved**: `RulesManager.jsx`, `DetectionRuleController.java`, `DetectionRuleService.java`.
- **Backend APIs**: `GET /api/rules`, `POST /api/rules`, `GET /api/rules/{id}`, `PUT /api/rules/{id}`, `PUT /api/rules/{id}/enable`, `PUT /api/rules/{id}/disable`, `DELETE /api/rules/{id}`.
- **Limitations**: Rule changes take effect immediately on subsequent log ingestion; past historical logs are not retroactively re-evaluated.

### 11. Notification Settings & Dispatch Audit
- **What it does**: Configures notification channels (Email, SMS, Webhook), recipient targets, and minimum severity dispatch filters.
- **How it works internally**: Stores notification settings in MongoDB. When alerts are created, `NotificationService` verifies whether alert severity meets or exceeds the minimum threshold, prevents duplicate dispatches, and logs delivery records.
- **Components involved**: `NotificationSettingsPage.jsx`, `NotificationController.java`, `NotificationService.java`.
- **Backend APIs**: `GET /api/notifications/settings`, `PUT /api/notifications/settings`, `POST /api/notifications/test`, `GET /api/notifications/records`.
- **Limitations**: Email transmission requires valid SMTP configuration; SMS is routed through an internal telecom gateway simulator; webhook dispatch is configuration-only.

### 12. Audit Logs
- **What it does**: Provides an append-only, non-repudiation record of all security-relevant operational actions within ThreatLens.
- **How it works internally**: `AuditService` records events whenever users authenticate, rules are modified, alerts are updated, user roles are changed, or containment actions are executed. Records include actor username, action type, resource type/ID, timestamp, and metadata.
- **Components involved**: `AuditLogs.jsx`, `AuditController.java`, `AuditService.java`.
- **Backend APIs**: `GET /api/audit`, `GET /api/audit/resource/{type}/{id}`.
- **Limitations**: Audit records are stored in MongoDB without cryptographic hashing or hardware WORM enforcement; audit logging is application-level append-only.

### 13. User Management
- **What it does**: Allows administrators to provision users, modify assigned roles, and enable or disable accounts.
- **How it works internally**: Restricted strictly to users holding the `ADMIN` role. Administrators can view user statistics, update role memberships (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`), and toggle active status.
- **Components involved**: `UserManagement.jsx`, `AuthController.java`, `AuthService.java`.
- **Backend APIs**: `GET /api/auth/users`, `GET /api/auth/users/stats`, `PUT /api/auth/users/{id}/roles`, `PUT /api/auth/users/{id}/enable`, `PUT /api/auth/users/{id}/disable`.
- **Limitations**: Self-disabling is prevented; external registration cannot self-assign the `ADMIN` role.

### 14. Attack Simulator (Adversary Demonstration Lab)
- **What it does**: Allows analysts to inject simulated attack telemetry directly into the ingestion pipeline with a single click.
- **How it works internally**: Dispatches pre-configured attack vectors to `POST /api/logs`:
  - **SSH Brute Force**: Fires 5 consecutive authentication failure logs from a single IP to trigger frequency threshold rules.
  - **Ransomware Canary**: Ingests critical canary beacon logs matching file encryption rules.
  - **Port Scan Sweep**: Generates DMZ network reconnaissance logs.
  - **Privilege Escalation**: Emits unauthorized sudo execution telemetry.
- **Components involved**: `LogExplorer.jsx`, `SecurityLogController.java`.
- **Backend APIs**: `POST /api/logs`.
- **Limitations**: Generates synthetic log telemetry; does not execute actual malicious network traffic or host exploitation.

### 15. Login and Logout Transitions
- **What it does**: Provides an authentication motion experience with security verification overlays and logout confirmation dialogs.
- **How it works internally**:
  - **Login**: Upon successful credential verification, `AuthTransitionContext` triggers a multi-stage SVG defense core animation with stage indicators ("Verifying Credentials", "Establishing Secure Session", "Mounting SOC Console") before navigating to Command Hub.
  - **Logout**: Clicking logout opens `LogoutConfirmationModal`. Confirming initiates a transition screen displaying session termination telemetry before clearing tokens and redirecting to `/login`.
- **Components involved**: `Login.jsx`, `Navbar.jsx`, `AuthTransition.jsx`, `LogoutConfirmationModal.jsx`, `AuthTransitionContext.jsx`.
- **Backend APIs**: Client-side transition coordinating `POST /api/auth/login` and token disposal.
- **Limitations**: Motion timings are tuned for UX fluidity (~1.6s login, ~1.2s logout) and can be disabled or bypassed if immediate navigation is desired.

### 16. Dark and Light Themes
- **What it does**: Provides complete dark and light mode color schemes across all application surfaces.
- **How it works internally**: Managed via `ThemeContext.jsx` and CSS variables declared in `index.css`. The dark theme uses charcoal canvases (`#121316`) and graphite cards (`#1e2024`); the light theme provides a high-contrast corporate administrative palette.
- **Components involved**: `ThemeContext.jsx`, `Navbar.jsx`, `index.css`.
- **Backend APIs**: None (client-side persisted in `localStorage`).
- **Limitations**: Theme preference is browser-local and not synchronized to the user's database profile.

---

## 6. Linux Collector — Technical Documentation

The ThreatLens Linux Collector (`collectors/linux/threatlens_collector.py`) is a lightweight endpoint daemon designed to stream authentic Linux system logs directly into the ThreatLens SIEM.

```
 Arch Linux Host                                       ThreatLens Backend Host
┌────────────────────────────────────┐                ┌────────────────────────────────────┐
│ systemd-journald                   │                │ Spring Boot Backend (Port 8080)    │
│   ├── sshd.service (OpenSSH)       │                │                                    │
│   └── sudo / PAM authentication    │                │  POST /api/auth/login              │
│               │                    │                │  POST /api/logs                    │
│               ▼ (JSON Stream)      │                │                                    │
│ threatlens_collector.py            │                │                                    │
│   ├── Event Filter & Normalizer    │   LAN HTTP     │                                    │
│   ├── Cursor State (cursor.json)   │───────────────▶│                                    │
│   ├── In-Memory Buffer (1,000)     │  (Bearer JWT)  │                                    │
│   └── Dead-Letter (dead_letter)    │                │                                    │
└────────────────────────────────────┘                └────────────────────────────────────┘
```

### Why the collector exists
Many modern cyber attacks target Linux hosts through brute-force SSH credential stuffing and unauthorized sudo privilege escalation. The collector bridges the Linux kernel and systemd journal directly to the ThreatLens ingestion pipeline without requiring heavy enterprise agents.

### How it reads systemd journal events
The collector spawns `journalctl` as a managed subprocess using JSON output:
```bash
journalctl -o json --follow --after-cursor <cursor>
```
If no cursor exists, it tails from the current journal end (`-n 0`) to prevent flooding the backend with historic system logs.

### Event parsing and normalization (`parser.py`)
Incoming journal lines are parsed by `normalize_journal_entry()`:
- **OpenSSH Events**:
  - `Failed password for invalid user <user> from <ip>` $\rightarrow$ `AUTHENTICATION_FAILURE` (`HIGH`)
  - `Failed password for <user> from <ip>` $\rightarrow$ `AUTHENTICATION_FAILURE` (`MEDIUM`)
  - `Accepted publickey/password for <user> from <ip>` $\rightarrow$ `AUTHENTICATION_SUCCESS` (`INFO` / `LOW`)
- **Sudo Events**:
  - `<user> : user NOT in sudoers` $\rightarrow$ `PRIVILEGE_ESCALATION` (`HIGH`)
  - `<user> : 1 incorrect password attempt` $\rightarrow$ `AUTHENTICATION_FAILURE` (`MEDIUM`)
  - `COMMAND=/usr/bin/su` or `/bin/bash` $\rightarrow$ `OTHER` (`LOW`, `is_interactive_shell=true`)
  - Routine system commands $\rightarrow$ `OTHER` (`INFO`, routine audit telemetry)
- **Duplicate Suppression**: OpenSSH emits two consecutive lines for invalid user attempts (`Invalid user ...` followed by `Failed password for invalid user ...`). The parser ignores pre-auth notices to ensure exactly one event is generated per failed login.

### Backend authentication & JWT refresh
The collector authenticates via `POST /api/auth/login` using dedicated collector credentials (`COLLECTOR_USERNAME`, `COLLECTOR_PASSWORD`). The returned bearer token is cached in memory. When the backend returns `HTTP 401 Unauthorized` (indicating token expiration), the collector automatically refreshes the token and retries delivery.

### Retry, exponential backoff & backpressure
- **Transient Failures (HTTP 429, 5xx, Network Drops)**: The collector retains the unacknowledged event at the head of its buffer and applies exponential backoff starting at 2.0 seconds up to a maximum of 60.0 seconds.
- **Queue & Backpressure Control**: The in-memory buffer has a hard cap (`MAX_BUFFER_SIZE=1000`). When the buffer fills during network or backend outages, the collector pauses journal consumption rather than discarding events.
- **Authorization Errors (HTTP 403)**: If the collector account lacks ingestion permissions, delivery is paused with an alert log without dropping buffered events.

### Cursor persistence & delivery semantics
- **At-Least-Once Delivery**: The cursor is persisted to disk (`collector_cursor.json`) using atomic temporary file replacement and directory `fsync` strictly after confirmed backend HTTP receipt (`200 OK` or `201 Created`).
- If the backend accepts an event but cursor persistence fails, retries will re-deliver the event; neither ThreatLens nor MongoDB automatically deduplicates ingested records.

### Dead-letter handling
If the backend permanently rejects an event with `HTTP 400 Bad Request` or `HTTP 422 Unprocessable Entity` (e.g., schema validation failure), the collector appends the malformed payload, timestamp, status code, and rejection reason to `dead_letter.jsonl`, advances the cursor, and continues processing to prevent pipeline head-of-line blocking.

### Running the collector on Arch Linux

```bash
# 1. Copy collector directory to monitored Linux host
scp -r collectors/linux/ <user>@<collector-host-ip>:~/threatlens-collector/

# 2. Enter directory and configure environment
cd ~/threatlens-collector/
cp collector.env.example collector.env
chmod 600 collector.env

# 3. Edit configuration with target backend URL and credentials
nano collector.env

# 4. Verify collector tests (all 30 tests should pass)
python3 test_collector.py

# 5. Launch collector agent
python3 threatlens_collector.py
```

---

## 7. Detection and Risk Scoring Engine

The ThreatLens detection pipeline decouples log ingestion from threat analysis using an asynchronous event-driven pattern:

```
Log Ingested ──▶ SecurityLogIngestedEvent ──▶ ThreatDetectionService
                                                       │
                               ┌───────────────────────┴───────────────────────┐
                               ▼                                               ▼
                         RuleMatcher                                  RiskScoringEngine
                   (Pattern / Time-Window)                          (0-100 Composite Score)
                               │                                               │
                               └───────────────────────┬───────────────────────┘
                                                       │
                                                       ▼
                                         ThreatDetection Document (NEW)
                                                       │
                                    (Rule Severity == HIGH or CRITICAL?)
                                                       │
                                          YES ─────────┴───────── NO
                                           │                       │
                                           ▼                       ▼
                                   Create Alert (OPEN)     Retain as Detection
                                           │
                                           ▼
                              Dispatch Notifications (SMTP/SMS)
```

### Detection Rule Types
1. **`PATTERN_MATCH`**: Evaluates attributes of a single incoming log against rule criteria:
   - Match by `eventType` (e.g., `RANSOMWARE_DETECTED`, `PRIVILEGE_ESCALATION`).
   - Match by minimum `severity`.
   - Match by case-insensitive substring in `message`.
2. **`FREQUENCY_THRESHOLD`**: Evaluates temporal repetition of an event pattern:
   - Queries MongoDB for matching logs within a sliding time window (e.g., last 60 seconds).
   - Groups by `sourceIp` (or matching attribute).
   - Triggers when event count reaches or exceeds `thresholdCount`.

### Pre-Seeded Default Rules
- **SSH Brute Force Detection**: `FREQUENCY_THRESHOLD` $\ge 3$ authentication failures within 60 seconds from the same source IP (`HIGH` severity).
- **Ransomware Encryption Activity**: `PATTERN_MATCH` for `RANSOMWARE_DETECTED` events (`CRITICAL` severity).
- **Reconnaissance & Port Sweep**: `PATTERN_MATCH` for `PORT_SCAN` events (`MEDIUM` severity).
- **Unauthorized Privilege Escalation**: `PATTERN_MATCH` for `PRIVILEGE_ESCALATION` events (`HIGH` severity).

### Deterministic Risk Scoring Formula
The `RiskScoringEngine` computes an explainable composite risk score between $0$ and $100$:

$$\text{Risk Score} = \min\left(100,\; S_{\text{log}} + B_{\text{rule}} + B_{\text{freq}} + B_{\text{event}}\right)$$

Where:
- **Base Log Severity ($S_{\text{log}}$)**:
  - `CRITICAL`: $+40$
  - `HIGH`: $+30$
  - `MEDIUM`: $+20$
  - `LOW`: $+10$
  - `INFO`: $+5$
- **Rule Severity Bonus ($B_{\text{rule}}$)**:
  - `CRITICAL`: $+30$
  - `HIGH`: $+22$
  - `MEDIUM`: $+15$
  - `LOW`: $+8$
  - `INFO`: $+3$
- **Frequency Multiplier Bonus ($B_{\text{freq}}$)**:
  - $+20$ if event frequency exceeds $2\times$ the configured rule threshold.
  - $0$ for standard threshold or pattern matches.
- **High-Risk Event Type Bonus ($B_{\text{event}}$)**:
  - $+10$ for `BRUTE_FORCE`, `PRIVILEGE_ESCALATION`, `DATA_EXFILTRATION`, `MALWARE_DETECTED`, `RANSOMWARE_DETECTED`.
  - $+7$ for `SQL_INJECTION`, `XSS_ATTEMPT`, `PORT_SCAN`, `SUSPICIOUS_PROCESS`.
  - $+4$ for `AUTHENTICATION_FAILURE`, `POLICY_VIOLATION`, `FILE_INTEGRITY_VIOLATION`.
  - $0$ for routine system logs.

### Risk Categories vs. Rule Severity
It is important to distinguish the **Rule Severity** from the calculated **Risk Category**:
- **Rule Severity** (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`) is a static classification configured by the author of the detection rule.
- **Risk Category** is derived dynamically from the computed numerical score:
  - **CRITICAL**: Score $\ge 75$
  - **HIGH**: Score $50 - 74$
  - **MEDIUM**: Score $25 - 49$
  - **LOW**: Score $0 - 24$

> [!NOTE]
> ThreatLens uses explicit, deterministic correlation heuristics. It does not use machine learning, neural networks, or black-box statistical scoring models.

---

## 8. Alert and Incident Lifecycle

ThreatLens separates raw threat detections from actionable alerts and formal incident cases:

```
┌────────────────────┐
│  Security Log      │
└─────────┬──────────┘
          │ (Rule match)
          ▼
┌────────────────────┐
│  Threat Detection  │ Status: NEW ──▶ ACKNOWLEDGED / ALERT_CREATED ──▶ RESOLVED / DISMISSED
└─────────┬──────────┘
          │ (Severity == HIGH or CRITICAL)
          ▼
┌────────────────────┐
│  Security Alert    │ Status: OPEN ──▶ ACKNOWLEDGED ──▶ RESOLVED ──▶ CLOSED
└─────────┬──────────┘
          │ (Escalate to formal investigation)
          ▼
┌────────────────────┐
│  Incident Case     │ Status: OPEN ──▶ INVESTIGATING ──▶ CONTAINED ──▶ RESOLVED ──▶ CLOSED
└────────────────────┘
```

### Alert Lifecycle
1. **Creation**: Automatically triggered when a detection has `HIGH` or `CRITICAL` rule severity, or manually escalated by an analyst. Initial status is `OPEN`.
2. **Acknowledgement**: An analyst acknowledges the alert (`PUT /api/alerts/{id}/acknowledge`), transitioning status to `ACKNOWLEDGED` to signal active review.
3. **Assignment**: The alert is assigned to a specific analyst (`PUT /api/alerts/{id}/assign`).
4. **Resolution**: The analyst marks the alert as `RESOLVED` with a documented resolution summary.
5. **Closure**: The alert is transitioned to `CLOSED`, archiving the record.

### Incident Investigation & Containment
When an alert indicates an active or widespread threat, analysts escalate it to an **Incident**:
- **Investigation Notes**: Analysts append collaborative timestamped investigation notes (`POST /api/incidents/{id}/notes`).
- **Response Actions (Containment)**: Analysts record containment actions directly from the Incident Response interface:
  - `QUARANTINE_IP`: Records isolation of a malicious external or internal IP address.
  - `LOCK_USER`: Records suspension of compromised user credentials.
  - `REVOKE_TOKEN`: Records invalidation of active session tokens.
- **Resolution & Closure**: Once the threat is mitigated, the incident status transitions to `CONTAINED`, `RESOLVED`, and finally `CLOSED`.

> [!IMPORTANT]
> **Simulated Containment Boundary**:
> Containment actions in ThreatLens are recorded with `mode: SIMULATED` and `status: COMPLETED` for case tracking and audit trail demonstration. ThreatLens does not directly execute operating system commands, modify firewall rules (e.g. `iptables`, `nftables`), or interface with identity providers (Active Directory, LDAP, Okta).

---

## 9. Notification System

ThreatLens includes a multi-channel notification dispatcher configured in `NotificationService.java`:

| Channel | Implementation Status | Delivery Mechanism |
| :--- | :--- | :--- |
| **EMAIL** | **Fully Functional** | Live SMTP network delivery using Spring Mail `JavaMailSender` and Jakarta Mail with STARTTLS. Dispatches responsive, dark-themed HTML bulletins containing alert severity badges, detection timestamps, source IPs, and direct console links. |
| **SMS** | **Simulated** | Internal telecom gateway simulator. Validates recipient phone formatting and creates simulated delivery audit records (`status: DELIVERED`) without making external carrier network calls. |
| **WEBHOOK**| **Configuration Only**| Target webhook URLs and toggle states can be saved and audited via the UI, but runtime HTTP POST webhook dispatch is not implemented. |

### Severity Filtering & Duplicate Suppression
- **Minimum Severity Threshold**: Dispatches are evaluated against `minSeverity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`). Alerts below this threshold are suppressed.
- **Duplicate Delivery Guard**: The notification service checks `recordRepository.existsByAlertIdAndChannelAndStatus()` to guarantee that an alert receives at most one delivered email notification.

---

## 10. Security Architecture

### Authentication & Token Security
- **JWT Statelessness**: Authentication uses signed JSON Web Tokens (HMAC-SHA512) generated via `io.jsonwebtoken 0.12.6`. The server retains no session state.
- **Password Hashing**: User passwords are encrypted using BCrypt with a work factor of 10 (`BCryptPasswordEncoder`).
- **Token Injection & Interception**: The React frontend injects `Authorization: Bearer <token>` on all outgoing Axios requests. Responses returning `401 Unauthorized` automatically clear local authentication state and redirect the browser to `/login`.

### Role-Based Access Control (RBAC)
ThreatLens enforces three administrative and operational roles:

| Role | Permissions |
| :--- | :--- |
| **`ROLE_ADMIN`** | Full platform access: user management, role assignments, rule creation/deletion, alert triage, incident response, notification settings, and system audit logs. |
| **`ROLE_SECURITY_ANALYST`** | Operational access: log ingestion, alert triage, incident management, rule viewing/editing, notification testing, and audit log inspection. (Cannot manage users). |
| **`ROLE_AUDITOR`** | Read-only access: view dashboard, logs, detections, alerts, incidents, and audit records. (Cannot execute containment or modify rules). |

### Endpoint Authorization Enforcement
Backend security is enforced at two levels:
1. **Filter Chain (`SecurityConfig.java`)**: Configures URL-based permit patterns (`/api/auth/login`, `/api/auth/register`, `/actuator/health` are public; all other `/api/**` endpoints require authentication).
2. **Method-Level Security (`@PreAuthorize`)**: Specific controller methods require appropriate roles (e.g., `@PreAuthorize("hasRole('ADMIN')")` on user management endpoints).

### Credential & Environment Hygiene
- Production credentials, JWT secrets, and SMTP passwords are read strictly from environment variables or local `.env` files.
- `.env` and `collector.env` are explicitly excluded from version control via `.gitignore`.
- Template files (`.env.example`, `collector.env.example`) contain only safe, non-functional placeholders.

---

## 11. Installation and Setup

### Prerequisites
- **Java Development Kit (JDK)**: Java 21 LTS (`openjdk@21`)
- **Node.js**: Node.js 20 LTS or higher, with `npm`
- **Docker**: Docker Engine and Docker Compose v2
- **Python**: Python 3.10 or higher (for Linux collector)

---

### Step 1: Clone Repository
```bash
git clone https://github.com/vanparx/Threatlens.git
cd Threatlens
```

---

### Step 2: Start MongoDB via Docker Compose
From the repository root:
```bash
docker compose up -d
```
Verify that the MongoDB container is running on port `27018`:
```bash
docker ps --filter "name=threatlens-mongodb"
```

---

### Step 3: Configure and Start the Backend
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` to configure your credentials and optional SMTP settings:
   ```bash
   nano .env
   ```
3. Run the Spring Boot application using the Maven wrapper:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
*The backend compiles, executes database migrations, seeds the default admin user and detection rules, and begins listening on `http://localhost:8080`.*

---

### Step 4: Configure and Start the Frontend
1. In a new terminal window, navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open your web browser and navigate to:
   ```
   http://localhost:5173
   ```

---

### Step 5: (Optional) Configure the Linux Collector
For multi-device deployments (e.g., monitoring a remote Linux host):
1. Copy the `collectors/linux/` folder to the target Linux machine.
2. Follow the setup instructions in [Section 6](#6-linux-collector--technical-documentation).
3. Ensure the target Linux host can reach the backend host IP on port `8080`.

---

### Step 6: Verify Service Availability
Verify that all services are operational:
```bash
# Verify backend health probe
curl -s http://localhost:8080/actuator/health
# Expected: {"status":"UP"}

# Verify frontend HTTP response
curl -s -I http://localhost:5173 | head -n 1
# Expected: HTTP/1.1 200 OK
```

### Default Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **SOC Administrator** | `admin` | `ChangeMe!Admin123` |

*(A "Prefill credentials" shortcut is available on the login page for rapid local evaluation).*

---

## 12. Configuration Reference

### Backend Configuration (`.env`)

| Variable | Description | Safe Default / Example |
| :--- | :--- | :--- |
| `SERVER_PORT` | HTTP port for the Spring Boot backend | `8080` |
| `MONGO_HOST` | Hostname for the MongoDB service | `localhost` |
| `MONGO_PORT` | Exposed port for the MongoDB container | `27018` |
| `MONGO_DATABASE` | Target MongoDB database name | `threatlens` |
| `MONGO_USERNAME` | MongoDB administrative username | `threatlens_admin` |
| `MONGO_PASSWORD` | MongoDB administrative password | `ChangeMe!MongoPassword123` |
| `MONGO_ROOT_PASSWORD` | Docker Compose root initialization password | `ChangeMe!MongoPassword123` |
| `MONGO_URI` | Full Spring Data MongoDB connection URI | `mongodb://threatlens_admin:ChangeMe!MongoPassword123@localhost:27018/threatlens?authSource=admin` |
| `JWT_SECRET` | Secret key for HMAC-SHA512 token signing (min. 256 bits) | `ThreatLens-Super-Secret-Key-For-JWT-Authentication-Change-Me-In-Production-At-Least-256-Bits` |
| `JWT_EXPIRATION_MS` | JWT token validity window in milliseconds | `86400000` (24 hours) |
| `ADMIN_USERNAME` | Default seeded SOC administrator username | `admin` |
| `ADMIN_PASSWORD` | Default seeded SOC administrator password | `ChangeMe!Admin123` |
| `ADMIN_EMAIL` | Default administrator email address | `admin@threatlens.local` |
| `CORS_ALLOWED_ORIGINS` | Permitted client origins for cross-origin requests | `http://localhost:5173,http://localhost:3000` |
| `SPRING_MAIL_HOST` | SMTP server hostname (leave empty to disable mail) | `smtp.gmail.com` |
| `SPRING_MAIL_PORT` | SMTP server port | `587` |
| `SPRING_MAIL_USERNAME`| SMTP authentication username | `soc-alerts@yourdomain.com` |
| `SPRING_MAIL_PASSWORD`| SMTP account password or 16-character App Password| `xxxx xxxx xxxx xxxx` |
| `SPRING_MAIL_SMTP_AUTH`| Enable SMTP authentication | `true` |
| `SPRING_MAIL_SMTP_STARTTLS_ENABLE`| Enable STARTTLS encryption | `true` |
| `APP_MAIL_FROM` | Outgoing From header on email advisories | `ThreatLens SOC <soc-alerts@yourdomain.com>` |
| `APP_MAIL_DEFAULT_RECIPIENT`| Primary security analyst alert recipient | `lead-analyst@yourdomain.com` |

### Collector Configuration (`collector.env`)

| Variable | Description | Safe Default / Example |
| :--- | :--- | :--- |
| `THREATLENS_BACKEND_URL` | Base URL of the ThreatLens backend server | `http://192.168.1.100:8080` |
| `COLLECTOR_USERNAME` | Collector service account username | `collector_arch_predator` |
| `COLLECTOR_PASSWORD` | Collector service account password | `your_secure_collector_password_here` |
| `COLLECTOR_SOURCE_SYSTEM`| Identifier for the reporting host system | `archlinux-predator` |
| `COLLECTOR_HOST_IP` | Monitored host network interface IP | `192.168.1.50` |
| `COLLECTOR_JOURNAL_UNITS`| Specific systemd units to filter (empty streams all) | `""` (Recommended on Arch Linux) |
| `COLLECTOR_STATE_FILE` | Path to persistent on-disk cursor state JSON file | `collector_cursor.json` |
| `COLLECTOR_DEAD_LETTER_FILE`| Path to rejected poison event quarantine file | `dead_letter.jsonl` |
| `MAX_BUFFER_SIZE` | Hard cap on in-memory queue buffer | `1000` |
| `INITIAL_RETRY_DELAY_SECONDS`| Base backoff duration for network retries | `2.0` |
| `MAX_RETRY_DELAY_SECONDS` | Maximum ceiling for exponential backoff | `60.0` |
| `POLL_INTERVAL_SECONDS` | Polling interval for buffer queue dispatch | `1.0` |

---

## 13. API Overview

All protected endpoints require an `Authorization: Bearer <JWT>` header.

### Authentication & Users (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`SECURITY_ANALYST` or `AUDITOR`).
- `POST /api/auth/login` — Authenticate credentials and receive a JWT token.
- `GET /api/auth/users` — Paginated list of users (`ADMIN` only).
- `GET /api/auth/users/stats` — User count aggregated by role (`ADMIN` only).
- `GET /api/auth/users/{id}` — Fetch specific user record (`ADMIN` only).
- `PUT /api/auth/users/{id}/roles` — Update assigned roles (`ADMIN` only).
- `PUT /api/auth/users/{id}/enable` — Re-enable a disabled user account (`ADMIN` only).
- `PUT /api/auth/users/{id}/disable` — Deactivate a user account (`ADMIN` only).

### Security Logs (`/api/logs`)
- `POST /api/logs` — Ingest a new security log event (triggers detection engine).
- `GET /api/logs` — Paginated, filtered search of ingested logs (`eventType`, `severity`, search query).
- `GET /api/logs/{id}` — Retrieve full log document and metadata.

### SOC Dashboard (`/api/dashboard`)
- `GET /api/dashboard/stats` — Aggregate metrics: posture score, event counts, alert severity counts, 24-hour log volume histograms, and active incidents.

### Threat Detections (`/api/detections`)
- `GET /api/detections` — Paginated list of threat detections (filterable by `status`, `severity`, `ruleId`).
- `GET /api/detections/{id}` — Retrieve specific detection record with score explanation reasons.
- `PUT /api/detections/{id}/status` — Update detection status (`ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`).

### Alert Triage (`/api/alerts`)
- `GET /api/alerts` — Paginated list of alerts (filterable by `status`, `severity`).
- `GET /api/alerts/{id}` — Retrieve alert details and linked detection telemetry.
- `GET /api/alerts/by-detection/{detectionId}` — Fetch alert generated from a specific detection.
- `PUT /api/alerts/{id}/acknowledge` — Transition alert to `ACKNOWLEDGED`.
- `PUT /api/alerts/{id}/assign` — Assign alert to an analyst.
- `PUT /api/alerts/{id}/resolve` — Transition alert to `RESOLVED` with summary.
- `PUT /api/alerts/{id}/close` — Transition alert to `CLOSED`.

### Incident Response (`/api/incidents`)
- `POST /api/incidents` — Escalate an alert into an incident case.
- `GET /api/incidents` — Paginated list of incidents (filterable by `status`, `severity`).
- `GET /api/incidents/{id}` — Retrieve incident details, investigation timeline, notes, and actions.
- `GET /api/incidents/by-alert/{alertId}` — Retrieve incident linked to a specific alert.
- `PUT /api/incidents/{id}/status` — Update incident status (`INVESTIGATING`, `CONTAINED`, `RESOLVED`, `CLOSED`).
- `PUT /api/incidents/{id}/assign` — Assign lead investigator.
- `POST /api/incidents/{id}/notes` — Append an investigation note.
- `POST /api/incidents/{id}/actions` — Record a containment response action (`SIMULATED` mode).

### Detection Rules (`/api/rules`)
- `GET /api/rules` — List all detection rules.
- `POST /api/rules` — Author a new detection rule.
- `GET /api/rules/stats` — Aggregate rule counts (total, enabled, disabled).
- `GET /api/rules/enabled` — List only active rules evaluated during ingestion.
- `GET /api/rules/{id}` — Retrieve specific detection rule.
- `PUT /api/rules/{id}` — Update rule parameters, thresholds, and conditions.
- `PUT /api/rules/{id}/enable` — Enable a detection rule.
- `PUT /api/rules/{id}/disable` — Disable a detection rule.
- `DELETE /api/rules/{id}` — Delete a detection rule (`ADMIN` only).

### Notifications (`/api/notifications`)
- `GET /api/notifications/settings` — Retrieve current channel settings and recipient configs.
- `PUT /api/notifications/settings` — Update recipient addresses and minimum severity thresholds.
- `POST /api/notifications/test` — Trigger a test dispatch to verify delivery connectivity.
- `GET /api/notifications/records` — Paginated audit history of dispatched notifications.

### Audit Trail (`/api/audit`)
- `GET /api/audit` — Paginated query of the append-only operational audit log.
- `GET /api/audit/resource/{type}/{id}` — Retrieve complete audit history for a specific entity.

### System Health & Telemetry
- `GET /actuator/health` — Spring Boot Actuator health status probe (`UP` / `DOWN`).

---

## 14. Testing and Verification

ThreatLens has been verified across multiple independent automated test suites covering backend services, frontend components, and the Python collector agent.

```
═══════════════════════════════════════════════════════════════════════════════
  THREATLENS AUTOMATED VERIFICATION SUMMARY
═══════════════════════════════════════════════════════════════════════════════
  Test Suite                   Scope                          Result
───────────────────────────────────────────────────────────────────────────────
  Backend Tests (JUnit 5)      Services, Repositories, Auth   75 passed, 0 failed
  Frontend Regression Suite    UI Primitives, Shell, Pages    18 suites passed
  Frontend Production Build    Vite Production Bundle         0 errors, 0 warnings
  Linux Collector Suite        Parser, Cursor, Backpressure   30 passed, 0 failed
═══════════════════════════════════════════════════════════════════════════════
```

### 1. Backend Automated Tests (JUnit 5 & Mockito)
- **Execution Command**: `cd backend && ./mvnw test`
- **Results**: **75 tests run, 0 failures, 0 errors, 0 skipped** (BUILD SUCCESS in ~4.08s).
- **Test Coverage**:
  - `AuthServiceTest`: User registration, duplicate username handling, password hashing, JWT generation, and role assignment.
  - `DetectionRuleServiceTest`: Rule CRUD operations, threshold validation, and enable/disable states.
  - `ThreatDetectionServiceTest`: Asynchronous event processing, idempotency checks, and alert escalation thresholds.
  - `DetectionRuleEvaluationTest`: Evaluation of `PATTERN_MATCH` and `FREQUENCY_THRESHOLD` sliding-window conditions.
  - `AlertServiceNotificationTest`: Alert lifecycle transitions, assignment, and notification dispatch triggering.
  - `IncidentServiceTest`: Incident creation, status transitions, analyst notes, and simulated containment recording.
  - `NotificationServiceTest`: SMTP email construction, recipient resolution, severity threshold filtering, and duplicate suppression.
  - `DashboardServiceTest`: Metric aggregation pipelines and severity count queries.
  - `BackendApplicationTests`: Spring application context initialization and MongoDB connectivity.

### 2. Frontend Regression Test Suite
- **Execution Command**: Automated headless test suite evaluating React components and layout hierarchy.
- **Results**: **18 test suites passed, 100% pass rate**.
- **Test Coverage**:
  - `test_primitives`: Reusable SOC UI components (`KPICard`, `StatusBadge`, `Modal`, `DetailDrawer`, `TablePagination`, `FilterBar`).
  - `test_shell`: Full-height sidebar navigation, two-column tile grid, theme toggling, and navbar integration.
  - `test_sidebar_extension`: Layout verification across viewport resolutions ($1366\times 768$, $1920\times 1080$, mobile viewports).
  - `test_login_redesign`: Responsive two-panel authentication layout, form accessibility, and error handling.
  - `test_auth_transitions`: Coordinated login/logout transitions, overlay mounting, and token cleanup verification.
  - Page suites: `CommandHub`, `Dashboard`, `LogExplorer`, `DetectionCenter`, `AlertCenter`, `IncidentResponse`, `RulesManager`, `NotificationSettingsPage`, `AuditLogs`, `UserManagement`.

### 3. Frontend Production Build
- **Execution Command**: `cd frontend && npm run build`
- **Results**: Vite 6.1.0 compiled successfully with **0 errors and 0 warnings**:
  - `dist/index.html`: $0.66\text{ kB}$
  - `dist/assets/index-*.css`: $35.07\text{ kB}$
  - `dist/assets/index-*.js`: $1,041.55\text{ kB}$ (gzip: $305.65\text{ kB}$)

### 4. Linux Collector Test Suite
- **Execution Command**: `python3 collectors/linux/test_collector.py`
- **Results**: **30 tests run, 0 failures, 0 errors** (OK in 0.010s).
- **Test Coverage**:
  - `test_parser`: OpenSSH accepted/failed log parsing, invalid user handling, sudo command classification, interactive root shell flags, and timestamp ISO conversion.
  - `test_cursor`: Atomic cursor persistence, directory `fsync` handling, temporary file cleanup, and corrupt cursor recovery.
  - `test_dead_letter`: Poison event quarantining on HTTP 400/422 and JSONL serialization.
  - `test_backpressure`: Queue capacity limits (1,000 items), buffer pause behavior, and memory bounds.
  - `test_auth_lifecycle`: Token caching, automatic 401 refresh, and 403 authorization error pausing.

> [!NOTE]
> Automated tests execute against isolated unit mocks, in-memory representations, and test containers. End-to-end multi-device verification requires running backend, frontend, MongoDB, and collector instances on an active network.

---

## 15. Current Limitations

In the interest of technical transparency and academic integrity, the following limitations reflect the current state of the implementation:

1. **Deterministic Rule Matching Only**: Threat detection relies exclusively on configured pattern matches and sliding-window counts. ThreatLens does not include machine learning models, statistical baseline profiling, or unsupervised anomaly detection.
2. **Simulated Response Actions**: Containment actions (Quarantine IP, Lock User, Revoke Token) executed from the Incident Response workspace are recorded in ThreatLens with `mode: SIMULATED` for case tracking and audit logging. They do not alter external operating system firewalls, Active Directory, or cloud IAM providers.
3. **Simulated SMS & Webhook Dispatch**: The notification engine transmits live, authentic emails over SMTP. SMS notifications are processed by an internal telecom gateway simulator. Webhook endpoints can be configured in the UI, but runtime HTTP POST webhook dispatch is not implemented.
4. **No External Threat Intelligence Feeds**: The platform does not query external threat intelligence APIs (e.g., VirusTotal, AlienVault OTX, AbuseIPDB) to enrich IP addresses or file hashes.
5. **Single-Node Demonstration Architecture**: The platform is architected for single-instance deployment. It does not provide distributed cluster consensus, multi-tenant fleet management, or multi-region replication.
6. **Polling-Based Telemetry**: The React frontend uses manual refresh and interval polling for dashboard metrics. Bidirectional WebSocket streams and Server-Sent Events (SSE) are not currently implemented.
7. **Local Deployment Security**: The default setup assumes local development or internal LAN communication over HTTP. Production deployments require a reverse proxy (e.g., Nginx, Caddy) to terminate TLS/HTTPS.

---

## 16. Future Improvements

The following architectural enhancements are identified for future development:

- **Live SOAR Infrastructure Integration**: Implement real response integrations via SSH, Ansible playbooks, or cloud APIs (AWS Security Groups, Cloudflare, iptables) to execute actual network isolation and account locking.
- **WebSocket / Server-Sent Events (SSE)**: Replace frontend polling with real-time push streaming for log ingestion, alert banners, and live dashboard counters.
- **External Threat Intelligence Enrichment**: Integrate automated lookups against external threat databases (AbuseIPDB, VirusTotal, CISA KEV) during log normalization.
- **Distributed Agent Management**: Implement mutual TLS (mTLS) authentication and centralized configuration push for large-scale multi-host collector deployments.
- **Advanced Query Language**: Add support for structured search syntax (e.g., Lucene-style `sourceIp:192.168.* AND severity:HIGH`) in the Log Explorer.
- **Enterprise SSO & Identity Federation**: Implement OAuth2 / OpenID Connect (OIDC) and SAML 2.0 integration for enterprise identity providers (Okta, Microsoft Entra ID).

---

## 17. Project Structure

```
Threatlens/
├── .env.example                         # Safe backend environment template
├── .gitignore                           # Git exclusion rules (secrets, node_modules, build targets)
├── docker-compose.yml                   # Containerized MongoDB 7.0 service definition
├── README.md                            # Comprehensive project documentation
│
├── backend/                             # Spring Boot 4.1.1 Core Backend (Java 21 LTS)
│   ├── mvnw / mvnw.cmd                  # Maven wrappers
│   ├── pom.xml                          # Maven build dependencies and plugin configuration
│   └── src/
│       ├── main/java/com/threatlens/
│       │   ├── BackendApplication.java  # Spring Boot entry point & admin seeder
│       │   ├── alert/                   # Alert domain (entities, DTOs, controllers, services)
│       │   ├── audit/                   # Audit logging domain
│       │   ├── auth/                    # Security, JWT filters, user management, RBAC
│       │   ├── common/                  # Global exceptions, ApiResponse wrappers
│       │   ├── dashboard/               # Metric aggregation & dashboard controller
│       │   ├── detection/               # Detection engine, RuleMatcher, RiskScoringEngine
│       │   ├── incident/                # Incident management & simulated containment playbooks
│       │   ├── log/                     # Log ingestion, normalization, and search
│       │   ├── notification/            # SMTP email delivery & SMS simulator
│       │   └── rule/                    # Detection rule authoring & management
│       └── test/java/com/threatlens/    # Comprehensive JUnit 5 backend test suites (75 tests)
│
├── frontend/                            # React 18 / Vite 6.1.0 SOC Web Console
│   ├── index.html                       # HTML5 entry template
│   ├── package.json                     # NPM dependencies and build scripts
│   ├── vite.config.js                   # Vite configuration
│   └── src/
│       ├── App.jsx                      # Route definitions, providers, and transition overlay
│       ├── main.jsx                     # React root mount
│       ├── index.css                    # Global SOC design tokens (dark/light themes)
│       ├── api/
│       │   └── client.js                # Axios instance with JWT interceptors
│       ├── components/
│       │   ├── Navbar.jsx               # Top navigation bar with theme and logout controls
│       │   ├── Sidebar.jsx              # Full-height navigation with two-column tile grid
│       │   ├── ProtectedRoute.jsx       # Client-side RBAC route guard
│       │   ├── AccessDenied.jsx         # 403 Forbidden page
│       │   ├── CyberSecurityAnimation.jsx # SVG defense core animation
│       │   ├── MiniCyberDefenseCore.jsx # Sidebar miniature telemetry animation
│       │   ├── auth/                    # Login/logout transition components & confirmation modal
│       │   └── common/                  # Reusable SOC UI components (KPICard, Modal, etc.)
│       ├── context/
│       │   ├── AuthContext.jsx          # JWT authentication state management
│       │   ├── AuthTransitionContext.jsx # Login/logout transition state coordinator
│       │   └── ThemeContext.jsx         # Dark/light theme state manager
│       └── pages/                       # Operational SOC page views
│           ├── Login.jsx                # Precision SOC Console authentication page
│           ├── CommandHub.jsx           # Executive landing portal & navigation launchpad
│           ├── Dashboard.jsx            # Real-time metrics & Recharts visualizations
│           ├── LogExplorer.jsx          # Security log search, filtering & attack simulator
│           ├── DetectionCenter.jsx      # Automated detections & risk score inspection
│           ├── AlertCenter.jsx          # Alert triage, assignment, and status transitions
│           ├── IncidentResponse.jsx     # Incident case management & containment tracking
│           ├── RulesManager.jsx         # Detection rule configuration & tuning
│           ├── NotificationSettingsPage.jsx # Notification routes & delivery audit history
│           ├── AuditLogs.jsx            # Append-only system audit log viewer
│           ├── UserManagement.jsx       # Administrative user and role management
│           └── NotFound.jsx             # 404 handler
│
└── collectors/
    └── linux/                           # Zero-dependency Python 3 Linux Collector
        ├── README.md                    # Dedicated Linux collector documentation
        ├── collector.env.example        # Safe collector configuration template
        ├── threatlens_collector.py      # Core collector daemon (journalctl streaming, buffer, retry)
        ├── parser.py                    # OpenSSH & sudo event normalization engine
        └── test_collector.py            # Comprehensive collector test suite (30 tests)
```

---

## 18. Author and Project Information

- **Author**: Pardhasaradhi Maheswaram
- **Degree Program**: Bachelor of Engineering in Computer Science and Engineering (Full Stack Development)
- **Academic Section**: 24BCF1-B
- **Capstone Project**: ThreatLens Autonomous Security Threat Monitoring & Incident Response Platform
- **Repository**: [https://github.com/vanparx/Threatlens.git](https://github.com/vanparx/Threatlens.git)
- **Base Version Baseline**: `v1.0.0-pre-ui`
