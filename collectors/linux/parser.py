"""
ThreatLens Linux Journal Event Parser and Normalizer.

Parses genuine Linux systemd journal JSON events (OpenSSH, Sudo, PAM)
and normalizes them into the ThreatLens SecurityLogRequest contract.
"""

import ipaddress
import os
import platform
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple


def get_system_metadata() -> Dict[str, str]:
    """Extracts host OS, kernel, and hardware metadata."""
    distro = "Linux"
    if os.path.exists("/etc/os-release"):
        try:
            with open("/etc/os-release", "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("PRETTY_NAME="):
                        distro = line.split("=", 1)[1].strip().strip('"')
                        break
        except Exception:
            pass

    return {
        "hostname": platform.node() or "unknown-host",
        "distribution": distro,
        "kernel": platform.release() or "unknown-kernel",
        "architecture": platform.machine() or "unknown-arch"
    }


STATIC_HOST_METADATA = get_system_metadata()

# Backend Source of Truth: LogEventType & LogSeverity enums
VALID_LOG_EVENT_TYPES = {
    "AUTHENTICATION_FAILURE",
    "AUTHENTICATION_SUCCESS",
    "AUTHORIZATION_FAILURE",
    "PORT_SCAN",
    "BRUTE_FORCE",
    "SQL_INJECTION",
    "XSS_ATTEMPT",
    "MALWARE_DETECTED",
    "RANSOMWARE_DETECTED",
    "SUSPICIOUS_PROCESS",
    "NETWORK_ANOMALY",
    "FILE_INTEGRITY_VIOLATION",
    "PRIVILEGE_ESCALATION",
    "DATA_EXFILTRATION",
    "POLICY_VIOLATION",
    "SYSTEM_ERROR",
    "OTHER"
}

VALID_LOG_SEVERITIES = {
    "INFO",
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL"
}

# Backend IP format regex from SecurityLogRequest.java:
# IPv4 standard dotted-quad OR uncompressed 8-group IPv6 with 7 colons OR empty string
BACKEND_IPV4_REGEX = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")
BACKEND_IPV6_REGEX = re.compile(r"^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$")


def normalize_ip_address(raw_ip: Optional[str]) -> str:
    """
    Validates and normalizes IP addresses to satisfy backend constraints.
    - Valid IPv4 -> returns dotted-quad.
    - Valid IPv6 -> expands to full 8-group exploded format if it matches backend regex.
    - Compressed IPv6 or unmatchable formats -> falls back to empty string "".
    - Empty / None / Local -> returns empty string "".
    """
    if not raw_ip:
        return ""

    raw_ip = raw_ip.strip()
    if not raw_ip or raw_ip in ("127.0.0.1", "::1", "localhost"):
        return ""

    # Strip port if present (e.g. 192.168.1.1:22 or [fe80::1]:22)
    if raw_ip.startswith("[") and "]" in raw_ip:
        raw_ip = raw_ip.split("]")[0].lstrip("[")
    elif ":" in raw_ip and "." in raw_ip:
        # IPv4 with port
        raw_ip = raw_ip.split(":")[0]

    try:
        addr = ipaddress.ip_address(raw_ip)
        if addr.version == 4:
            ip_str = str(addr)
            return ip_str if BACKEND_IPV4_REGEX.match(ip_str) else ""
        elif addr.version == 6:
            # Backend requires uncompressed 8 hex groups separated by 7 colons
            exploded = addr.exploded
            return exploded if BACKEND_IPV6_REGEX.match(exploded) else ""
    except ValueError:
        pass

    return ""


# --- Regex Signatures for OpenSSH ---
# Note: Standalone "Invalid user <user> from <ip>" is deliberately excluded from failed patterns
# because OpenSSH emits "Invalid user" followed immediately by "Failed password for invalid user".
# Including "Invalid user" causes duplicate counting of single failed login attempts.
SSH_FAILED_PATTERNS = [
    # Failed password for invalid user <user> from <ip> port <port> ssh2
    re.compile(r"Failed password for invalid user (?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)", re.IGNORECASE),
    # Failed password for <user> from <ip> port <port> ssh2
    re.compile(r"Failed password for (?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)", re.IGNORECASE),
    # Failed publickey for invalid user <user> from <ip> port <port>
    re.compile(r"Failed publickey for invalid user (?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)", re.IGNORECASE),
    # Failed publickey for <user> from <ip> port <port>
    re.compile(r"Failed publickey for (?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)", re.IGNORECASE),
    # Connection closed/reset by authenticating user <user> <ip> port <port> [preauth]
    re.compile(r"Connection (?:closed|reset) by authenticating user (?P<user>\S+) (?P<ip>\S+) port (?P<port>\d+)", re.IGNORECASE),
    # PAM authentication failure for sshd: rhost=<ip> user=<user>
    re.compile(r"pam_unix\(sshd:auth\): authentication failure;.*rhost=(?P<ip>\S+).*user=(?P<user>\S*)", re.IGNORECASE)
]

SSH_ACCEPTED_PATTERNS = [
    # Accepted password for <user> from <ip> port <port> ssh2
    re.compile(r"Accepted password for (?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)", re.IGNORECASE),
    # Accepted publickey for <user> from <ip> port <port> ssh2
    re.compile(r"Accepted publickey for (?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)", re.IGNORECASE),
    # Accepted keyboard-interactive/pam for <user> from <ip> port <port>
    re.compile(r"Accepted keyboard-interactive/pam for (?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)", re.IGNORECASE)
]


# --- Regex Signatures for Sudo ---
SUDO_EXEC_PATTERN = re.compile(
    r"^(?P<sudo_user>\S+)\s*:\s*TTY=(?P<tty>\S*)\s*;\s*PWD=(?P<pwd>[^;]*)\s*;\s*USER=(?P<target_user>\S+)\s*;\s*COMMAND=(?P<command>.*)$"
)

SUDO_AUTH_FAIL_PATTERN = re.compile(
    r"^(?P<sudo_user>\S+)\s*:\s*(?P<attempts>\d+)\s+incorrect password attempt.*COMMAND=(?P<command>.*)$",
    re.IGNORECASE
)
PAM_SUDO_FAIL_PATTERN = re.compile(
    r"pam_unix\(sudo:auth\): authentication failure;.*logname=(?P<sudo_user>\S*).*user=(?P<target_user>\S*)",
    re.IGNORECASE
)

SUDO_NOT_IN_SUDOERS_PATTERN = re.compile(
    r"^(?P<sudo_user>\S+)\s*:\s*user NOT in sudoers.*COMMAND=(?P<command>.*)$",
    re.IGNORECASE
)
SUDO_NOT_AUTHORIZED_PATTERN = re.compile(
    r"^(?P<sudo_user>\S+)\s*:\s*(command not allowed|user NOT authorized).*COMMAND=(?P<command>.*)$",
    re.IGNORECASE
)

# Interactive shell command targets (without script arguments)
INTERACTIVE_SHELL_BINARIES = {
    "/bin/bash", "/usr/bin/bash", "bash",
    "/bin/sh", "/usr/bin/sh", "sh",
    "/bin/zsh", "/usr/bin/zsh", "zsh",
    "/bin/fish", "/usr/bin/fish", "fish",
    "/bin/csh", "/usr/bin/csh", "csh",
    "/bin/tcsh", "/usr/bin/tcsh", "tcsh",
    "/bin/su", "/usr/bin/su", "su"
}


def is_interactive_root_shell(command_str: str) -> bool:
    """
    Evaluates whether a sudo command executes an interactive root shell.
    Examples of interactive shells:
      - sudo su
      - sudo su -
      - sudo su root
      - sudo /bin/bash
      - sudo sh -i
    Examples of NON-interactive script executions (routine):
      - sudo bash /opt/backup.sh
      - sudo sh /usr/local/bin/sync.sh
      - sudo pacman -Syu
      - sudo systemctl restart nginx
    """
    tokens = command_str.strip().split()
    if not tokens:
        return False

    binary = tokens[0]
    args = tokens[1:]

    # Direct "su" invocation via sudo
    if binary in ("/bin/su", "/usr/bin/su", "su"):
        # sudo su / sudo su - / sudo su root are all root shell spawns
        # Only non-interactive if '-c' flag is explicitly passed
        return "-c" not in args

    # Direct shell invocation (/bin/bash, /bin/sh, /bin/zsh)
    if binary in INTERACTIVE_SHELL_BINARIES:
        if not args:
            # Naked shell invocation: sudo /bin/bash -> interactive shell!
            return True
        # If flags like -i or --login without script file
        first_arg = args[0]
        if first_arg in ("-i", "-l", "--login") and len(args) == 1:
            return True
        # If executing a script path (e.g. bash /opt/backup.sh) -> NOT an interactive shell
        return False

    return False


def parse_timestamp_from_journal(journal_entry: Dict[str, Any]) -> str:
    """
    Extracts and normalizes timestamp to standard ISO-8601 UTC string with Z suffix
    satisfying Spring Boot Instant deserialization (e.g. 2026-11-05T04:40:00.123456Z).
    """
    realtime = journal_entry.get("__REALTIME_TIMESTAMP") or journal_entry.get("_SOURCE_REALTIME_TIMESTAMP")
    if realtime:
        try:
            ts_sec = float(realtime) / 1_000_000.0
            dt = datetime.fromtimestamp(ts_sec, tz=timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        except (ValueError, TypeError, OSError):
            pass

    # If entry already contains an ISO-8601 string
    raw_ts = journal_entry.get("timestamp") or journal_entry.get("@timestamp")
    if raw_ts and isinstance(raw_ts, str):
        try:
            clean_ts = raw_ts.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
            return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        except Exception:
            pass

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def extract_raw_message(journal_entry: Dict[str, Any]) -> str:
    """Extracts MESSAGE field handling UTF-8 and byte array forms safely."""
    raw = journal_entry.get("MESSAGE", "")
    if isinstance(raw, str):
        return raw.strip()
    if isinstance(raw, (list, tuple)):
        try:
            return bytes(raw).decode("utf-8", errors="replace").strip()
        except Exception:
            return str(raw)
    return str(raw).strip()


def parse_ssh_event(message: str, entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Evaluates whether an entry is an SSH authentication event."""
    # Check failed authentication
    for pattern in SSH_FAILED_PATTERNS:
        m = pattern.search(message)
        if m:
            group = m.groupdict()
            user = group.get("user") or "unknown"
            raw_ip = group.get("ip") or ""
            port = group.get("port") or ""
            ip = normalize_ip_address(raw_ip)

            severity = "HIGH" if user.lower() in ("root", "admin", "administrator") else "MEDIUM"

            return {
                "eventType": "AUTHENTICATION_FAILURE",
                "severity": severity,
                "sourceIp": ip,
                "message": f"SSH authentication failed for user '{user}' from {raw_ip}:{port}",
                "metadata": {
                    "user": user,
                    "source_port": port,
                    "service": "sshd",
                    "auth_result": "FAILED",
                    "raw_ip": raw_ip,
                    "raw_log": message
                }
            }

    # Check accepted authentication
    for pattern in SSH_ACCEPTED_PATTERNS:
        m = pattern.search(message)
        if m:
            group = m.groupdict()
            user = group.get("user") or "unknown"
            raw_ip = group.get("ip") or ""
            port = group.get("port") or ""
            ip = normalize_ip_address(raw_ip)

            severity = "LOW" if user.lower() == "root" else "INFO"

            return {
                "eventType": "AUTHENTICATION_SUCCESS",
                "severity": severity,
                "sourceIp": ip,
                "message": f"SSH authentication accepted for user '{user}' from {raw_ip}:{port}",
                "metadata": {
                    "user": user,
                    "source_port": port,
                    "service": "sshd",
                    "auth_result": "SUCCESS",
                    "raw_ip": raw_ip,
                    "raw_log": message
                }
            }

    return None


def parse_sudo_event(message: str, entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Evaluates whether an entry is a Sudo event.
    Distinguishes authorized sudo executions from unauthorized escalation attempts.
    """
    # 1. Unauthorized / user NOT in sudoers
    m = SUDO_NOT_IN_SUDOERS_PATTERN.search(message) or SUDO_NOT_AUTHORIZED_PATTERN.search(message)
    if m:
        group = m.groupdict()
        user = group.get("sudo_user") or "unknown"
        cmd = (group.get("command") or "").strip()
        return {
            "eventType": "PRIVILEGE_ESCALATION",
            "severity": "HIGH",
            "sourceIp": "",
            "message": f"Unauthorized sudo privilege escalation attempt by non-sudoer '{user}': {cmd}",
            "metadata": {
                "sudo_user": user,
                "target_user": "root",
                "command": cmd,
                "sudo_status": "DENIED_NOT_IN_SUDOERS",
                "raw_log": message
            }
        }

    # 2. Sudo password / authentication failure
    m = SUDO_AUTH_FAIL_PATTERN.search(message) or PAM_SUDO_FAIL_PATTERN.search(message)
    if m:
        group = m.groupdict()
        user = group.get("sudo_user") or "unknown"
        target_user = group.get("target_user") or "root"
        cmd = (group.get("command") or "").strip()
        return {
            "eventType": "AUTHENTICATION_FAILURE",
            "severity": "MEDIUM",
            "sourceIp": "",
            "message": f"Sudo authentication failure for user '{user}' attempting command: {cmd}",
            "metadata": {
                "sudo_user": user,
                "target_user": target_user,
                "command": cmd,
                "sudo_status": "AUTH_FAILED",
                "raw_log": message
            }
        }

    # 3. Standard sudo command execution
    m = SUDO_EXEC_PATTERN.search(message)
    if m:
        group = m.groupdict()
        user = group.get("sudo_user", "").strip()
        target_user = group.get("target_user", "").strip()
        cmd = group.get("command", "").strip()
        tty = group.get("tty", "").strip()
        pwd = group.get("pwd", "").strip()

        # Check if the command spawns an interactive root shell
        if is_interactive_root_shell(cmd):
            return {
                "eventType": "OTHER",
                "severity": "LOW",
                "sourceIp": "",
                "message": f"Interactive root shell executed via sudo by '{user}' as '{target_user}': {cmd}",
                "metadata": {
                    "sudo_user": user,
                    "target_user": target_user,
                    "command": cmd,
                    "tty": tty,
                    "pwd": pwd,
                    "is_interactive_shell": "true",
                    "raw_log": message
                }
            }
        else:
            # Routine command execution (pacman, systemctl, script runner)
            return {
                "eventType": "OTHER",
                "severity": "INFO",
                "sourceIp": "",
                "message": f"Sudo command executed by '{user}' as '{target_user}': {cmd}",
                "metadata": {
                    "sudo_user": user,
                    "target_user": target_user,
                    "command": cmd,
                    "tty": tty,
                    "pwd": pwd,
                    "is_interactive_shell": "false",
                    "raw_log": message
                }
            }

    return None


def normalize_journal_entry(
    entry: Dict[str, Any],
    source_system_override: Optional[str] = None,
    host_ip_fallback: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Evaluates, filters, and normalizes a systemd journal entry into a SecurityLogRequest payload.
    Returns None if the entry is irrelevant or should not be forwarded.
    """
    unit = entry.get("_SYSTEMD_UNIT", "")
    comm = entry.get("_COMM", "")
    syslog_id = entry.get("SYSLOG_IDENTIFIER", "")
    message = extract_raw_message(entry)

    if not message:
        return None

    # Filter: Inspect SSH and Sudo relevant units, commands, syslog tags, and message contents
    is_ssh = "sshd" in unit or "sshd" in comm or "sshd" in syslog_id or "sshd" in message
    is_sudo = "sudo" in unit or "sudo" in comm or "sudo" in syslog_id or "pam_unix(sudo" in message

    if not (is_ssh or is_sudo):
        return None

    parsed = None
    if is_ssh:
        parsed = parse_ssh_event(message, entry)
    if not parsed and is_sudo:
        parsed = parse_sudo_event(message, entry)

    if not parsed:
        return None

    timestamp = parse_timestamp_from_journal(entry)
    source_ip = parsed.get("sourceIp", "").strip()

    # Note: Local sudo events do not use 127.0.0.1; they use empty string "" to accurately
    # reflect that the event is a local console/host event rather than a network origin.
    destination_ip = normalize_ip_address(host_ip_fallback)

    merged_metadata = dict(STATIC_HOST_METADATA)
    merged_metadata["systemd_unit"] = unit
    merged_metadata["comm"] = comm
    merged_metadata["syslog_identifier"] = syslog_id
    merged_metadata["pid"] = entry.get("_PID", "")
    merged_metadata["uid"] = entry.get("_UID", "")
    merged_metadata["journal_cursor"] = entry.get("__CURSOR", "")
    if "metadata" in parsed:
        merged_metadata.update(parsed["metadata"])

    source_system = source_system_override or STATIC_HOST_METADATA.get("hostname") or "arch-linux"

    payload = {
        "timestamp": timestamp,
        "sourceIp": source_ip,
        "destinationIp": destination_ip,
        "eventType": parsed["eventType"],
        "severity": parsed["severity"],
        "sourceSystem": source_system,
        "message": parsed["message"],
        "metadata": merged_metadata
    }

    is_valid, reason = validate_security_log_payload(payload)
    if not is_valid:
        # Failsafe: Log or discard if contract validation fails
        return None

    return payload


def validate_security_log_payload(payload: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validates a normalized payload against the ThreatLens backend SecurityLogRequest contract.
    Returns (True, "") if valid, or (False, "reason") if invalid.
    """
    if not isinstance(payload, dict):
        return False, "Payload must be a dictionary"

    # 1. timestamp: required, non-empty ISO-8601 string
    ts = payload.get("timestamp")
    if not ts or not isinstance(ts, str):
        return False, "Missing or non-string 'timestamp'"
    try:
        clean_ts = ts.replace("Z", "+00:00")
        datetime.fromisoformat(clean_ts)
    except Exception:
        return False, f"Invalid ISO-8601 timestamp format: '{ts}'"

    # 2. sourceIp: must match backend regex (^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^$)
    src_ip = payload.get("sourceIp", "")
    if not isinstance(src_ip, str):
        return False, "Field 'sourceIp' must be a string"
    if src_ip and not (BACKEND_IPV4_REGEX.match(src_ip) or BACKEND_IPV6_REGEX.match(src_ip)):
        return False, f"Invalid sourceIp format: '{src_ip}'"

    # 3. eventType: required, must be valid LogEventType
    event_type = payload.get("eventType")
    if not event_type or event_type not in VALID_LOG_EVENT_TYPES:
        return False, f"Invalid or missing eventType: '{event_type}'"

    # 4. severity: required, must be valid LogSeverity
    severity = payload.get("severity")
    if not severity or severity not in VALID_LOG_SEVERITIES:
        return False, f"Invalid or missing severity: '{severity}'"

    # 5. sourceSystem: required, non-blank
    source_system = payload.get("sourceSystem")
    if not source_system or not str(source_system).strip():
        return False, "Field 'sourceSystem' is required and cannot be blank"

    # 6. message: required, non-blank
    message = payload.get("message")
    if not message or not str(message).strip():
        return False, "Field 'message' is required and cannot be blank"

    # 7. metadata: optional, must be dict if present
    metadata = payload.get("metadata")
    if metadata is not None and not isinstance(metadata, dict):
        return False, "Field 'metadata' must be a dictionary"

    return True, ""
