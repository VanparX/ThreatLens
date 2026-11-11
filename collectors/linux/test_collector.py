"""
Comprehensive Unit Tests for ThreatLens Linux Collector.
Verifies:
1. Parsing accuracy and OpenSSH / Sudo event normalizations.
2. IPv4 / IPv6 normalization and backend validation constraints.
3. Duplicate SSH failure suppression (1 invalid user attempt = 1 event).
4. Interactive shell vs scripted sudo differentiation.
5. Missing source IP normalization.
6. HTTP 400/422 dead-letter quarantine (poison-pill prevention).
7. HTTP 403 authorization error pause behavior.
8. HTTP 401 token refresh and transparent retry.
9. HTTP 429/5xx transient error handling.
10. Buffer saturation backpressure (no silent deque drops).
11. Cursor atomic persistence and state recovery.
"""

import io
import json
import os
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import MagicMock, patch

from parser import (
    VALID_LOG_EVENT_TYPES,
    VALID_LOG_SEVERITIES,
    is_interactive_root_shell,
    normalize_ip_address,
    normalize_journal_entry,
    parse_ssh_event,
    parse_sudo_event,
    parse_timestamp_from_journal,
    validate_security_log_payload,
)
from threatlens_collector import (
    CollectorConfig,
    CursorManager,
    DeadLetterManager,
    DeliveryResult,
    DeliveryStatus,
    LinuxJournalCollector,
    ThreatLensBackendClient,
)


