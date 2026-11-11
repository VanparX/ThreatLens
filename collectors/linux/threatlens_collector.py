#!/usr/bin/env python3
"""
ThreatLens Genuine Linux Security Event Collector.
Streams authentic systemd journal events from Arch Linux, parses and normalizes
OpenSSH and Sudo security telemetry, and forwards to the ThreatLens SIEM backend.

Reliability & Security Properties:
- Standard library only (no external pip dependencies).
- Bounded buffering with backpressure (no silent deque drops).
- Dead-letter quarantining for HTTP 400/422 (never blocks queue on poison events).
- Authorization error pausing on HTTP 403 (retains events; does not drop).
- Exponential backoff on HTTP 429/5xx and network outages.
- Atomic cursor state persistence with restrictive permissions (0600).
- Zero secret / JWT token leakage in logs or state files.
- Delivery Model: At-least-once delivery, subject to systemd journal retention.
"""

import collections
import enum
import json
import logging
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Tuple

from parser import normalize_journal_entry

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [ThreatLensCollector] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("ThreatLensCollector")


class DeliveryStatus(enum.Enum):
    SUCCESS = "SUCCESS"                      # 200, 201
    PERMANENT_ERROR = "PERMANENT_ERROR"      # 400, 422 (quarantine to dead-letter, advance)
    AUTH_FORBIDDEN = "AUTH_FORBIDDEN"        # 403 (pause delivery, retain event)
    TRANSIENT_FAILURE = "TRANSIENT_FAILURE"  # 429, 5xx, network timeouts (retry with backoff)


class DeliveryResult:
    def __init__(self, status: DeliveryStatus, status_code: int = 0, message: str = ""):
        self.status = status
        self.status_code = status_code
        self.message = message


def load_env_file(filepath: Path) -> Dict[str, str]:
    """Parses a key=value environment file without third-party dependencies."""
    env_vars = {}
    if not filepath.is_file():
        return env_vars
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'").strip('"')
                env_vars[k] = v
    except Exception as e:
        logger.warning(f"Failed to read config file {filepath}: {e}")
    return env_vars


class CollectorConfig:
    """Holds collector configuration parameters with safe defaults."""

    def __init__(self, config_path: Optional[Path] = None):
        file_env = load_env_file(config_path) if config_path else {}

        def get_val(key: str, default: str) -> str:
            return os.environ.get(key) or file_env.get(key) or default

        self.backend_url = get_val("THREATLENS_BACKEND_URL", "http://10.226.72.236:8080").rstrip("/")
        self.username = get_val("COLLECTOR_USERNAME", "collector_arch_predator")
        self.password = get_val("COLLECTOR_PASSWORD", "")
        self.source_system = get_val("COLLECTOR_SOURCE_SYSTEM", "archlinux-predator")
        self.host_ip = get_val("COLLECTOR_HOST_IP", "10.226.72.231")
        self.state_file = Path(get_val("COLLECTOR_STATE_FILE", "collector_cursor.json"))
        self.dead_letter_file = Path(get_val("COLLECTOR_DEAD_LETTER_FILE", "dead_letter.jsonl"))
        self.max_buffer_size = int(get_val("MAX_BUFFER_SIZE", "1000"))
        self.max_retry_delay = float(get_val("MAX_RETRY_DELAY_SECONDS", "60.0"))
        self.initial_retry_delay = float(get_val("INITIAL_RETRY_DELAY_SECONDS", "2.0"))
        self.poll_interval = float(get_val("POLL_INTERVAL_SECONDS", "1.0"))
        # Empty default allows streaming full journal and filtering in Python,
        # ensuring interactive sudo events (which have no systemd service) are not dropped.
        self.units = [u.strip() for u in get_val("COLLECTOR_JOURNAL_UNITS", "").split(",") if u.strip()]

    def validate(self) -> None:
        if not self.backend_url.startswith("http://") and not self.backend_url.startswith("https://"):
            raise ValueError(f"Invalid backend URL: {self.backend_url}")
        if not self.username:
            raise ValueError("COLLECTOR_USERNAME cannot be empty")
        if not self.password:
            logger.warning("COLLECTOR_PASSWORD is not set. Ingestion will fail if backend authentication is required.")


