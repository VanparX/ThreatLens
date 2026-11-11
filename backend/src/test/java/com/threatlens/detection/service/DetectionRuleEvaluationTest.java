package com.threatlens.detection.service;

import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.model.SecurityLog;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.model.RuleCondition;
import com.threatlens.rule.model.RuleType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DetectionRuleEvaluationTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @InjectMocks
    private RuleMatcher ruleMatcher;

    private DetectionRule sshBruteForceRule;
    private DetectionRule unauthorizedEscalationRule;

    @BeforeEach
    void setUp() {
        // Seeded SOC Rule: SSH Brute Force Detection (per-IP grouping)
        sshBruteForceRule = DetectionRule.builder()
                .id("rule-ssh-brute-force")
                .name("SSH Brute Force Detection")
                .description("Triggers when 3 or more authentication failures occur from the same source IP within 60 seconds")
                .type(RuleType.THRESHOLD)
                .severity(LogSeverity.HIGH)
                .enabled(true)
                .condition(RuleCondition.builder()
                        .thresholdCount(3)
                        .thresholdWindowSeconds(60)
                        .groupBySourceIp(true)
                        .eventTypes(List.of(LogEventType.BRUTE_FORCE, LogEventType.AUTHENTICATION_FAILURE))
                        .build())
                .build();

        // Seeded SOC Rule: Unauthorized Privilege Escalation
        unauthorizedEscalationRule = DetectionRule.builder()
                .id("rule-unauthorized-escalation")
                .name("Unauthorized Privilege Escalation")
                .description("Detects unauthorized sudo elevation or credential impersonation by non-privileged accounts")
                .type(RuleType.EVENT_TYPE_MATCH)
                .severity(LogSeverity.HIGH)
                .enabled(true)
                .condition(RuleCondition.builder()
                        .eventTypes(List.of(LogEventType.PRIVILEGE_ESCALATION))
                        .build())
                .build();
    }

    @Test
    @DisplayName("1. Same-IP SSH failures trigger the threshold under per-IP grouping")
    void sameIpSshFailuresTriggerThreshold() {
        Instant now = Instant.now();
        SecurityLog log = SecurityLog.builder()
                .id("log-003")
                .sourceIp("198.51.100.55")
                .eventType(LogEventType.AUTHENTICATION_FAILURE)
                .severity(LogSeverity.MEDIUM)
                .timestamp(now)
                .message("SSH authentication failed for user 'admin' from 198.51.100.55:42100")
                .build();

        // Mock MongoDB returning 3 events in window for 198.51.100.55
        when(mongoTemplate.count(any(Query.class), eq("security_logs"))).thenReturn(3L);

        Optional<RuleMatcher.MatchResult> result = ruleMatcher.evaluate(log, sshBruteForceRule);

        assertThat(result).isPresent();
        assertThat(result.get().rule().getName()).isEqualTo("SSH Brute Force Detection");
        assertThat(result.get().reason()).contains("3 events in 60s window (threshold: 3)");

        // Verify the MongoDB query strictly filtered on this specific sourceIp
        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate, times(1)).count(queryCaptor.capture(), eq("security_logs"));
        Query executedQuery = queryCaptor.getValue();
        assertThat(executedQuery.getQueryObject().get("sourceIp")).isEqualTo("198.51.100.55");
    }

    @Test
    @DisplayName("2. Different IPs do not combine under per-IP grouping")
    void differentIpsDoNotCombineUnderPerIpGrouping() {
        Instant now = Instant.now();
        SecurityLog logFromThirdIp = SecurityLog.builder()
                .id("log-ip-3")
                .sourceIp("198.51.100.99")
                .eventType(LogEventType.AUTHENTICATION_FAILURE)
                .severity(LogSeverity.MEDIUM)
                .timestamp(now)
                .message("SSH authentication failed for user 'root' from 198.51.100.99:51200")
                .build();

        // Count for this specific IP is only 1, despite failures on other IPs
        when(mongoTemplate.count(any(Query.class), eq("security_logs"))).thenReturn(1L);

        Optional<RuleMatcher.MatchResult> result = ruleMatcher.evaluate(logFromThirdIp, sshBruteForceRule);

        // Threshold (3) not reached for 198.51.100.99 -> does NOT trigger
        assertThat(result).isEmpty();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate, times(1)).count(queryCaptor.capture(), eq("security_logs"));
        Query executedQuery = queryCaptor.getValue();
        assertThat(executedQuery.getQueryObject().get("sourceIp")).isEqualTo("198.51.100.99");
    }

    @Test
    @DisplayName("3. Empty or null IP does not trigger per-IP grouping")
    void emptyIpDoesNotTriggerPerIpGrouping() {
        Instant now = Instant.now();

        SecurityLog logNullIp = SecurityLog.builder()
                .id("log-null-ip")
                .sourceIp(null)
                .eventType(LogEventType.AUTHENTICATION_FAILURE)
                .timestamp(now)
                .build();

        SecurityLog logEmptyIp = SecurityLog.builder()
                .id("log-empty-ip")
                .sourceIp("")
                .eventType(LogEventType.AUTHENTICATION_FAILURE)
                .timestamp(now)
                .build();

        SecurityLog logBlankIp = SecurityLog.builder()
                .id("log-blank-ip")
                .sourceIp("   ")
                .eventType(LogEventType.AUTHENTICATION_FAILURE)
                .timestamp(now)
                .build();

        assertThat(ruleMatcher.evaluate(logNullIp, sshBruteForceRule)).isEmpty();
        assertThat(ruleMatcher.evaluate(logEmptyIp, sshBruteForceRule)).isEmpty();
        assertThat(ruleMatcher.evaluate(logBlankIp, sshBruteForceRule)).isEmpty();

        verify(mongoTemplate, never()).count(any(Query.class), eq("security_logs"));
    }

    @Test
    @DisplayName("4. Global threshold rules can count events with empty source IP")
    void globalThresholdRulesCanCountEventsWithEmptySourceIp() {
        // Global rule: 5 system errors within 60s (no IP grouping)
        DetectionRule globalErrorRule = DetectionRule.builder()
                .id("rule-global-error")
                .name("Enterprise System Error Spike")
                .type(RuleType.THRESHOLD)
                .severity(LogSeverity.HIGH)
                .enabled(true)
                .condition(RuleCondition.builder()
                        .thresholdCount(5)
                        .thresholdWindowSeconds(60)
                        .groupBySourceIp(false)
                        .eventTypes(List.of(LogEventType.SYSTEM_ERROR))
                        .build())
                .build();

        SecurityLog localHostEvent = SecurityLog.builder()
                .id("log-err-01")
                .sourceIp("") // Empty IP from internal daemon
                .eventType(LogEventType.SYSTEM_ERROR)
                .timestamp(Instant.now())
                .message("Daemon crashed")
                .build();

        when(mongoTemplate.count(any(Query.class), eq("security_logs"))).thenReturn(5L);

        Optional<RuleMatcher.MatchResult> result = ruleMatcher.evaluate(localHostEvent, globalErrorRule);

        assertThat(result).isPresent();
        assertThat(result.get().reason()).contains("5 events in 60s window (threshold: 5)");

        // Verify query did NOT restrict to a single sourceIp
        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).count(queryCaptor.capture(), eq("security_logs"));
        assertThat(queryCaptor.getValue().getQueryObject().get("sourceIp")).isNull();
    }

    @Test
    @DisplayName("5. Global threshold rules can count events across different IPs")
    void globalThresholdRulesCanCountEventsAcrossDifferentIps() {
        // Global rule: Distributed credential stuffing detection (groupBySourceIp = false)
        DetectionRule globalStuffingRule = DetectionRule.builder()
                .id("rule-global-stuffing")
                .name("Mass Credential Stuffing")
                .type(RuleType.THRESHOLD)
                .severity(LogSeverity.CRITICAL)
                .enabled(true)
                .condition(RuleCondition.builder()
                        .thresholdCount(10)
                        .thresholdWindowSeconds(300)
                        .groupBySourceIp(false)
                        .eventTypes(List.of(LogEventType.AUTHENTICATION_FAILURE))
                        .build())
                .build();

        SecurityLog logFromIpA = SecurityLog.builder()
                .id("log-stuffing-10")
                .sourceIp("198.51.100.10")
                .eventType(LogEventType.AUTHENTICATION_FAILURE)
                .timestamp(Instant.now())
                .build();

        when(mongoTemplate.count(any(Query.class), eq("security_logs"))).thenReturn(10L);

        Optional<RuleMatcher.MatchResult> result = ruleMatcher.evaluate(logFromIpA, globalStuffingRule);

        assertThat(result).isPresent();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).count(queryCaptor.capture(), eq("security_logs"));
        // Query counts all matching events regardless of IP
        assertThat(queryCaptor.getValue().getQueryObject().get("sourceIp")).isNull();
    }

    @Test
    @DisplayName("6. IP allowlist filtering works independently of grouping")
    void ipAllowlistFilteringWorksIndependentlyOfGrouping() {
        // Case A: Rule with IP allowlist AND groupBySourceIp = true
        DetectionRule allowlistPerIpRule = DetectionRule.builder()
                .id("rule-allowlist-per-ip")
                .name("DMZ Bastion Failures")
                .type(RuleType.THRESHOLD)
                .severity(LogSeverity.HIGH)
                .enabled(true)
                .condition(RuleCondition.builder()
                        .thresholdCount(3)
                        .thresholdWindowSeconds(60)
                        .groupBySourceIp(true)
                        .ipAddresses(List.of("10.0.0.1", "10.0.0.2"))
                        .eventTypes(List.of(LogEventType.AUTHENTICATION_FAILURE))
                        .build())
                .build();

        // 6.1 Log matching allowlist with groupBySourceIp=true -> proceeds and filters by that exact IP
        SecurityLog eligibleLog = SecurityLog.builder()
                .id("log-dmz-1")
                .sourceIp("10.0.0.1")
                .eventType(LogEventType.AUTHENTICATION_FAILURE)
                .timestamp(Instant.now())
                .build();

        when(mongoTemplate.count(any(Query.class), eq("security_logs"))).thenReturn(3L);
        assertThat(ruleMatcher.evaluate(eligibleLog, allowlistPerIpRule)).isPresent();

        // 6.2 Log outside allowlist -> rejected immediately
        SecurityLog ineligibleLog = SecurityLog.builder()
                .id("log-dmz-2")
                .sourceIp("192.168.1.50")
                .eventType(LogEventType.AUTHENTICATION_FAILURE)
                .timestamp(Instant.now())
                .build();
        assertThat(ruleMatcher.evaluate(ineligibleLog, allowlistPerIpRule)).isEmpty();

        // Case B: Rule with IP allowlist AND groupBySourceIp = false (global across allowlist)
        DetectionRule allowlistGlobalRule = DetectionRule.builder()
                .id("rule-allowlist-global")
                .name("Cluster-wide DMZ Anomalies")
                .type(RuleType.THRESHOLD)
                .severity(LogSeverity.HIGH)
                .enabled(true)
                .condition(RuleCondition.builder()
                        .thresholdCount(5)
                        .thresholdWindowSeconds(60)
                        .groupBySourceIp(false)
                        .ipAddresses(List.of("10.0.0.1", "10.0.0.2"))
                        .eventTypes(List.of(LogEventType.AUTHENTICATION_FAILURE))
                        .build())
                .build();

        when(mongoTemplate.count(any(Query.class), eq("security_logs"))).thenReturn(5L);
        assertThat(ruleMatcher.evaluate(eligibleLog, allowlistGlobalRule)).isPresent();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate, atLeastOnce()).count(queryCaptor.capture(), eq("security_logs"));
        Query lastQuery = queryCaptor.getValue();
        // Query restricts to all allowlisted IPs: {"sourceIp": {"$in": ["10.0.0.1", "10.0.0.2"]}}
        assertThat(lastQuery.getQueryObject().get("sourceIp")).isNotNull();
    }

    @Test
    @DisplayName("7. Existing rules without groupBySourceIp remain backward-compatible (null defaults to global)")
    void existingRulesWithoutGroupBySourceIpRemainCompatible() {
        // Legacy rule without groupBySourceIp property (null)
        DetectionRule legacyRule = DetectionRule.builder()
                .id("rule-legacy-threshold")
                .name("Legacy Global Threshold")
                .type(RuleType.THRESHOLD)
                .severity(LogSeverity.MEDIUM)
                .enabled(true)
                .condition(RuleCondition.builder()
                        .thresholdCount(3)
                        .thresholdWindowSeconds(60)
                        .groupBySourceIp(null) // legacy default
                        .eventTypes(List.of(LogEventType.PORT_SCAN))
                        .build())
                .build();

        SecurityLog log = SecurityLog.builder()
                .id("log-legacy-01")
                .sourceIp("") // Empty IP or any IP
                .eventType(LogEventType.PORT_SCAN)
                .timestamp(Instant.now())
                .build();

        when(mongoTemplate.count(any(Query.class), eq("security_logs"))).thenReturn(3L);

        Optional<RuleMatcher.MatchResult> result = ruleMatcher.evaluate(log, legacyRule);

        assertThat(result).isPresent();
        assertThat(result.get().reason()).contains("3 events in 60s window (threshold: 3)");
    }

    @Test
    @DisplayName("8. Routine authorized sudo commands do not trigger unauthorized escalation")
    void routineAuthorizedSudoCommandsDoNotTriggerUnauthorizedEscalation() {
        SecurityLog routineSudoLog = SecurityLog.builder()
                .id("log-sudo-routine")
                .sourceIp("")
                .eventType(LogEventType.OTHER)
                .severity(LogSeverity.INFO)
                .message("Sudo command executed by 'vanparx' as 'root': /usr/bin/pacman -Syu")
                .metadata(Map.of("command", "/usr/bin/pacman -Syu", "sudo_user", "vanparx", "target_user", "root"))
                .timestamp(Instant.now())
                .build();

        Optional<RuleMatcher.MatchResult> result = ruleMatcher.evaluate(routineSudoLog, unauthorizedEscalationRule);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("9. A denied sudo attempt by a user not in sudoers triggers unauthorized escalation")
    void deniedSudoAttemptByNonSudoerTriggersUnauthorizedEscalation() {
        SecurityLog deniedSudoLog = SecurityLog.builder()
                .id("log-sudo-denied")
                .sourceIp("")
                .eventType(LogEventType.PRIVILEGE_ESCALATION)
                .severity(LogSeverity.HIGH)
                .message("Unauthorized sudo privilege escalation attempt by non-sudoer 'intruder': /usr/bin/cat /etc/shadow")
                .metadata(Map.of("command", "/usr/bin/cat /etc/shadow", "sudo_user", "intruder", "sudo_status", "DENIED_NOT_IN_SUDOERS"))
                .timestamp(Instant.now())
                .build();

        Optional<RuleMatcher.MatchResult> result = ruleMatcher.evaluate(deniedSudoLog, unauthorizedEscalationRule);

        assertThat(result).isPresent();
        assertThat(result.get().rule().getName()).isEqualTo("Unauthorized Privilege Escalation");
        assertThat(result.get().reason()).contains("Event type matched: PRIVILEGE_ESCALATION");
    }

    @Test
    @DisplayName("10. Successful interactive root shell activity is recorded without automatically being classified as unauthorized")
    void successfulInteractiveRootShellActivityRecordedWithoutBeingClassifiedUnauthorized() {
        SecurityLog interactiveShellLog = SecurityLog.builder()
                .id("log-sudo-interactive-shell")
                .sourceIp("")
                .eventType(LogEventType.OTHER)
                .severity(LogSeverity.LOW)
                .message("Interactive root shell executed via sudo by 'admin' as 'root': /bin/bash")
                .metadata(Map.of(
                        "command", "/bin/bash",
                        "sudo_user", "admin",
                        "target_user", "root",
                        "is_interactive_shell", "true"
                ))
                .timestamp(Instant.now())
                .build();

        Optional<RuleMatcher.MatchResult> result = ruleMatcher.evaluate(interactiveShellLog, unauthorizedEscalationRule);

        assertThat(result).isEmpty();
        assertThat(interactiveShellLog.getEventType()).isEqualTo(LogEventType.OTHER);
        assertThat(interactiveShellLog.getMetadata().get("is_interactive_shell")).isEqualTo("true");
    }
}