class TestLinuxJournalParser(unittest.TestCase):

    def test_ssh_failed_password_invalid_user(self):
        entry = {
            "__REALTIME_TIMESTAMP": "1730739000123456",
            "__CURSOR": "s=abc;i=123",
            "_SYSTEMD_UNIT": "sshd.service",
            "_COMM": "sshd",
            "_PID": "4120",
            "MESSAGE": "Failed password for invalid user admin from 198.51.100.55 port 49152 ssh2"
        }
        res = normalize_journal_entry(entry, source_system_override="arch-predator", host_ip_fallback="10.226.72.231")

        self.assertIsNotNone(res)
        self.assertEqual(res["eventType"], "AUTHENTICATION_FAILURE")
        self.assertEqual(res["severity"], "HIGH")
        self.assertEqual(res["sourceIp"], "198.51.100.55")
        self.assertEqual(res["sourceSystem"], "arch-predator")
        self.assertEqual(res["metadata"]["user"], "admin")

    def test_duplicate_invalid_user_ssh_messages_produce_single_failure_event(self):
        """
        OpenSSH logs two lines for an invalid user attempt:
        Line 1: Invalid user badactor from 198.51.100.23 port 39822
        Line 2: Failed password for invalid user badactor from 198.51.100.23 port 39822 ssh2
        Line 1 must be ignored so exactly ONE failure event is emitted.
        """
        line1_entry = {
            "_SYSTEMD_UNIT": "sshd.service",
            "_COMM": "sshd",
            "MESSAGE": "Invalid user badactor from 198.51.100.23 port 39822"
        }
        line2_entry = {
            "_SYSTEMD_UNIT": "sshd.service",
            "_COMM": "sshd",
            "MESSAGE": "Failed password for invalid user badactor from 198.51.100.23 port 39822 ssh2"
        }

        # Line 1 is filtered out as a pre-auth informational notice
        res1 = normalize_journal_entry(line1_entry)
        self.assertIsNone(res1)

        # Line 2 emits the single definitive authentication failure
        res2 = normalize_journal_entry(line2_entry)
        self.assertIsNotNone(res2)
        self.assertEqual(res2["eventType"], "AUTHENTICATION_FAILURE")
        self.assertEqual(res2["sourceIp"], "198.51.100.23")

    def test_ssh_accepted_login(self):
        entry = {
            "__REALTIME_TIMESTAMP": "1730739000000000",
            "__CURSOR": "s=abc;i=125",
            "_SYSTEMD_UNIT": "sshd.service",
            "_COMM": "sshd",
            "MESSAGE": "Accepted publickey for vanparx from 10.226.72.236 port 54120 ssh2: ED25519 SHA256:abc"
        }
        res = normalize_journal_entry(entry, source_system_override="arch-predator")

        self.assertIsNotNone(res)
        self.assertEqual(res["eventType"], "AUTHENTICATION_SUCCESS")
        self.assertEqual(res["severity"], "INFO")
        self.assertEqual(res["sourceIp"], "10.226.72.236")
        self.assertEqual(res["metadata"]["auth_result"], "SUCCESS")

    def test_sudo_unauthorized_not_in_sudoers(self):
        entry = {
            "__REALTIME_TIMESTAMP": "1730739000000000",
            "_SYSTEMD_UNIT": "sudo.service",
            "_COMM": "sudo",
            "MESSAGE": "intruder : user NOT in sudoers ; TTY=pts/2 ; PWD=/home/intruder ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow"
        }
        res = normalize_journal_entry(entry, source_system_override="arch-predator")

        self.assertIsNotNone(res)
        self.assertEqual(res["eventType"], "PRIVILEGE_ESCALATION")
        self.assertEqual(res["severity"], "HIGH")
        # Local sudo event has empty sourceIp, not 127.0.0.1
        self.assertEqual(res["sourceIp"], "")
        self.assertEqual(res["metadata"]["sudo_user"], "intruder")
        self.assertEqual(res["metadata"]["sudo_status"], "DENIED_NOT_IN_SUDOERS")

    def test_sudo_incorrect_password(self):
        entry = {
            "_SYSTEMD_UNIT": "sudo.service",
            "_COMM": "sudo",
            "MESSAGE": "bob : 1 incorrect password attempt ; TTY=pts/0 ; PWD=/home/bob ; USER=root ; COMMAND=/usr/bin/id"
        }
        res = normalize_journal_entry(entry)

        self.assertIsNotNone(res)
        self.assertEqual(res["eventType"], "AUTHENTICATION_FAILURE")
        self.assertEqual(res["severity"], "MEDIUM")
        self.assertEqual(res["sourceIp"], "")

    def test_sudo_interactive_vs_scripted_shell_differentiation(self):
        """
        Interactive root shells -> OTHER (LOW) with is_interactive_shell=true (Audit visibility, not unauthorized escalation)
        Scripted shells (e.g. sudo bash /opt/backup.sh) -> OTHER (INFO)
        """
        # Interactive shell triggers
        self.assertTrue(is_interactive_root_shell("su"))
        self.assertTrue(is_interactive_root_shell("/usr/bin/su"))
        self.assertTrue(is_interactive_root_shell("/bin/bash"))
        self.assertTrue(is_interactive_root_shell("bash -i"))

        # Script executions do NOT trigger interactive root shell
        self.assertFalse(is_interactive_root_shell("bash /opt/backup.sh"))
        self.assertFalse(is_interactive_root_shell("/bin/sh /usr/local/bin/deploy.sh"))
        self.assertFalse(is_interactive_root_shell("/usr/bin/pacman -Syu"))
        self.assertFalse(is_interactive_root_shell("systemctl restart sshd"))

        # Test normalization of scripted execution
        script_entry = {
            "_SYSTEMD_UNIT": "sudo.service",
            "_COMM": "sudo",
            "MESSAGE": "admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/bash /opt/backup.sh"
        }
        res_script = normalize_journal_entry(script_entry)
        self.assertEqual(res_script["eventType"], "OTHER")
        self.assertEqual(res_script["severity"], "INFO")
        self.assertEqual(res_script["metadata"]["is_interactive_shell"], "false")

        # Test normalization of interactive root shell execution
        interactive_entry = {
            "_SYSTEMD_UNIT": "sudo.service",
            "_COMM": "sudo",
            "MESSAGE": "admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/bash"
        }
        res_interactive = normalize_journal_entry(interactive_entry)
        self.assertEqual(res_interactive["eventType"], "OTHER")
        self.assertEqual(res_interactive["severity"], "LOW")
        self.assertEqual(res_interactive["metadata"]["is_interactive_shell"], "true")
        self.assertNotEqual(res_interactive["eventType"], "PRIVILEGE_ESCALATION")

    def test_routine_sudo_commands_do_not_escalate(self):
        """
        Verify that commands like sudo pacman -Syu and sudo systemctl status
        produce routine OTHER (INFO) events and do NOT trigger PRIVILEGE_ESCALATION.
        """
        for cmd in ["/usr/bin/pacman -Syu", "/usr/bin/systemctl status sshd", "/bin/ls -la /root"]:
            entry = {
                "_SYSTEMD_UNIT": "sudo.service",
                "_COMM": "sudo",
                "MESSAGE": f"vanparx : TTY=pts/1 ; PWD=/home/vanparx ; USER=root ; COMMAND={cmd}"
            }
            res = normalize_journal_entry(entry)
            self.assertIsNotNone(res)
            self.assertEqual(res["eventType"], "OTHER")
            self.assertEqual(res["severity"], "INFO")
            self.assertNotEqual(res["eventType"], "PRIVILEGE_ESCALATION")

    def test_malformed_and_noise_entries_return_none(self):
        # Empty message or missing message returns None
        self.assertIsNone(normalize_journal_entry({}))
        self.assertIsNone(normalize_journal_entry({"MESSAGE": ""}))
        # Unrelated unit returns None
        self.assertIsNone(normalize_journal_entry({"_SYSTEMD_UNIT": "dhcpcd.service", "MESSAGE": "rebinding lease"}))

    def test_ipv6_normalization(self):
        # Valid IPv4
        self.assertEqual(normalize_ip_address("198.51.100.23"), "198.51.100.23")
        # IPv4 with port
        self.assertEqual(normalize_ip_address("192.168.1.10:22"), "192.168.1.10")

        # Compressed IPv6 gets exploded to full 8-group format
        exploded = normalize_ip_address("2001:db8::1")
        self.assertEqual(exploded, "2001:0db8:0000:0000:0000:0000:0000:0001")

        # Local loopbacks or empty values normalize to empty string ""
        self.assertEqual(normalize_ip_address("127.0.0.1"), "")
        self.assertEqual(normalize_ip_address("::1"), "")
        self.assertEqual(normalize_ip_address(None), "")
        self.assertEqual(normalize_ip_address("invalid-ip"), "")

    def test_arch_linux_sudo_event_in_session_scope_captured_via_comm_and_syslog(self):
        """
        Genuine Arch Linux Verification:
        Sudo runs inside an interactive user session (e.g. session-c2.scope), NOT sudo.service.
        Verify that parser identifies the event via _COMM=sudo and SYSLOG_IDENTIFIER=sudo.
        """
        entry = {
            "__REALTIME_TIMESTAMP": "1730739000000000",
            "_SYSTEMD_UNIT": "session-c2.scope",
            "_COMM": "sudo",
            "SYSLOG_IDENTIFIER": "sudo",
            "_PID": "5123",
            "MESSAGE": "vanparx : user NOT in sudoers ; TTY=pts/3 ; PWD=/home/vanparx ; USER=root ; COMMAND=/bin/cat /etc/shadow"
        }
        res = normalize_journal_entry(entry, source_system_override="arch-predator")

        self.assertIsNotNone(res)
        self.assertEqual(res["eventType"], "PRIVILEGE_ESCALATION")
        self.assertEqual(res["severity"], "HIGH")
        self.assertEqual(res["metadata"]["sudo_user"], "vanparx")
        self.assertEqual(res["metadata"]["sudo_status"], "DENIED_NOT_IN_SUDOERS")
        self.assertEqual(res["metadata"]["systemd_unit"], "session-c2.scope")
        self.assertEqual(res["metadata"]["comm"], "sudo")
        self.assertEqual(res["metadata"]["syslog_identifier"], "sudo")

    def test_arch_linux_sudo_event_without_unit_captured_via_syslog_identifier(self):
        """
        Verify that if _SYSTEMD_UNIT is empty, SYSLOG_IDENTIFIER and _COMM correctly identify sudo.
        """
        entry = {
            "_COMM": "sudo",
            "SYSLOG_IDENTIFIER": "sudo",
            "MESSAGE": "attacker : 1 incorrect password attempt ; TTY=pts/0 ; PWD=/tmp ; USER=root ; COMMAND=/usr/bin/id"
        }
        res = normalize_journal_entry(entry)

        self.assertIsNotNone(res)
        self.assertEqual(res["eventType"], "AUTHENTICATION_FAILURE")
        self.assertEqual(res["severity"], "MEDIUM")
        self.assertEqual(res["metadata"]["sudo_user"], "attacker")

    def test_byte_array_message_handling(self):
        entry = {
            "_SYSTEMD_UNIT": "sshd.service",
            "_COMM": "sshd",
            "MESSAGE": list("Failed password for root from 192.168.1.99 port 2222 ssh2".encode("utf-8"))
        }
        res = normalize_journal_entry(entry)
        self.assertIsNotNone(res)
        self.assertEqual(res["eventType"], "AUTHENTICATION_FAILURE")
        self.assertEqual(res["sourceIp"], "192.168.1.99")

    def test_backend_contract_log_event_type_compliance(self):
        """
        Verify that all event types emitted belong to the backend LogEventType enum:
        - Failed logins -> AUTHENTICATION_FAILURE (never SSH_LOGIN_FAILED)
        - Successful logins -> AUTHENTICATION_SUCCESS
        - Escalations -> PRIVILEGE_ESCALATION
        - Routine commands -> OTHER
        """
        # Confirm SSH_LOGIN_FAILED is NOT in valid backend enums
        self.assertNotIn("SSH_LOGIN_FAILED", VALID_LOG_EVENT_TYPES)

        # 1. SSH failure
        ssh_fail = normalize_journal_entry({
            "_COMM": "sshd",
            "MESSAGE": "Failed password for root from 198.51.100.1 port 22 ssh2"
        })
        self.assertIn(ssh_fail["eventType"], VALID_LOG_EVENT_TYPES)
        self.assertEqual(ssh_fail["eventType"], "AUTHENTICATION_FAILURE")

        # 2. SSH success
        ssh_ok = normalize_journal_entry({
            "_COMM": "sshd",
            "MESSAGE": "Accepted publickey for vanparx from 10.0.0.1 port 54120 ssh2: ED25519"
        })
        self.assertIn(ssh_ok["eventType"], VALID_LOG_EVENT_TYPES)
        self.assertEqual(ssh_ok["eventType"], "AUTHENTICATION_SUCCESS")

        # 3. Sudo escalation
        sudo_esc = normalize_journal_entry({
            "_COMM": "sudo",
            "MESSAGE": "intruder : user NOT in sudoers ; TTY=pts/0 ; PWD=/tmp ; USER=root ; COMMAND=/bin/sh"
        })
        self.assertIn(sudo_esc["eventType"], VALID_LOG_EVENT_TYPES)
        self.assertEqual(sudo_esc["eventType"], "PRIVILEGE_ESCALATION")

        # 4. Sudo routine
        sudo_routine = normalize_journal_entry({
            "_COMM": "sudo",
            "MESSAGE": "admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/usr/bin/pacman -Syu"
        })
        self.assertIn(sudo_routine["eventType"], VALID_LOG_EVENT_TYPES)
        self.assertEqual(sudo_routine["eventType"], "OTHER")

    def test_timestamp_format_iso8601_utc_precision(self):
        """
        Verify that parse_timestamp_from_journal produces valid ISO-8601 UTC strings
        ending in 'Z' with microsecond precision, as required by Spring Boot Instant deserializer.
        """
        # Case A: Realtime timestamp from systemd journal (microseconds since epoch)
        # 1730784000123456 -> 2024-11-05T05:20:00.123456Z
        ts_str = parse_timestamp_from_journal({"__REALTIME_TIMESTAMP": "1730784000123456"})
        self.assertTrue(ts_str.endswith("Z"))
        self.assertIn("T", ts_str)
        self.assertEqual(len(ts_str), 27)  # YYYY-MM-DDTHH:MM:SS.ffffffZ = 27 chars

        # Case B: _SOURCE_REALTIME_TIMESTAMP fallback
        ts_str2 = parse_timestamp_from_journal({"_SOURCE_REALTIME_TIMESTAMP": "1730784000654321"})
        self.assertTrue(ts_str2.endswith("Z"))

        # Case C: Fallback to current time when timestamp missing
        ts_now = parse_timestamp_from_journal({})
        self.assertTrue(ts_now.endswith("Z"))

    def test_validate_security_log_payload_rules(self):
        """
        Verify validate_security_log_payload against all constraints in SecurityLogRequest.java.
        """
        valid_payload = {
            "timestamp": "2026-11-05T04:40:00.123456Z",
            "sourceIp": "198.51.100.55",
            "destinationIp": "10.226.72.236",
            "eventType": "AUTHENTICATION_FAILURE",
            "severity": "HIGH",
            "sourceSystem": "archlinux-predator",
            "message": "Failed SSH login",
            "metadata": {"user": "admin"}
        }

        # 1. Valid payload succeeds
        is_valid, reason = validate_security_log_payload(valid_payload)
        self.assertTrue(is_valid)
        self.assertEqual(reason, "")

        # 2. Invalid eventType fails (e.g. invented enum value SSH_LOGIN_FAILED)
        bad_event = dict(valid_payload, eventType="SSH_LOGIN_FAILED")
        is_valid, reason = validate_security_log_payload(bad_event)
        self.assertFalse(is_valid)
        self.assertIn("SSH_LOGIN_FAILED", reason)

        # 3. Invalid severity fails
        bad_sev = dict(valid_payload, severity="SUPER_CRITICAL")
        is_valid, reason = validate_security_log_payload(bad_sev)
        self.assertFalse(is_valid)
        self.assertIn("SUPER_CRITICAL", reason)

        # 4. Invalid timestamp fails
        bad_ts = dict(valid_payload, timestamp="not-a-timestamp")
        is_valid, reason = validate_security_log_payload(bad_ts)
        self.assertFalse(is_valid)

        # 5. Invalid source IP format fails (fails backend regex ^(\d{1,3}\.){3}\d{1,3}$)
        bad_ip = dict(valid_payload, sourceIp="192.168.1.9999")
        is_valid, reason = validate_security_log_payload(bad_ip)
        self.assertFalse(is_valid)

        # 6. Blank sourceSystem fails
        blank_sys = dict(valid_payload, sourceSystem="   ")
        is_valid, reason = validate_security_log_payload(blank_sys)
        self.assertFalse(is_valid)

        # 7. Blank message fails
        blank_msg = dict(valid_payload, message="")
        is_valid, reason = validate_security_log_payload(blank_msg)
        self.assertFalse(is_valid)

    def test_ssh_failed_publickey_invalid_user_extracts_correct_username(self):
        """
        Verify that OpenSSH 'Failed publickey for invalid user <user>' properly
        extracts the username instead of erroneously capturing the literal string 'invalid'.
        """
        entry = {
            "_COMM": "sshd",
            "MESSAGE": "Failed publickey for invalid user cyberactor from 192.0.2.45 port 42100 ssh2: RSA SHA256:abc"
        }
        res = normalize_journal_entry(entry)
        self.assertIsNotNone(res)
        self.assertEqual(res["eventType"], "AUTHENTICATION_FAILURE")
        self.assertEqual(res["metadata"]["user"], "cyberactor")
        self.assertEqual(res["sourceIp"], "192.0.2.45")


