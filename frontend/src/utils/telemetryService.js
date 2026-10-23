/**
 * ThreatLens Real-Time Enterprise Telemetry Service
 * Sends authentic security telemetry to Spring Boot backend (/api/logs)
 * which processes rules, risk scores, detections, and auto-dispatches alerts.
 */

import api from '../api/client';

const INTERNAL_HOSTS = [
  { ip: '10.0.1.14', host: 'auth-dc-01.corp.internal', system: 'active-directory' },
  { ip: '10.0.2.45', host: 'k8s-ingress-prod.internal', system: 'nginx-ingress' },
  { ip: '10.0.4.88', host: 'fin-database-cluster.internal', system: 'mongodb-enterprise' },
  { ip: '10.0.5.12', host: 'vpn-gateway-west.internal', system: 'palo-alto-vpn' },
  { ip: '10.0.8.90', host: 'workstation-fin-04.corp.internal', system: 'edr-crowdstrike-agent' }
];

const NORMAL_USERS = ['alice.chen', 'bob.martinez', 'carol.dev', 'david.ops', 'emma.analyst'];

/**
 * Injects a realistic non-threat enterprise event (EPS filler)
 */
export async function injectNormalEvent() {
  const host = INTERNAL_HOSTS[Math.floor(Math.random() * INTERNAL_HOSTS.length)];
  const user = NORMAL_USERS[Math.floor(Math.random() * NORMAL_USERS.length)];
  const now = new Date().toISOString();

  const templates = [
    {
      eventType: 'AUTHENTICATION_SUCCESS',
      severity: 'INFO',
      sourceIp: `10.0.9.${Math.floor(Math.random() * 200 + 10)}`,
      destinationIp: host.ip,
      sourceSystem: host.system,
      message: `Kerberos ticket granted for user ${user} on service ${host.host}`,
      metadata: { user, protocol: 'Kerberos', port: 88, status: 'SUCCESS' }
    },
    {
      eventType: 'POLICY_VIOLATION',
      severity: 'LOW',
      sourceIp: host.ip,
      destinationIp: '10.0.0.1',
      sourceSystem: host.system,
      message: `Storage DLP policy check: encrypted thumb drive detected on host ${host.host}`,
      metadata: { user, driveId: 'VID_0781&PID_5583', action: 'QUARANTINED' }
    },
    {
      eventType: 'NETWORK_ANOMALY',
      severity: 'LOW',
      sourceIp: host.ip,
      destinationIp: '172.217.16.206',
      sourceSystem: 'edge-perimeter-firewall',
      message: `Outbound HTTPS egress flow verified: 48.2 KB transferred to Google Cloud CDN`,
      metadata: { port: 443, proto: 'TCP', bytes: 49350 }
    },
    {
      eventType: 'FILE_INTEGRITY_VIOLATION',
      severity: 'INFO',
      sourceIp: host.ip,
      destinationIp: host.ip,
      sourceSystem: 'osquery-auditd',
      message: `Configuration drift check: read-only access on /etc/security/limits.conf`,
      metadata: { path: '/etc/security/limits.conf', user: 'systemd' }
    }
  ];

  const picked = templates[Math.floor(Math.random() * templates.length)];
  return await api.post('/logs', {
    ...picked,
    timestamp: now
  });
}

/**
 * Injects an active cyber attack to demonstrate the SIEM detection engine
 */
export async function injectAttack(attackType) {
  const now = new Date().toISOString();

  if (attackType === 'BRUTE_FORCE') {
    const attackerIp = `198.51.100.${Math.floor(Math.random() * 240 + 10)}`;
    const results = [];
    // Inject 5 rapid authentication failures to exceed threshold of 3
    for (let i = 1; i <= 5; i++) {
      const res = await api.post('/logs', {
        timestamp: new Date().toISOString(),
        sourceIp: attackerIp,
        destinationIp: '10.0.1.14',
        eventType: 'BRUTE_FORCE',
        severity: 'HIGH',
        sourceSystem: 'ssh-bastion-gateway',
        message: `SSH password authentication failed for invalid user 'root' from ${attackerIp} (attempt ${i}/5)`,
        metadata: { targetUser: 'root', port: 22, attemptNumber: i, sourceIp: attackerIp }
      });
      results.push(res);
    }
    return {
      type: 'BRUTE_FORCE',
      title: 'SSH Brute Force Outbreak',
      message: `Dispatched 5 rapid SSH attacks from ${attackerIp}. Rule threshold (>=3 in 60s) triggered -> HIGH Alert auto-created!`,
      severity: 'HIGH',
      attackerIp
    };
  }

  if (attackType === 'RANSOMWARE') {
    const host = '10.0.4.88';
    await api.post('/logs', {
      timestamp: now,
      sourceIp: host,
      destinationIp: '198.51.100.200',
      eventType: 'RANSOMWARE_DETECTED',
      severity: 'CRITICAL',
      sourceSystem: 'edr-crowdstrike-agent',
      message: 'CRITICAL ALERT: Mass canary file encryption detected (.locked extension). Cryptolocker C2 heartbeat intercepted.',
      metadata: { affectedFiles: 1420, canaryKey: 'CANARY_FINANCE_DB_01', c2Server: '198.51.100.200:8443' }
    });
    return {
      type: 'RANSOMWARE',
      title: 'Ransomware Beacon Incident',
      message: `Injected CRITICAL ransomware canary beacon from host ${host}. Rule matched -> CRITICAL Alert auto-dispatched & Posture Score lowered!`,
      severity: 'CRITICAL'
    };
  }

  if (attackType === 'PORT_SCAN') {
    const attackerIp = `203.0.113.${Math.floor(Math.random() * 200 + 10)}`;
    await api.post('/logs', {
      timestamp: now,
      sourceIp: attackerIp,
      destinationIp: '10.0.1.1',
      eventType: 'PORT_SCAN',
      severity: 'MEDIUM',
      sourceSystem: 'edge-perimeter-firewall',
      message: `TCP SYN Reconnaissance sweep detected across ports 21, 22, 23, 80, 443, 3389, 8080 from ${attackerIp}`,
      metadata: { sweptPorts: [21, 22, 23, 80, 443, 3389, 8080], flags: 'SYN', attackerIp }
    });
    return {
      type: 'PORT_SCAN',
      title: 'Port Scan & Reconnaissance',
      message: `SYN sweep logged from external IP ${attackerIp}. Rule matched -> MEDIUM detection logged.`,
      severity: 'MEDIUM',
      attackerIp
    };
  }

  if (attackType === 'PRIV_ESC') {
    const host = '10.0.2.45';
    await api.post('/logs', {
      timestamp: now,
      sourceIp: host,
      destinationIp: host,
      eventType: 'PRIVILEGE_ESCALATION',
      severity: 'HIGH',
      sourceSystem: 'auditd-k8s-node',
      message: 'Unauthorized sudo privilege escalation: daemon-svc attempted root execution without wheel permissions',
      metadata: { command: '/usr/bin/sudo /bin/bash', targetUser: 'root', invokingUser: 'daemon-svc' }
    });
    return {
      type: 'PRIV_ESC',
      title: 'Unauthorized Privilege Escalation',
      message: `Unauthorized sudo attempt logged on ${host}. Rule matched -> HIGH Alert auto-dispatched.`,
      severity: 'HIGH'
    };
  }

  throw new Error(`Unknown attack type: ${attackType}`);
}
