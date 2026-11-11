package com.threatlens.detection.service;

import com.threatlens.alert.service.AlertService;
import com.threatlens.common.exception.BadRequestException;
import com.threatlens.common.exception.NotFoundException;
import com.threatlens.detection.dto.ThreatDetectionResponse;
import com.threatlens.detection.model.DetectionStatus;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.detection.model.ThreatDetection;
import com.threatlens.detection.repository.ThreatDetectionRepository;
import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.model.SecurityLog;
import com.threatlens.log.repository.SecurityLogRepository;
import com.threatlens.log.service.SecurityLogIngestedEvent;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.model.RuleType;
import com.threatlens.rule.repository.DetectionRuleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ThreatDetectionServiceTest {

    @Mock
    private ThreatDetectionRepository detectionRepository;

    @Mock
    private DetectionRuleRepository ruleRepository;

    @Mock
    private RuleMatcher ruleMatcher;

    @Mock
    private RiskScoringEngine riskScoringEngine;

    @Mock
    private SecurityLogRepository logRepository;

    @Mock
    private AlertService alertService;

    @InjectMocks
    private ThreatDetectionService detectionService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        detectionService.setAlertService(alertService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // -------------------------------------------------------------
    // Combined Detection Filters (Requirement 3)
    // -------------------------------------------------------------

    @Test
    @DisplayName("Filter by status only queries findByStatus")
    void filterByStatusOnlyQueriesFindByStatus() {
        Pageable pageable = PageRequest.of(0, 20);
        ThreatDetection det = ThreatDetection.builder().id("det-1").status(DetectionStatus.NEW).build();
        when(detectionRepository.findByStatus(DetectionStatus.NEW, pageable))
                .thenReturn(new PageImpl<>(List.of(det)));

        Page<ThreatDetectionResponse> result = detectionService.listDetections(DetectionStatus.NEW, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(detectionRepository, times(1)).findByStatus(DetectionStatus.NEW, pageable);
        verify(detectionRepository, never()).findByRiskCategory(any(), any());
        verify(detectionRepository, never()).findByStatusAndRiskCategory(any(), any(), any());
        verify(detectionRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("Filter by category only queries findByRiskCategory")
    void filterByCategoryOnlyQueriesFindByRiskCategory() {
        Pageable pageable = PageRequest.of(0, 20);
        ThreatDetection det = ThreatDetection.builder().id("det-2").riskCategory(RiskCategory.CRITICAL).build();
        when(detectionRepository.findByRiskCategory(RiskCategory.CRITICAL, pageable))
                .thenReturn(new PageImpl<>(List.of(det)));

        Page<ThreatDetectionResponse> result = detectionService.listDetections(null, RiskCategory.CRITICAL, pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(detectionRepository, times(1)).findByRiskCategory(RiskCategory.CRITICAL, pageable);
        verify(detectionRepository, never()).findByStatus(any(), any());
        verify(detectionRepository, never()).findByStatusAndRiskCategory(any(), any(), any());
        verify(detectionRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("Filter by status AND category queries findByStatusAndRiskCategory")
    void filterByStatusAndCategoryQueriesCombinedRepositoryMethod() {
        Pageable pageable = PageRequest.of(0, 20);
        ThreatDetection det = ThreatDetection.builder()
                .id("det-3")
                .status(DetectionStatus.NEW)
                .riskCategory(RiskCategory.CRITICAL)
                .build();
        when(detectionRepository.findByStatusAndRiskCategory(DetectionStatus.NEW, RiskCategory.CRITICAL, pageable))
                .thenReturn(new PageImpl<>(List.of(det)));

        Page<ThreatDetectionResponse> result = detectionService.listDetections(
                DetectionStatus.NEW, RiskCategory.CRITICAL, pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(detectionRepository, times(1))
                .findByStatusAndRiskCategory(DetectionStatus.NEW, RiskCategory.CRITICAL, pageable);
        verify(detectionRepository, never()).findByStatus(any(), any());
        verify(detectionRepository, never()).findByRiskCategory(any(), any());
        verify(detectionRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("No filters query findAll with pageable")
    void noFiltersQueriesFindAll() {
        Pageable pageable = PageRequest.of(0, 20);
        ThreatDetection det = ThreatDetection.builder().id("det-4").build();
        when(detectionRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(det)));

        Page<ThreatDetectionResponse> result = detectionService.listDetections(null, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(detectionRepository, times(1)).findAll(pageable);
        verify(detectionRepository, never()).findByStatus(any(), any());
        verify(detectionRepository, never()).findByRiskCategory(any(), any());
        verify(detectionRepository, never()).findByStatusAndRiskCategory(any(), any(), any());
    }

    // -------------------------------------------------------------
    // Lifecycle Metadata: User and Timestamp (Requirement 4)
    // -------------------------------------------------------------

    @Test
    @DisplayName("Status update to RESOLVED populates resolvedBy from authenticated principal and sets resolvedAt")
    void updateStatusToResolvedPopulatesPrincipalAndTimestamp() {
        ThreatDetection det = ThreatDetection.builder()
                .id("det-res-1")
                .status(DetectionStatus.ACKNOWLEDGED)
                .ruleName("SSH Brute Force")
                .build();

        when(detectionRepository.findById("det-res-1")).thenReturn(Optional.of(det));
        when(detectionRepository.save(any(ThreatDetection.class))).thenAnswer(inv -> inv.getArgument(0));

        // Set authenticated user context
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("analyst_sarah", "credentials", List.of())
        );

        ThreatDetectionResponse response = detectionService.updateStatus("det-res-1", DetectionStatus.RESOLVED);

        assertThat(response.getStatus()).isEqualTo(DetectionStatus.RESOLVED);
        assertThat(response.getResolvedBy()).isEqualTo("analyst_sarah");
        assertThat(response.getResolvedAt()).isNotNull();

        assertThat(det.getResolvedBy()).isEqualTo("analyst_sarah");
        assertThat(det.getResolvedAt()).isNotNull();
    }

    @Test
    @DisplayName("Status update to non-RESOLVED clears any existing resolution metadata")
    void updateStatusToNonResolvedClearsResolutionMetadata() {
        ThreatDetection det = ThreatDetection.builder()
                .id("det-ack-1")
                .status(DetectionStatus.NEW)
                .resolvedAt(Instant.now())
                .resolvedBy("old_analyst")
                .build();

        when(detectionRepository.findById("det-ack-1")).thenReturn(Optional.of(det));
        when(detectionRepository.save(any(ThreatDetection.class))).thenAnswer(inv -> inv.getArgument(0));

        ThreatDetectionResponse response = detectionService.updateStatus("det-ack-1", DetectionStatus.ACKNOWLEDGED);

        assertThat(response.getStatus()).isEqualTo(DetectionStatus.ACKNOWLEDGED);
        assertThat(response.getResolvedBy()).isNull();
        assertThat(response.getResolvedAt()).isNull();

        assertThat(det.getResolvedBy()).isNull();
        assertThat(det.getResolvedAt()).isNull();
    }

    // -------------------------------------------------------------
    // State Machine Validation: Invalid Transitions (Requirement 5 & 10)
    // -------------------------------------------------------------

    @Test
    @DisplayName("Transition from terminal RESOLVED status is rejected with BadRequestException")
    void transitionFromResolvedIsRejected() {
        ThreatDetection det = ThreatDetection.builder()
                .id("det-term-1")
                .status(DetectionStatus.RESOLVED)
                .build();

        when(detectionRepository.findById("det-term-1")).thenReturn(Optional.of(det));

        assertThatThrownBy(() -> detectionService.updateStatus("det-term-1", DetectionStatus.NEW))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid detection status transition: RESOLVED → NEW");

        assertThatThrownBy(() -> detectionService.updateStatus("det-term-1", DetectionStatus.ACKNOWLEDGED))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid detection status transition: RESOLVED → ACKNOWLEDGED");

        assertThatThrownBy(() -> detectionService.updateStatus("det-term-1", DetectionStatus.FALSE_POSITIVE))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid detection status transition: RESOLVED → FALSE_POSITIVE");

        verify(detectionRepository, never()).save(any(ThreatDetection.class));
    }

    @Test
    @DisplayName("Transition from terminal FALSE_POSITIVE status is rejected with BadRequestException")
    void transitionFromFalsePositiveIsRejected() {
        ThreatDetection det = ThreatDetection.builder()
                .id("det-term-2")
                .status(DetectionStatus.FALSE_POSITIVE)
                .build();

        when(detectionRepository.findById("det-term-2")).thenReturn(Optional.of(det));

        assertThatThrownBy(() -> detectionService.updateStatus("det-term-2", DetectionStatus.RESOLVED))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid detection status transition: FALSE_POSITIVE → RESOLVED");

        assertThatThrownBy(() -> detectionService.updateStatus("det-term-2", DetectionStatus.NEW))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid detection status transition: FALSE_POSITIVE → NEW");

        verify(detectionRepository, never()).save(any(ThreatDetection.class));
    }

    @Test
    @DisplayName("Backwards transition from ACKNOWLEDGED to NEW is rejected")
    void transitionFromAcknowledgedToNewIsRejected() {
        ThreatDetection det = ThreatDetection.builder()
                .id("det-ack-2")
                .status(DetectionStatus.ACKNOWLEDGED)
                .build();

        when(detectionRepository.findById("det-ack-2")).thenReturn(Optional.of(det));

        assertThatThrownBy(() -> detectionService.updateStatus("det-ack-2", DetectionStatus.NEW))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid detection status transition: ACKNOWLEDGED → NEW");

        verify(detectionRepository, never()).save(any(ThreatDetection.class));
    }

    @Test
    @DisplayName("Transition to identical status is rejected")
    void transitionToIdenticalStatusIsRejected() {
        ThreatDetection det = ThreatDetection.builder()
                .id("det-new-1")
                .status(DetectionStatus.NEW)
                .build();

        when(detectionRepository.findById("det-new-1")).thenReturn(Optional.of(det));

        assertThatThrownBy(() -> detectionService.updateStatus("det-new-1", DetectionStatus.NEW))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid detection status transition: NEW → NEW");

        verify(detectionRepository, never()).save(any(ThreatDetection.class));
    }

    // -------------------------------------------------------------
    // Detection-to-Alert Generation (Rule Severity Driven)
    // -------------------------------------------------------------

    @Test
    @DisplayName("HIGH rule severity triggers alert creation even when risk category is MEDIUM")
    void highRuleSeverityWithMediumRiskCategoryTriggersAlert() {
        SecurityLog log = createTestLog("log-1", LogSeverity.LOW);
        DetectionRule rule = createTestRule("rule-1", "SSH Brute Force Detection", LogSeverity.HIGH);

        when(ruleRepository.findByEnabled(true)).thenReturn(List.of(rule));
        when(detectionRepository.findByLogIdAndRuleId("log-1", "rule-1")).thenReturn(Optional.empty());
        when(ruleMatcher.evaluate(eq(log), eq(rule)))
                .thenReturn(Optional.of(new RuleMatcher.MatchResult(rule, "SSH failed attempts matched", false)));
        when(riskScoringEngine.calculate(eq(log), eq(rule), eq(false)))
                .thenReturn(new RiskScoringEngine.RiskScore(46, RiskCategory.MEDIUM, List.of("Rule severity HIGH -> +22")));
        when(detectionRepository.save(any(ThreatDetection.class))).thenAnswer(inv -> {
            ThreatDetection d = inv.getArgument(0);
            d.setId("det-saved-1");
            return d;
        });

        detectionService.onLogIngested(new SecurityLogIngestedEvent(this, log));

        verify(detectionRepository, times(1)).save(argThat(d ->
                d.getSeverity() == LogSeverity.HIGH
                        && d.getRiskScore() == 46
                        && d.getRiskCategory() == RiskCategory.MEDIUM
        ));
        verify(alertService, times(1)).createFromDetection(any(ThreatDetection.class), eq(log), eq(rule));
        assertThat(log.isProcessed()).isTrue();
        verify(logRepository, times(1)).save(log);
    }

    @Test
    @DisplayName("CRITICAL rule severity triggers alert creation even when risk category is LOW")
    void criticalRuleSeverityWithLowRiskCategoryTriggersAlert() {
        SecurityLog log = createTestLog("log-2", LogSeverity.INFO);
        DetectionRule rule = createTestRule("rule-2", "Critical Exploit Detection", LogSeverity.CRITICAL);

        when(ruleRepository.findByEnabled(true)).thenReturn(List.of(rule));
        when(detectionRepository.findByLogIdAndRuleId("log-2", "rule-2")).thenReturn(Optional.empty());
        when(ruleMatcher.evaluate(eq(log), eq(rule)))
                .thenReturn(Optional.of(new RuleMatcher.MatchResult(rule, "Critical exploit signature matched", false)));
        when(riskScoringEngine.calculate(eq(log), eq(rule), eq(false)))
                .thenReturn(new RiskScoringEngine.RiskScore(25, RiskCategory.LOW, List.of("Rule severity CRITICAL -> +30")));
        when(detectionRepository.save(any(ThreatDetection.class))).thenAnswer(inv -> {
            ThreatDetection d = inv.getArgument(0);
            d.setId("det-saved-2");
            return d;
        });

        detectionService.onLogIngested(new SecurityLogIngestedEvent(this, log));

        verify(detectionRepository, times(1)).save(argThat(d ->
                d.getSeverity() == LogSeverity.CRITICAL
                        && d.getRiskCategory() == RiskCategory.LOW
        ));
        verify(alertService, times(1)).createFromDetection(any(ThreatDetection.class), eq(log), eq(rule));
        assertThat(log.isProcessed()).isTrue();
        verify(logRepository, times(1)).save(log);
    }

    @Test
    @DisplayName("MEDIUM rule severity does NOT trigger alert creation even when risk category is HIGH")
    void mediumRuleSeverityWithHighRiskCategoryDoesNotTriggerAlert() {
        SecurityLog log = createTestLog("log-3", LogSeverity.HIGH);
        DetectionRule rule = createTestRule("rule-3", "Excessive Failed Logins", LogSeverity.MEDIUM);

        when(ruleRepository.findByEnabled(true)).thenReturn(List.of(rule));
        when(detectionRepository.findByLogIdAndRuleId("log-3", "rule-3")).thenReturn(Optional.empty());
        when(ruleMatcher.evaluate(eq(log), eq(rule)))
                .thenReturn(Optional.of(new RuleMatcher.MatchResult(rule, "Login threshold matched", false)));
        when(riskScoringEngine.calculate(eq(log), eq(rule), eq(false)))
                .thenReturn(new RiskScoringEngine.RiskScore(75, RiskCategory.HIGH, List.of("Log severity HIGH -> +35", "Rule severity MEDIUM -> +15")));
        when(detectionRepository.save(any(ThreatDetection.class))).thenAnswer(inv -> {
            ThreatDetection d = inv.getArgument(0);
            d.setId("det-saved-3");
            return d;
        });

        detectionService.onLogIngested(new SecurityLogIngestedEvent(this, log));

        verify(detectionRepository, times(1)).save(argThat(d ->
                d.getSeverity() == LogSeverity.MEDIUM
                        && d.getRiskCategory() == RiskCategory.HIGH
        ));
        verify(alertService, never()).createFromDetection(any(), any(), any());
        assertThat(log.isProcessed()).isTrue();
        verify(logRepository, times(1)).save(log);
    }

    @Test
    @DisplayName("LOW rule severity does NOT trigger alert creation even when risk category is CRITICAL")
    void lowRuleSeverityWithCriticalRiskCategoryDoesNotTriggerAlert() {
        SecurityLog log = createTestLog("log-4", LogSeverity.CRITICAL);
        DetectionRule rule = createTestRule("rule-4", "Minor Port Probe", LogSeverity.LOW);

        when(ruleRepository.findByEnabled(true)).thenReturn(List.of(rule));
        when(detectionRepository.findByLogIdAndRuleId("log-4", "rule-4")).thenReturn(Optional.empty());
        when(ruleMatcher.evaluate(eq(log), eq(rule)))
                .thenReturn(Optional.of(new RuleMatcher.MatchResult(rule, "Port probe matched", false)));
        when(riskScoringEngine.calculate(eq(log), eq(rule), eq(false)))
                .thenReturn(new RiskScoringEngine.RiskScore(90, RiskCategory.CRITICAL, List.of("High risk combination")));
        when(detectionRepository.save(any(ThreatDetection.class))).thenAnswer(inv -> {
            ThreatDetection d = inv.getArgument(0);
            d.setId("det-saved-4");
            return d;
        });

        detectionService.onLogIngested(new SecurityLogIngestedEvent(this, log));

        verify(detectionRepository, times(1)).save(argThat(d ->
                d.getSeverity() == LogSeverity.LOW
                        && d.getRiskCategory() == RiskCategory.CRITICAL
        ));
        verify(alertService, never()).createFromDetection(any(), any(), any());
        assertThat(log.isProcessed()).isTrue();
        verify(logRepository, times(1)).save(log);
    }

    @Test
    @DisplayName("Duplicate detection is skipped for idempotency before matcher and alert service")
    void duplicateDetectionSkippedForIdempotency() {
        SecurityLog log = createTestLog("log-dup", LogSeverity.HIGH);
        DetectionRule rule = createTestRule("rule-dup", "SSH Brute Force", LogSeverity.HIGH);

        when(ruleRepository.findByEnabled(true)).thenReturn(List.of(rule));
        when(detectionRepository.findByLogIdAndRuleId("log-dup", "rule-dup"))
                .thenReturn(Optional.of(ThreatDetection.builder().id("existing-det").build()));

        detectionService.onLogIngested(new SecurityLogIngestedEvent(this, log));

        verify(ruleMatcher, never()).evaluate(any(), any());
        verify(detectionRepository, never()).save(any(ThreatDetection.class));
        verify(alertService, never()).createFromDetection(any(), any(), any());
        assertThat(log.isProcessed()).isTrue();
        verify(logRepository, times(1)).save(log);
    }

    @Test
    @DisplayName("Alert creation failure is logged without failing detection save or log processing")
    void alertCreationFailureLoggedWithoutLosingDetection() {
        SecurityLog log = createTestLog("log-fail", LogSeverity.HIGH);
        DetectionRule rule = createTestRule("rule-fail", "Ransomware Behavior", LogSeverity.HIGH);

        when(ruleRepository.findByEnabled(true)).thenReturn(List.of(rule));
        when(detectionRepository.findByLogIdAndRuleId("log-fail", "rule-fail")).thenReturn(Optional.empty());
        when(ruleMatcher.evaluate(eq(log), eq(rule)))
                .thenReturn(Optional.of(new RuleMatcher.MatchResult(rule, "Ransomware pattern matched", false)));
        when(riskScoringEngine.calculate(eq(log), eq(rule), eq(false)))
                .thenReturn(new RiskScoringEngine.RiskScore(50, RiskCategory.MEDIUM, List.of("Score 50")));
        when(detectionRepository.save(any(ThreatDetection.class))).thenAnswer(inv -> {
            ThreatDetection d = inv.getArgument(0);
            d.setId("det-saved-fail");
            return d;
        });
        doThrow(new RuntimeException("Notification channel unavailable"))
                .when(alertService).createFromDetection(any(), any(), any());

        detectionService.onLogIngested(new SecurityLogIngestedEvent(this, log));

        verify(detectionRepository, times(1)).save(any(ThreatDetection.class));
        verify(alertService, times(1)).createFromDetection(any(), eq(log), eq(rule));
        assertThat(log.isProcessed()).isTrue();
        verify(logRepository, times(1)).save(log);
    }

    @Test
    @DisplayName("Null alertService does not prevent detection creation or log completion")
    void nullAlertServiceDoesNotThrow() {
        detectionService.setAlertService(null);

        SecurityLog log = createTestLog("log-null", LogSeverity.HIGH);
        DetectionRule rule = createTestRule("rule-null", "Rule No Alert", LogSeverity.HIGH);

        when(ruleRepository.findByEnabled(true)).thenReturn(List.of(rule));
        when(detectionRepository.findByLogIdAndRuleId("log-null", "rule-null")).thenReturn(Optional.empty());
        when(ruleMatcher.evaluate(eq(log), eq(rule)))
                .thenReturn(Optional.of(new RuleMatcher.MatchResult(rule, "Matched", false)));
        when(riskScoringEngine.calculate(eq(log), eq(rule), eq(false)))
                .thenReturn(new RiskScoringEngine.RiskScore(50, RiskCategory.MEDIUM, List.of("Score 50")));
        when(detectionRepository.save(any(ThreatDetection.class))).thenAnswer(inv -> {
            ThreatDetection d = inv.getArgument(0);
            d.setId("det-saved-null");
            return d;
        });

        detectionService.onLogIngested(new SecurityLogIngestedEvent(this, log));

        verify(detectionRepository, times(1)).save(any(ThreatDetection.class));
        assertThat(log.isProcessed()).isTrue();
        verify(logRepository, times(1)).save(log);
    }

    private SecurityLog createTestLog(String id, LogSeverity severity) {
        return SecurityLog.builder()
                .id(id)
                .timestamp(Instant.now())
                .sourceIp("192.168.1.100")
                .destinationIp("10.0.0.1")
                .eventType(LogEventType.AUTHENTICATION_FAILURE)
                .severity(severity)
                .message("Test log message")
                .processed(false)
                .build();
    }

    private DetectionRule createTestRule(String id, String name, LogSeverity severity) {
        return DetectionRule.builder()
                .id(id)
                .name(name)
                .type(RuleType.PATTERN_MATCH)
                .severity(severity)
                .enabled(true)
                .build();
    }
}