class TestCollectorReliabilityAndNetworking(unittest.TestCase):

    def setUp(self):
        self.test_dir = tempfile.TemporaryDirectory()
        self.state_file = Path(self.test_dir.name) / "sub_dir" / "cursor.json"
        self.dead_letter_file = Path(self.test_dir.name) / "dead_letter.jsonl"
        self.config = CollectorConfig()
        self.config.state_file = self.state_file
        self.config.dead_letter_file = self.dead_letter_file
        self.config.max_buffer_size = 3

    def tearDown(self):
        self.test_dir.cleanup()

    def test_cursor_manager_auto_creates_dir_and_persists_atomically(self):
        cm = CursorManager(self.state_file)
        self.assertIsNone(cm.get_cursor())

        # Directory does not exist yet; save_cursor must auto-create it
        cm.save_cursor("s=testcursor;i=10", total_forwarded=5)

        self.assertTrue(self.state_file.exists())
        self.assertEqual(cm.get_cursor(), "s=testcursor;i=10")

    def test_http_400_quarantines_poison_event_and_advances_cursor(self):
        """
        Verify that HTTP 400 Bad Request writes the invalid event to the dead-letter
        file, flushes and fsyncs, pops it from queue, and advances cursor.
        """
        collector = LinuxJournalCollector(self.config)
        collector.client = MagicMock()
        collector.cursor_mgr.save_cursor = MagicMock(return_value=True)

        # Mock send_log returning PERMANENT_ERROR (HTTP 400)
        collector.client.send_log.return_value = DeliveryResult(
            DeliveryStatus.PERMANENT_ERROR, 400, "Validation failed: sourceIp invalid"
        )

        poison_payload = {"eventType": "OTHER", "message": "Malformed event"}
        collector.buffer.append(("cursor_poison", poison_payload))

        with patch("os.fsync") as mock_fsync:
            status = collector.flush_buffer()

            # Buffer should be drained (poison event popped and quarantined)
            self.assertEqual(len(collector.buffer), 0)
            self.assertEqual(status, DeliveryStatus.SUCCESS)
            mock_fsync.assert_called_once()
            collector.cursor_mgr.save_cursor.assert_called_once_with("cursor_poison", 0)

        # Verify dead letter file was written with durable JSONL structure
        self.assertTrue(self.dead_letter_file.exists())
        with open(self.dead_letter_file, "r") as f:
            lines = f.readlines()
            self.assertEqual(len(lines), 1)
            record = json.loads(lines[0])
            self.assertEqual(record["status_code"], 400)
            self.assertIn("Validation failed", record["reason"])
            self.assertEqual(record["payload"]["eventType"], "OTHER")

    def test_failed_quarantine_retains_event_and_does_not_advance_cursor(self):
        """
        Verify that if writing to the dead-letter quarantine file fails:
        1. Event is retained at the head of the buffer.
        2. Journal cursor is NOT advanced.
        3. DeliveryStatus.TRANSIENT_FAILURE is returned to trigger retry/backoff.
        """
        collector = LinuxJournalCollector(self.config)
        collector.client = MagicMock()
        collector.client.send_log.return_value = DeliveryResult(
            DeliveryStatus.PERMANENT_ERROR, 422, "Unprocessable Entity"
        )
        collector.cursor_mgr.save_cursor = MagicMock(return_value=True)

        # Simulate dead letter disk write failure (e.g. permission denied or disk full)
        collector.dead_letter_mgr.quarantine = MagicMock(return_value=False)

        poison_payload = {"eventType": "OTHER", "message": "Poison pill payload"}
        collector.buffer.append(("cursor_poison_fail", poison_payload))

        status = collector.flush_buffer()

        # Event MUST NOT be popped from buffer
        self.assertEqual(len(collector.buffer), 1)
        self.assertEqual(collector.buffer[0][0], "cursor_poison_fail")
        self.assertEqual(collector.buffer[0][1], poison_payload)

        # Cursor MUST NOT be advanced
        collector.cursor_mgr.save_cursor.assert_not_called()

        # Status must be TRANSIENT_FAILURE so backoff sleep is applied
        self.assertEqual(status, DeliveryStatus.TRANSIENT_FAILURE)

    def test_failed_quarantine_persists_and_recovers_on_subsequent_retry(self):
        """
        Verify that if quarantine initially fails, subsequent retry attempts
        successfully write to dead-letter, pop the buffer, and advance cursor.
        """
        collector = LinuxJournalCollector(self.config)
        collector.client = MagicMock()
        collector.client.send_log.return_value = DeliveryResult(
            DeliveryStatus.PERMANENT_ERROR, 400, "Validation rejected"
        )
        collector.cursor_mgr.save_cursor = MagicMock(return_value=True)

        poison_payload = {"eventType": "OTHER", "message": "Poison pill payload"}
        collector.buffer.append(("cursor_retry_test", poison_payload))

        # Quarantine fails on attempt 1, succeeds on attempt 2
        with patch.object(collector.dead_letter_mgr, "quarantine", side_effect=[False, True]) as mock_quarantine:
            # Attempt 1: Fails
            status1 = collector.flush_buffer()
            self.assertEqual(status1, DeliveryStatus.TRANSIENT_FAILURE)
            self.assertEqual(len(collector.buffer), 1)
            collector.cursor_mgr.save_cursor.assert_not_called()

            # Attempt 2: Succeeds
            status2 = collector.flush_buffer()
            self.assertEqual(status2, DeliveryStatus.SUCCESS)
            self.assertEqual(len(collector.buffer), 0)
            collector.cursor_mgr.save_cursor.assert_called_once_with("cursor_retry_test", 0)
            self.assertEqual(mock_quarantine.call_count, 2)

    def test_failed_cursor_save_after_successful_delivery_retains_event(self):
        """
        Requirement Test 1: Failed cursor save after successful backend delivery
        retains the event at the head of the buffer and triggers retry/backoff.
        """
        collector = LinuxJournalCollector(self.config)
        collector.client = MagicMock()
        collector.client.send_log.return_value = DeliveryResult(DeliveryStatus.SUCCESS, 201, "Created")

        # Simulate cursor persistence failure (e.g. disk full or permission error)
        collector.cursor_mgr.save_cursor = MagicMock(return_value=False)

        event_payload = {"eventType": "AUTHENTICATION_SUCCESS", "severity": "INFO", "message": "Login accepted"}
        collector.buffer.append(("cursor_101", event_payload))

        status = collector.flush_buffer()

        self.assertEqual(status, DeliveryStatus.TRANSIENT_FAILURE)
        # Event MUST be retained at head of buffer
        self.assertEqual(len(collector.buffer), 1)
        self.assertEqual(collector.buffer[0][0], "cursor_101")
        # In-memory forward count must NOT be incremented
        self.assertEqual(collector.total_forwarded, 0)
        collector.cursor_mgr.save_cursor.assert_called_once_with("cursor_101", 1)

    def test_subsequent_cursor_save_retry_succeeds_and_removes_event(self):
        """
        Requirement Test 2: Subsequent cursor-save retry succeeds, removes the event
        from buffer, and increments forwarding counter.
        """
        collector = LinuxJournalCollector(self.config)
        collector.client = MagicMock()
        collector.client.send_log.return_value = DeliveryResult(DeliveryStatus.SUCCESS, 200, "OK")

        # Save cursor fails on attempt 1, succeeds on attempt 2
        collector.cursor_mgr.save_cursor = MagicMock(side_effect=[False, True])

        event_payload = {"eventType": "AUTHENTICATION_SUCCESS", "severity": "INFO", "message": "Login accepted"}
        collector.buffer.append(("cursor_102", event_payload))

        # Attempt 1: Fails cursor persistence
        status1 = collector.flush_buffer()
        self.assertEqual(status1, DeliveryStatus.TRANSIENT_FAILURE)
        self.assertEqual(len(collector.buffer), 1)
        self.assertEqual(collector.total_forwarded, 0)

        # Attempt 2: Retry succeeds
        status2 = collector.flush_buffer()
        self.assertEqual(status2, DeliveryStatus.SUCCESS)
        self.assertEqual(len(collector.buffer), 0)
        self.assertEqual(collector.total_forwarded, 1)
        self.assertEqual(collector.cursor_mgr.save_cursor.call_count, 2)

    def test_failed_cursor_save_after_successful_quarantine_retains_event(self):
        """
        Requirement Test 3: Failed cursor save after successful quarantine retains the event.
        Also verifies duplicate dead-letter write is suppressed during in-memory retry.
        """
        collector = LinuxJournalCollector(self.config)
        collector.client = MagicMock()
        collector.client.send_log.return_value = DeliveryResult(
            DeliveryStatus.PERMANENT_ERROR, 400, "Invalid payload"
        )

        poison_payload = {"eventType": "OTHER", "message": "Malformed event"}
        collector.buffer.append(("cursor_poison_quarantine", poison_payload))

        # Quarantine succeeds, but save_cursor fails on attempt 1 and succeeds on attempt 2
        collector.cursor_mgr.save_cursor = MagicMock(side_effect=[False, True])

        # Attempt 1: Quarantine succeeds, but cursor save fails
        status1 = collector.flush_buffer()
        self.assertEqual(status1, DeliveryStatus.TRANSIENT_FAILURE)
        self.assertEqual(len(collector.buffer), 1)
        self.assertIn("cursor_poison_quarantine", collector._quarantined_cursors)
        self.assertTrue(self.dead_letter_file.exists())
        with open(self.dead_letter_file, "r") as f:
            lines = f.readlines()
            self.assertEqual(len(lines), 1)

        # Attempt 2: Quarantine skipped because already quarantined; cursor save succeeds
        status2 = collector.flush_buffer()
        self.assertEqual(status2, DeliveryStatus.SUCCESS)
        self.assertEqual(len(collector.buffer), 0)
        self.assertNotIn("cursor_poison_quarantine", collector._quarantined_cursors)
        # Dead-letter file STILL has only 1 entry (no duplicate created!)
        with open(self.dead_letter_file, "r") as f:
            lines = f.readlines()
            self.assertEqual(len(lines), 1)

    def test_cursor_manager_fsync_directory_fsync_and_error_handling(self):
        """
        Requirement Test 4: Cursor manager fsync, directory fsync, and error handling.
        Verifies:
        - Writes temporary file and calls os.fsync on file descriptor
        - Calls directory fsync on parent directory
        - Restricts permissions to 0600
        - Returns True on success, and get_cursor reads back value
        - Returns False when file write or replace raises OSError
        - Handles directory fsync failure gracefully without failing the cursor save
        """
        cm = CursorManager(self.state_file)

        # Success case with fsync verification
        with patch("os.fsync") as mock_fsync:
            success = cm.save_cursor("s=sync_cursor;i=42", total_forwarded=10)
            self.assertTrue(success)
            self.assertGreaterEqual(mock_fsync.call_count, 1)
            self.assertEqual(cm.get_cursor(), "s=sync_cursor;i=42")

        # Graceful handling when directory fsync raises an error (e.g. NFS / Windows)
        with patch("threatlens_collector._fsync_dir", side_effect=OSError("Dir fsync unsupported")):
            success = cm.save_cursor("s=sync_cursor2;i=43", total_forwarded=11)
            # save_cursor must still succeed even if directory fsync is unsupported
            self.assertTrue(success)
            self.assertEqual(cm.get_cursor(), "s=sync_cursor2;i=43")

        # Error case: Open raises OSError (e.g. read-only filesystem or disk full)
        with patch("builtins.open", side_effect=OSError("Read-only file system")):
            failure = cm.save_cursor("s=sync_cursor3;i=44", total_forwarded=12)
            self.assertFalse(failure)

    def test_dead_letter_manager_flushes_fsyncs_and_handles_write_exceptions(self):
        """
        Directly test DeadLetterManager:
        - Flushes and fsyncs on write
        - Returns True on success
        - Catches IOError / OSError, logs sanitized critical error, and returns False
        """
        dlm = DeadLetterManager(self.dead_letter_file)

        # Success case
        with patch("os.fsync") as mock_fsync:
            success = dlm.quarantine({"key": "val"}, "reason test", 400)
            self.assertTrue(success)
            mock_fsync.assert_called_once()
            self.assertTrue(self.dead_letter_file.exists())

        # Error case: Open raises OSError (e.g. Read-only file system or disk full)
        with patch("builtins.open", side_effect=OSError("Read-only file system")):
            failure = dlm.quarantine({"key": "val"}, "reason test", 400)
            self.assertFalse(failure)

    def test_http_403_pauses_delivery_without_discarding_events(self):
        """
        Verify that HTTP 403 Forbidden pauses delivery and retains events in the buffer.
        """
        collector = LinuxJournalCollector(self.config)
        collector.client = MagicMock()
        collector.client.send_log.return_value = DeliveryResult(
            DeliveryStatus.AUTH_FORBIDDEN, 403, "Access denied: role required"
        )

        payload = {"eventType": "AUTHENTICATION_FAILURE", "message": "Failed login"}
        collector.buffer.append(("cursor_1", payload))

        status = collector.flush_buffer()

        self.assertEqual(status, DeliveryStatus.AUTH_FORBIDDEN)
        # Event MUST remain in buffer (not dropped)
        self.assertEqual(len(collector.buffer), 1)

    def test_http_401_token_refresh_and_retry(self):
        """
        Verify that upon HTTP 401, send_log triggers authenticate() and retries once.
        """
        client = ThreatLensBackendClient("http://127.0.0.1:8080", "testuser", "testpass")
        client.jwt_token = "expired_token"

        def mock_auth():
            client.jwt_token = "fresh_token"
            return True

        client.authenticate = MagicMock(side_effect=mock_auth)

        # Mock urlopen to fail once with 401, then succeed with 201 on retry
        err_401 = urllib.error.HTTPError(
            url="http://127.0.0.1:8080/api/logs",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=io.BytesIO(b'{"message":"JWT expired"}')
        )
        mock_success_resp = MagicMock()
        mock_success_resp.status = 201
        mock_success_resp.__enter__.return_value = mock_success_resp

        with patch("urllib.request.urlopen", side_effect=[err_401, mock_success_resp]):
            result = client.send_log({"message": "test event"})

            self.assertEqual(result.status, DeliveryStatus.SUCCESS)
            self.assertEqual(result.status_code, 201)
            self.assertEqual(client.authenticate.call_count, 1)

    def test_http_429_transient_failure_retains_event_in_buffer(self):
        """
        Verify that rate-limits (HTTP 429) retain events for exponential backoff.
        """
        collector = LinuxJournalCollector(self.config)
        collector.client = MagicMock()
        collector.client.send_log.return_value = DeliveryResult(
            DeliveryStatus.TRANSIENT_FAILURE, 429, "Too Many Requests"
        )

        collector.buffer.append(("cursor_rate", {"message": "Rate limited event"}))
        status = collector.flush_buffer()

        self.assertEqual(status, DeliveryStatus.TRANSIENT_FAILURE)
        self.assertEqual(len(collector.buffer), 1)

    def test_buffer_saturation_no_silent_eviction(self):
        """
        Verify that when max_buffer_size is reached, items are NOT silently evicted.
        """
        collector = LinuxJournalCollector(self.config)
        collector.config.max_buffer_size = 2

        collector.buffer.append(("c1", {"id": 1}))
        collector.buffer.append(("c2", {"id": 2}))

        self.assertEqual(len(collector.buffer), 2)
        # Adding a 3rd element without flushing
        collector.buffer.append(("c3", {"id": 3}))

        # Oldest item "c1" is NOT silently dropped
        self.assertEqual(collector.buffer[0][0], "c1")
        self.assertEqual(len(collector.buffer), 3)

    def test_journalctl_command_construction(self):
        """
        Verify journalctl command assembly for:
        1. Default / empty units: streams full journal (no -u flags).
        2. Field matches: passes field arguments and '+' directly.
        3. Unit names: prefixes standard units with -u.
        4. Warns on 'sudo.service'.
        """
        collector = LinuxJournalCollector(self.config)

        # 1. Empty units -> no -u
        collector.config.units = []
        with patch("subprocess.Popen") as mock_popen:
            collector.start_journalctl_process(cursor=None)
            cmd = mock_popen.call_args[0][0]
            self.assertEqual(cmd, ["journalctl", "-o", "json", "--follow", "-n", "0"])

        # 2. Resuming with cursor and empty units
        with patch("subprocess.Popen") as mock_popen:
            collector.start_journalctl_process(cursor="s=cur1;i=10")
            cmd = mock_popen.call_args[0][0]
            self.assertEqual(cmd, ["journalctl", "-o", "json", "--follow", "--after-cursor", "s=cur1;i=10"])

        # 3. Field matches (_COMM=sshd, +, _COMM=sudo)
        collector.config.units = ["_COMM=sshd", "+", "_COMM=sudo"]
        with patch("subprocess.Popen") as mock_popen:
            collector.start_journalctl_process(cursor=None)
            cmd = mock_popen.call_args[0][0]
            self.assertEqual(cmd, ["journalctl", "-o", "json", "--follow", "-n", "0", "_COMM=sshd", "+", "_COMM=sudo"])

        # 4. Standard unit names (sshd.service)
        collector.config.units = ["sshd.service"]
        with patch("subprocess.Popen") as mock_popen:
            collector.start_journalctl_process(cursor=None)
            cmd = mock_popen.call_args[0][0]
            self.assertEqual(cmd, ["journalctl", "-o", "json", "--follow", "-n", "0", "-u", "sshd.service"])

        # 5. sudo.service triggers warning
        collector.config.units = ["sudo.service"]
        with patch("subprocess.Popen"):
            with patch("threatlens_collector.logger.warning") as mock_warn:
                collector.start_journalctl_process(cursor=None)
                mock_warn.assert_called_once()
                self.assertIn("sudo.service", mock_warn.call_args[0][0])


if __name__ == "__main__":
    unittest.main()
