# 🔐 ThreatLens — Autonomous Security Threat Monitoring & Incident Response Platform (SOC SIEM / SOAR)

[![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%204%20%7C%20Java%2021%20LTS-brightgreen.svg)](#)
[![Database](https://img.shields.io/badge/Database-MongoDB%207.0-forestgreen.svg)](#)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Slate%20Grey%20Theme-2e3138.svg)](#)
[![Security](https://img.shields.io/badge/Security-JWT%20Stateless%20%7C%20BCrypt%20%7C%20RBAC-6b7280.svg)](#)
[![Actuator](https://img.shields.io/badge/Health-Spring%20Boot%20Actuator%20Live-34d399.svg)](#)
[![Notifications](https://img.shields.io/badge/Outbound-Email%20%26%20SMS%20Advisories-orange.svg)](#)

---

## 📌 Executive Summary

**ThreatLens** is an autonomous, full-stack Security Operations Center (SOC) platform integrating **SIEM (Security Information and Event Management)** log collection with **SOAR (Security Orchestration, Automation, and Response)** containment capabilities.

Designed as a university capstone project in Full Stack Development & Cybersecurity Engineering, ThreatLens demonstrates the complete enterprise defense lifecycle:
1. **Telemetry Ingestion**: High-throughput log collection across perimeter firewalls, SSH bastion hosts, ingress proxies, and identity providers.
2. **Detection & Risk Scoring**: Real-time evaluation against configurable sliding-window correlation rules, computing dynamic asset risk scores ($0 - 100$).
3. **Automated Alerting & Outbound Dispatch**: Auto-escalation of High and Critical threats, triggering automated **Email Advisories** and emergency **SMS Notifications**.
4. **Active Incident Containment**: Live response playbooks (IP isolation, compromised identity lockdown, JWT session token revocation).
5. **Command Hub & Executive Posture**: Dedicated post-login landing portal featuring environment health metrics, collector throughput, and quick-launch operational workspaces.
6. **Immutable Audit Logging**: Strict non-repudiation audit trail recording all analyst triage decisions, rule modifications, and automated containment actions.

---

## 🏛️ System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │               ThreatLens SOC Console (React)           │
                    │   • Command Hub (Landing) • Real-Time Log Explorer     │
                    │   • Security Overview     • Adversary Simulator        │
                    │   • Alert Triage Center   • Email/SMS Dispatch Panel   │
                    │   • SOAR Containment Hub  • Immutable Audit Trail      │
                    └───────────────────────────┬────────────────────────────┘
                                                │ REST API (JWT Bearer)
                                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             Spring Boot Core Backend (Java 21)                           │
│                                                                                          │
│  ┌───────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────────┐  │
│  │   Auth & Security     │   │   Security Log Ingest    │   │  Detection Rule Engine  │  │
│  │  • BCrypt Passwords   │──▶│  • Structured Telemetry  │──▶│ • Sliding Time Windows  │  │
│  │  • JWT Stateless Auth │   │  • Event Categorization  │   │ • Pattern / Freq Match  │  │
│  └───────────────────────┘   └──────────────────────────┘   └────────────┬────────────┘  │
│                                                                          │               │
│                                                                          ▼               │
│  ┌───────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────────┐  │
│  │  Notification Hub     │   │  SOAR Incident Response  │   │   Risk Scoring Engine   │  │
│  │  • Email Security Adv │◀──│  • Automated Containment │◀──│  • Composite 0-100 Calc │  │
│  │  • Telecom SMS Alerts │   │  • IP / User Quarantine  │   │  • Alert Auto-Escalate  │  │
│  └───────────────────────┘   └──────────────────────────┘   └─────────────────────────┘  │
│                                           │                                              │
│                                           ▼                                              │
│  ┌───────────────────────┐   ┌──────────────────────────┐                                │
│  │  Actuator Telemetry   │   │   Immutable Audit Log    │                                │
│  │  • Liveness / Readiness│   │   • SOC Action Recording │                                │
│  └───────────────────────┘   └──────────────────────────┘                                │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Mongo Driver (Port 27018)
                                            ▼
                    ┌────────────────────────────────────────────────────────┐
                    │                    MongoDB Database                    │
                    │   • users           • detection_rules  • security_logs │
                    │   • alerts          • incidents        • audit_logs    │
                    │   • notifications   • notification_settings            │
                    └────────────────────────────────────────────────────────┘
```

---

## 🎨 Enterprise Design System

ThreatLens features a sleek, professional **Slate & Charcoal Grey** design system built for mission-critical operations:
- **Monochromatic Neutral Palette**: Deep charcoal canvases (`#121316`), graphite navigation surfaces (`#18191c`), and refined slate cards (`#1e2024`).
- **Titanium Zinc Highlights**: Clean, high-contrast actions and indicators without distracting neon or glowing clutter.
- **Restrained Severity Badges**: Desaturated, readable risk indicators (Critical, High, Medium, Low) for swift analyst triage.
- **Theme Versatility**: Complete Dark Mode and Light Mode support with seamless real-time switching.

---

## 🚀 Key Features & Capabilities

### 1. Command Hub (Post-Authentication Landing Portal)
Instead of overwhelming operators with dense data immediately upon sign-in, ThreatLens routes analysts to the **Command Hub**:
- **Environment Barometer**: Real-time calculated security posture score, active detection count, open incident tally, and aggregate event throughput.
- **Collector Node Telemetry**: Status indicators for connected infrastructure feeds (Perimeter Firewall, Privileged SSH Bastion, Ingress Envoy Gateway, and Identity Provider).
- **Workspace Launchpads**: Direct 1-click access into dedicated operational modules.

### 2. Adversary Attack Simulator (Live Demonstration Lab)
Evaluate the detection pipeline in real time with 1-click built-in attack vectors:
- **SSH Brute Force Simulation**: Fires a consecutive burst of authentication failure logs, triggering frequency thresholds and escalating to an Alert.
- **Ransomware Canary & Encryption**: Dispatches `.locked` beacon logs at `CRITICAL` severity, automatically firing emergency SMS and email security advisories.
- **Port Scan Sweep**: Simulates reconnaissance SYN sweeps across DMZ network interfaces.
- **Privilege Escalation**: Simulates unauthorized sudo elevation by non-privileged service accounts.

### 3. Multi-Channel Alert Dispatch (Email & SMS)
- **Email Security Advisories**: Sends structured advisory digests (Detection ID, severity, affected source IP, recommended playbook).
- **Emergency SMS Dispatch**: Pushes urgent text alerts to on-duty incident responders.
- **Channel Preferences**: Configurable recipient email addresses, emergency phone numbers, and minimum severity dispatch filters.

### 4. SOAR Containment Playbooks
Within active Incident cases, analysts can execute live containment playbooks:
- **Quarantine IP**: Drops ingress and egress traffic for malicious external hosts.
- **Lock Account**: Immediately terminates active user sessions and suspends credential lookups.
- **Revoke Session Keys**: Force-invalidates JWT security tokens across edge gateways.

### 5. Detection Rule Engine
Configurable sliding evaluation window rules seeded out-of-the-box:
1. *SSH Brute Force Detection* (Frequency Threshold: $\ge 3$ events within 60s)
2. *Ransomware Encryption Activity* (Event Pattern Match: CRITICAL)
3. *Reconnaissance & Port Sweep* (Event Pattern Match: MEDIUM)
4. *Unauthorized Privilege Escalation* (Event Pattern Match: HIGH)

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Core** | Spring Boot 4.1.1, Java 21 LTS, Spring Data MongoDB, Spring Security, Spring Boot Actuator |
| **Database** | MongoDB 7.0 Containerized (`threatlens-mongodb` on port 27018) |
| **Frontend Framework**| React 18, Vite, Lucide Icons, Neutral Slate & Charcoal Grey Design System (CSS3 Tokens) |
| **Authentication** | JWT Stateless (HMAC-SHA512 via `io.jsonwebtoken 0.12.6`), BCrypt Password Hashing, RBAC |
| **Outbound Messaging**| Spring Mail SMTP, Simulated Telecom SMS Dispatch Gateway |

---

## ⚙️ Installation & Running Locally

### Prerequisites
- **Java 21 LTS** (`openjdk@21`)
- **Node.js 20+** and **npm**
- **Docker & Docker Compose**

---

### Step 1: Start MongoDB
From the repository root:
```bash
docker compose up -d
```
*MongoDB runs on `localhost:27018` with user `threatlens_admin`.*

---

### Step 2: Start Backend Application
```bash
cd backend
./mvnw spring-boot:run
```
*The backend compiles with Java 21, automatically seeds the admin user and default detection rules, and listens on `http://localhost:8080`.*

---

### Step 3: Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173/` in your browser.*

---

## 🔑 Default Credentials

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Lead SOC Admin** | `admin` | `ChangeMe!Admin123` | Full Administrative, Rule Tuning & Containment Access |

*(A "Prefill credentials" shortcut is available directly on the login screen for rapid evaluation).*

---

## 🧪 Quick Evaluation Walkthrough

1. **Sign In**: Navigate to `http://localhost:5173/` and click **Prefill credentials**, then click **Sign in**.
2. **Command Hub**: Review the overall Security Posture Score, active sensor throughput, and select an operational module.
3. **Launch Attack Simulation**:
   - Navigate to **Security Logs** via the sidebar or Command Hub card.
   - Click **Simulate SSH Brute Force (5x Auth Fail)**.
   - Click **Simulate Ransomware Beacon (CRITICAL)**.
4. **Triage Alerts**:
   - Navigate to **Detections & Alerts**.
   - Review the newly generated detection alerts flagged by the sliding-window engine.
   - Click an alert row to inspect the detail drawer, acknowledge, or assign.
5. **Execute Containment**:
   - Navigate to **Incident Response**.
   - Open an active case and execute containment playbooks (**Quarantine IP**, **Lock User**, **Revoke Token**).
6. **Verify Notifications & Audit**:
   - Navigate to **Notifications**: Review dispatched SMS and email logs or trigger a test dispatch.
   - Navigate to **Audit Trail**: Confirm that all operator triage and containment actions are immutably logged with actor timestamps.

---

## 👤 Author & Academic Information

- **Author**: Pardhasaradhi Maheswaram
- **Degree**: B.E. Computer Science and Engineering (Full Stack Development)
- **Section**: 24BCF1-B
- **Capstone Project**: ThreatLens Security Threat Monitoring and Incident Response Platform