class DeadLetterManager:
    """Appends permanently rejected events to a dead-letter quarantine file."""

    def __init__(self, file_path: Path):
        self.file_path = file_path

    def quarantine(self, payload: Dict[str, Any], reason: str, status_code: int) -> bool:
        """
        Durably writes a rejected poison event to the dead-letter quarantine JSONL file.
        Flushes and fsyncs to disk before returning True.
        Returns False if persistence fails.
        """
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            record = {
                "quarantined_at": datetime.now(timezone.utc).isoformat(),
                "status_code": status_code,
                "reason": reason,
                "payload": payload
            }
            # Append atomically with restrictive permissions and sync to durable storage
            with open(self.file_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
                f.flush()
                os.fsync(f.fileno())

            if hasattr(os, "chmod") and self.file_path.exists():
                try:
                    os.chmod(self.file_path, 0o600)
                except Exception:
                    pass

            sanitized_reason = str(reason).replace("\n", " ").replace("\r", " ")[:200]
            event_type = payload.get("eventType", "UNKNOWN")
            msg_snippet = str(payload.get("message", ""))[:50].replace("\n", " ")
            logger.error(
                f"Quarantined poison event to {self.file_path} (HTTP {status_code}): {sanitized_reason} "
                f"[{event_type} - {msg_snippet}]"
            )
            return True
        except Exception as ex:
            sanitized_err = str(ex).replace("\n", " ")[:200]
            logger.critical(f"Failed to write to dead-letter quarantine file {self.file_path}: {sanitized_err}")
            return False


def _fsync_dir(dir_path: Path) -> None:
    """Safely flushes directory metadata to durable storage on POSIX where supported."""
    try:
        flags = os.O_RDONLY
        if hasattr(os, "O_DIRECTORY"):
            flags |= os.O_DIRECTORY
        fd = os.open(str(dir_path), flags)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    except Exception as dir_err:
        # Directory fsync is not universally supported across all OS kernels or filesystems (e.g. NFS, Windows).
        # We catch and log at debug level so unsupported directory fsync never masks or prevents cursor saves.
        logger.debug(f"Directory fsync ignored or not supported on {dir_path}: {dir_err}")


class CursorManager:
    """Safely reads and updates the journalctl cursor with atomic file writes, fsync, and 0600 permissions."""

    def __init__(self, state_file: Path):
        self.state_file = state_file

    def get_cursor(self) -> Optional[str]:
        if not self.state_file.is_file():
            return None
        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("cursor")
        except Exception as e:
            logger.warning(f"Could not read cursor from {self.state_file}: {e}")
            return None

    def save_cursor(self, cursor: str, total_forwarded: int) -> bool:
        """
        Durably commits cursor position and forwarding statistics to disk.
        Flushes and fsyncs the temporary file, atomically replaces the target,
        and fsyncs the parent directory where supported.
        Returns True on success, False on persistence failure.
        """
        if not cursor:
            return False
        tmp_file = None
        try:
            self.state_file.parent.mkdir(parents=True, exist_ok=True)
            tmp_file = self.state_file.with_suffix(f".tmp.{os.getpid()}")
            payload = {
                "cursor": cursor,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "total_forwarded": total_forwarded
            }
            with open(tmp_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
                f.flush()
                os.fsync(f.fileno())

            # Restrict permissions before moving into place
            if hasattr(os, "chmod"):
                try:
                    os.chmod(tmp_file, 0o600)
                except Exception:
                    pass

            tmp_file.replace(self.state_file)

            if hasattr(os, "chmod") and self.state_file.exists():
                try:
                    os.chmod(self.state_file, 0o600)
                except Exception:
                    pass

            # Fsync parent directory to flush directory entry on POSIX (safely handled if unsupported)
            try:
                _fsync_dir(self.state_file.parent)
            except Exception as dir_err:
                logger.debug(f"Directory fsync error ignored: {dir_err}")

            return True
        except Exception as e:
            logger.critical(f"Failed to persist cursor state to {self.state_file}: {e}")
            if tmp_file and tmp_file.exists():
                try:
                    tmp_file.unlink()
                except Exception:
                    pass
            return False


class ThreatLensBackendClient:
    """Manages JWT authentication and HTTP transmission to the Spring Boot backend."""

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url
        self.username = username
        self.password = password
        self.jwt_token: Optional[str] = None

    def authenticate(self) -> bool:
        """Authenticates with /api/auth/login and stores JWT in memory."""
        login_url = f"{self.base_url}/api/auth/login"
        payload = json.dumps({"username": self.username, "password": self.password}).encode("utf-8")
        req = urllib.request.Request(
            login_url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "ThreatLens-Linux-Collector/1.0"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                if resp.status == 200:
                    body = json.loads(resp.read().decode("utf-8"))
                    data = body.get("data", {}) if isinstance(body.get("data"), dict) else body
                    token = data.get("token") or body.get("token")
                    if token:
                        self.jwt_token = token
                        # Never log full or partial JWT strings
                        logger.info(f"Authentication successful for '{self.username}' (JWT session active)")
                        return True
                    else:
                        logger.error("Login response did not contain an authentication token")
                        return False
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            logger.error(f"Authentication failed: HTTP {e.code} - {err_body}")
            return False
        except Exception as e:
            logger.error(f"Failed to connect to authentication endpoint {login_url}: {e}")
            return False

    def send_log(self, log_payload: Dict[str, Any], is_retry: bool = False) -> DeliveryResult:
        """
        Sends a single normalized security log payload to POST /api/logs.
        Returns a DeliveryResult indicating SUCCESS, PERMANENT_ERROR, AUTH_FORBIDDEN, or TRANSIENT_FAILURE.
        """
        if not self.jwt_token:
            if not self.authenticate():
                return DeliveryResult(DeliveryStatus.TRANSIENT_FAILURE, 0, "Initial authentication failed")

        logs_url = f"{self.base_url}/api/logs"
        data = json.dumps(log_payload).encode("utf-8")
        req = urllib.request.Request(
            logs_url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.jwt_token}",
                "User-Agent": "ThreatLens-Linux-Collector/1.0"
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                if resp.status in (200, 201):
                    return DeliveryResult(DeliveryStatus.SUCCESS, resp.status, "Delivered")
                return DeliveryResult(DeliveryStatus.TRANSIENT_FAILURE, resp.status, f"Unexpected HTTP status {resp.status}")
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="replace")

            if e.code == 401:
                if is_retry:
                    logger.error("Authentication token rejected on retry (HTTP 401)")
                    return DeliveryResult(DeliveryStatus.TRANSIENT_FAILURE, 401, "Token rejected on retry")
                logger.warning("JWT token expired (HTTP 401). Refreshing authentication...")
                self.jwt_token = None
                if self.authenticate():
                    # Retry once with fresh token
                    return self.send_log(log_payload, is_retry=True)
                return DeliveryResult(DeliveryStatus.TRANSIENT_FAILURE, 401, "Token refresh failed")

            if e.code in (400, 422):
                # Permanent validation error (malformed payload or validation rejected)
                return DeliveryResult(DeliveryStatus.PERMANENT_ERROR, e.code, err_msg)

            if e.code == 403:
                # Authorization failure (account lacks required role)
                return DeliveryResult(DeliveryStatus.AUTH_FORBIDDEN, 403, err_msg)

            if e.code in (429, 500, 502, 503, 504):
                # Server side or rate-limit transient error
                return DeliveryResult(DeliveryStatus.TRANSIENT_FAILURE, e.code, err_msg)

            return DeliveryResult(DeliveryStatus.TRANSIENT_FAILURE, e.code, err_msg)
        except Exception as e:
            return DeliveryResult(DeliveryStatus.TRANSIENT_FAILURE, 0, str(e))


class LinuxJournalCollector:
    """Main collector engine tailing systemd-journald and shipping events."""

    def __init__(self, config: CollectorConfig):
        self.config = config
        self.cursor_mgr = CursorManager(config.state_file)
        self.dead_letter_mgr = DeadLetterManager(config.dead_letter_file)
        self.client = ThreatLensBackendClient(config.backend_url, config.username, config.password)
        # In-memory FIFO queue without silent eviction
        self.buffer: List[Tuple[str, Dict[str, Any]]] = []
        # Tracks cursors of events durably written to dead-letter to avoid duplicates while retrying cursor save
        self._quarantined_cursors: set = set()
        self.total_forwarded = 0
        self.running = True

    def stop(self, *args) -> None:
        logger.info("Shutdown signal received. Stopping collector...")
        self.running = False

    def start_journalctl_process(self, cursor: Optional[str]) -> subprocess.Popen:
        """Launches journalctl in JSON output follow mode."""
        cmd = ["journalctl", "-o", "json", "--follow"]

        if cursor:
            cmd.extend(["--after-cursor", cursor])
            logger.info("Resuming journal streaming after stored cursor.")
        else:
            cmd.extend(["-n", "0"])
            logger.info("No prior cursor found. Following journal starting from current tail (-n 0).")

        if "sudo.service" in self.config.units:
            logger.warning(
                "Configuration contains 'sudo.service'. Sudo is an interactive CLI command, "
                "not a systemd daemon service on Arch Linux. Specifying 'sudo.service' prevents "
                "journalctl from capturing interactive sudo commands. Use empty COLLECTOR_JOURNAL_UNITS='' instead."
            )

        for item in self.config.units:
            if "=" in item or item == "+" or item.startswith("-"):
                cmd.append(item)
            else:
                cmd.extend(["-u", item])

        logger.info(f"Executing command: {' '.join(cmd)}")
        return subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )

    def flush_buffer(self) -> DeliveryStatus:
        """
        Attempts to drain the local buffer to the backend.
        Returns the status of the last transmission attempt.
        Strict reliability rule: Events are popped from self.buffer ONLY after cursor persistence succeeds.
        """
        while self.buffer and self.running:
            cursor, payload = self.buffer[0]
            result = self.client.send_log(payload)

            if result.status == DeliveryStatus.SUCCESS:
                # Ingestion succeeded: Persist cursor state BEFORE removing from in-memory queue
                if self.cursor_mgr.save_cursor(cursor, self.total_forwarded + 1):
                    self.buffer.pop(0)
                    self.total_forwarded += 1
                    event_type = payload.get("eventType", "UNKNOWN")
                    severity = payload.get("severity", "INFO")
                    msg = str(payload.get("message", ""))[:65]
                    logger.info(
                        f"Forwarded {event_type} [{severity}] -> {msg} (Total sent: {self.total_forwarded})"
                    )
                else:
                    # Cursor persistence failed (e.g. disk full, permission denied).
                    # Retain event at head of buffer so in-memory state does not advance past unpersisted cursor.
                    # Note: Subsequent retry will resend the event, which may produce duplicate records
                    # in backend storage because SIEM delivery guarantees are at-least-once.
                    logger.critical(
                        f"Failed to persist cursor state for delivered event. "
                        f"Retaining event at head of buffer to maintain cursor consistency. "
                        f"Will retry (at-least-once delivery may produce duplicate backend log records)."
                    )
                    return DeliveryStatus.TRANSIENT_FAILURE

            elif result.status == DeliveryStatus.PERMANENT_ERROR:
                # Poison pill (HTTP 400/422): Check if already quarantined in a previous attempt
                if cursor not in self._quarantined_cursors:
                    quarantined = self.dead_letter_mgr.quarantine(payload, result.message, result.status_code)
                    if not quarantined:
                        logger.critical(
                            f"Failed to persist dead-letter quarantine for rejected event (HTTP {result.status_code}). "
                            f"Retaining event in buffer without advancing cursor. Will retry."
                        )
                        return DeliveryStatus.TRANSIENT_FAILURE
                    self._quarantined_cursors.add(cursor)

                # Quarantine is durable; advance cursor past the poison pill before popping
                if self.cursor_mgr.save_cursor(cursor, self.total_forwarded):
                    self.buffer.pop(0)
                    self._quarantined_cursors.discard(cursor)
                    logger.warning(
                        f"Poison event quarantined to dead-letter (HTTP {result.status_code}). "
                        f"Cursor advanced past invalid event to continue pipeline."
                    )
                else:
                    logger.critical(
                        f"Failed to persist cursor state after dead-letter quarantine. "
                        f"Retaining event at head of buffer to prevent advancing beyond unpersisted cursor."
                    )
                    return DeliveryStatus.TRANSIENT_FAILURE

            elif result.status == DeliveryStatus.AUTH_FORBIDDEN:
                # 403 Forbidden: Account lacks SECURITY_ANALYST/ADMIN role
                logger.error(
                    f"Access Forbidden (HTTP 403): Collector account '{self.config.username}' "
                    f"lacks required ingestion role. Delivery paused. {result.message}"
                )
                return DeliveryStatus.AUTH_FORBIDDEN

            else:
                # Transient failure (network drop, 429, 5xx): retain event and pause
                return DeliveryStatus.TRANSIENT_FAILURE

        return DeliveryStatus.SUCCESS

    def run(self) -> None:
        """Main streaming and backpressure loop."""
        if subprocess.run(["which", "journalctl"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
            logger.critical("systemd 'journalctl' binary not found. This collector requires an active systemd journal (e.g. Arch Linux).")
            sys.exit(1)

        if not self.client.authenticate():
            logger.warning("Initial authentication failed. Events will buffer locally until backend is accessible.")

        retry_delay = self.config.initial_retry_delay

        while self.running:
            cursor = self.cursor_mgr.get_cursor()
            proc = None
            try:
                proc = self.start_journalctl_process(cursor)

                for line in proc.stdout:
                    if not self.running:
                        break

                    # Backpressure: If buffer is full, pause reading from journal until buffer drains
                    while len(self.buffer) >= self.config.max_buffer_size and self.running:
                        logger.warning(
                            f"Buffer capacity reached ({len(self.buffer)}/{self.config.max_buffer_size}). "
                            f"Applying backpressure and pausing journal consumption..."
                        )
                        status = self.flush_buffer()
                        if status == DeliveryStatus.SUCCESS:
                            break
                        time.sleep(retry_delay)
                        retry_delay = min(retry_delay * 2.0, self.config.max_retry_delay)

                    line = line.strip()
                    if not line:
                        continue

                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        logger.debug("Skipping malformed non-JSON journal line")
                        continue

                    entry_cursor = entry.get("__CURSOR", "")
                    normalized = normalize_journal_entry(
                        entry,
                        source_system_override=self.config.source_system,
                        host_ip_fallback=self.config.host_ip
                    )

                    if normalized:
                        self.buffer.append((entry_cursor, normalized))

                        # Attempt to flush buffer
                        status = self.flush_buffer()
                        if status == DeliveryStatus.SUCCESS:
                            retry_delay = self.config.initial_retry_delay
                        elif status == DeliveryStatus.AUTH_FORBIDDEN:
                            logger.error("Pausing collector delivery due to HTTP 403 Forbidden. Retrying in 10s...")
                            time.sleep(10.0)
                        else:
                            logger.warning(
                                f"Buffering event locally ({len(self.buffer)}/{self.config.max_buffer_size} in queue). "
                                f"Retrying in {retry_delay:.1f}s..."
                            )
                            time.sleep(retry_delay)
                            retry_delay = min(retry_delay * 2.0, self.config.max_retry_delay)

            except Exception as e:
                logger.error(f"Error in journal stream: {e}")
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2.0, self.config.max_retry_delay)
            finally:
                if proc:
                    try:
                        proc.terminate()
                        proc.wait(timeout=2.0)
                    except Exception:
                        proc.kill()

        logger.info("Flushing remaining buffer before shutdown...")
        self.flush_buffer()
        logger.info(f"ThreatLens Collector terminated cleanly. Total forwarded: {self.total_forwarded}")


def main():
    default_cfg = Path(__file__).parent / "collector.env"
    cfg_path = default_cfg if default_cfg.is_file() else None

    config = CollectorConfig(cfg_path)
    config.validate()

    collector = LinuxJournalCollector(config)

    signal.signal(signal.SIGINT, collector.stop)
    signal.signal(signal.SIGTERM, collector.stop)

    logger.info("=" * 65)
    logger.info("ThreatLens Arch Linux Security Event Collector Initiated")
    logger.info(f"Target Backend:   {config.backend_url}")
    logger.info(f"Source System ID: {config.source_system}")
    logger.info(f"Target Host IP:   {config.host_ip}")
    logger.info(f"State File:       {config.state_file}")
    logger.info(f"Dead Letter File: {config.dead_letter_file}")
    logger.info(f"Max Buffer Size:  {config.max_buffer_size}")
    logger.info(f"Monitored Units:  {', '.join(config.units)}")
    logger.info("=" * 65)

    collector.run()


if __name__ == "__main__":
    main()
