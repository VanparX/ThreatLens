# 🔐 ThreatLens — Autonomous Security Threat Monitoring & Incident Response Platform (SOC SIEM / SOAR)

[![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%204%20%7C%20Java%2021%20LTS-brightgreen.svg)](#)
[![Database](https://img.shields.io/badge/Database-MongoDB%207.0-forestgreen.svg)](#)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20SOC%20Dark%20Theme-blue.svg)](#)
[![Security](https://img.shields.io/badge/Security-JWT%20Stateless%20%7C%20BCrypt%20%7C%20RBAC-cyan.svg)](#)
[![Notifications](https://img.shields.io/badge/Outbound-Email%20%26%20SMS%20Advisories-orange.svg)](#)

---

## 📌 Executive Summary

**ThreatLens** is an autonomous, full-stack Security Operations Center (SOC) platform integrating **SIEM (Security Information and Event Management)** log collection with **SOAR (Security Orchestration, Automation, and Response)** capabilities.

Designed as a university capstone project in Full Stack Development & Cybersecurity Engineering, ThreatLens demonstrates the end-to-end security lifecycle:
1. **Telemetry Ingestion**: High-throughput log collection from firewalls, bastion hosts, and endpoint sensors.
2. **Detection & Risk Scoring**: Real-time evaluation against configurable threshold and pattern detection rules, computing composite asset risk scores ($0 - 100$).
3. **Automated Alerting & Outbound Dispatch**: Auto-escalation of High/Critical threats, triggering immediate **Email Advisories** and emergency **SMS Notifications**.
4. **Active Incident Containment**: Live response playbooks (IP isolation, compromised account lockdown, session token revocation).
5. **Immutable Audit Logging**: Strict non-repudiation audit trail logging all operator overrides and playbook executions.

---

## 🏛️ System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │               ThreatLens SOC Console (React)           │
                    │   • Posture Score Gauge   • Real-Time Log Explorer     │
                    │   • Alert Triage Center   • Adversary Simulator        │
                    │   • SOAR Containment Hub  • Email/SMS Settings Panel   │
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
│                             ┌──────────────────────────┐                                 │
│                             │   Immutable Audit Log    │                                 │
│                             │   • SOC Action Recording │                                 │
│                             └──────────────────────────┘                                 │
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

## 🚀 Key Features & Capabilities

### 1. Adversary Attack Simulator (Live Demonstration Hub)
Evaluate the platform with 1-click built-in test attack vectors directly in the UI:
- **SSH Brute Force Simulation**: Fires consecutive authentication failure bursts from an attacker IP, triggering the threshold rule and escalating to an Alert.
- **Ransomware Canary & Encryption**: Dispatches `.locked` beacon logs at `CRITICAL` severity, automatically firing emergency SMS and email security advisories.
- **Port Scan Sweep**: Simulates reconnaissance SYN sweeps across DMZ ports.
- **Privilege Escalation**: Simulates unauthorized sudo elevation by non-privileged daemon users.

### 2. Multi-Channel Alert Dispatch (Email & SMS)
- **Email Security Advisory**: Sends full alert reports (ID, severity, affected source IP, recommended action).
- **Emergency SMS Dispatch**: Pushes critical SMS texts to on-duty security officers.
- **Channel Preferences**: Fully configurable recipient email, telephone number, and minimum dispatch severity filter.

### 3. SOAR Containment Playbooks
Within any active Incident case, analysts can trigger live containment actions:
- **Quarantine IP**: Drops ingress/egress traffic for the offending host.
- **Lock Account**: Immediately terminates user session and disables credential lookup.
- **Revoke Session Keys**: Force-invalidates JWT tokens across edge gateways.

### 4. Detection Rule Engine
Configurable sliding-window rules seeded out-of-the-box:
1. *SSH Brute Force Detection* (Threshold: $\ge 3$ events in 60s)
2. *Ransomware Encryption Activity* (Immediate Event Match: CRITICAL)
3. *Reconnaissance & Port Sweep* (Event Match: MEDIUM)
4. *Unauthorized Privilege Escalation* (Event Match: HIGH)

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Core** | Spring Boot 4.1.1, Java 21 LTS, Spring Data MongoDB, Spring Security |
| **Database** | MongoDB 7.0 Containerized |
| **Frontend Framework**| React 18, Vite, Lucide Icons, Modern SOC Dark Theme (CSS3 tokens) |
| **Authentication** | JWT (HMAC-SHA512 with `io.jsonwebtoken 0.12.6`), BCrypt |
| **Outbound Messaging**| Async Email Dispatcher, Simulated Telecom SMS Gateway |

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
*The backend automatically compiles with Java 21, seeds the default admin user and armed detection rules, and listens on `http://localhost:8080`.*

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
| **Lead SOC Admin** | `admin` | `ChangeMe!Admin123` | Full Administrative & Containment Access |

*(A 1-click button "Load Admin: admin / ChangeMe!Admin123" is available directly on the login screen for rapid evaluation).*

---

## 🧪 Quick Evaluation Walkthrough

1. **Log in**: Open `http://localhost:5173/` and click **Establish Secure SOC Session**.
2. **Inspect Dashboard**: View the Security Posture Score ($0 - 100$) and live telemetry cards.
3. **Launch Attack Simulation**:
   - Go to **Log Stream & Simulator** in the sidebar.
   - Click **Simulate SSH Brute Force (5x Auth Fail)**.
   - Click **Simulate Ransomware Beacon (CRITICAL)**.
4. **Triage Alerts**:
   - Go to **Alert Center**.
   - Notice the newly generated alerts from the detection engine.
   - Click an alert to investigate, acknowledge, or claim it.
5. **Execute Containment**:
   - Go to **Incident Response**.
   - Open an incident case or review active cases.
   - Click **Quarantine & Drop IP** or **Lock Target Account**.
6. **Verify Notifications & Audit**:
   - Go to **Alert Channels (Email/SMS)**: Review dispatched SMS & email logs or send a test dispatch.
   - Go to **SOC Audit Logs**: Verify that every action performed was immutably recorded.

---

## 👤 Author & Academic Information

- **Author**: Pardhasaradhi Maheswaram
- **Degree**: B.E. Computer Science and Engineering (Full Stack Development)
- **Section**: 24BCF1-B
- **Capstone Project**: ThreatLens Security Threat Monitoring and Incident Response Platform