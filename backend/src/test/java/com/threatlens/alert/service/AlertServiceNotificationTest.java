package com.threatlens.alert.service;

import com.threatlens.alert.model.Alert;
import com.threatlens.alert.model.AlertStatus;
import com.threatlens.alert.repository.AlertRepository;
import com.threatlens.audit.service.AuditService;
import com.threatlens.detection.model.DetectionStatus;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.detection.model.ThreatDetection;
import com.threatlens.detection.repository.ThreatDetectionRepository;
import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.model.SecurityLog;
import com.threatlens.notification.service.NotificationService;
import com.threatlens.rule.model.DetectionRule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertServiceNotificationTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ThreatDetectionRepository detectionRepository;

    @InjectMocks
    private AlertService alertService;

    @Test
    @DisplayName("Alert persistence succeeds and is not rolled back when notification dispatch fails")
    void alertPersistenceSucceedsEvenWhenNotificationFails() {
        ThreatDetection detection = ThreatDetection.builder()
                .id("det-001")
                .ruleName("SSH Brute Force")
                .riskScore(85)
                .riskCategory(RiskCategory.HIGH)
                .matchReason("3 failed logins within 60s")
                .severity(LogSeverity.HIGH)
                .build();

        SecurityLog log = SecurityLog.builder()
                .id("log-001")
                .sourceIp("198.51.100.22")
                .eventType(LogEventType.BRUTE_FORCE)
                .build();

        DetectionRule rule = DetectionRule.builder()
                .id("rule-001")
                .name("SSH Brute Force")
                .build();

        Alert savedMock = Alert.builder()
                .id("alert-persist-001")
                .title("Threat Detected: SSH Brute Force")
                .severity(LogSeverity.HIGH)
                .status(AlertStatus.OPEN)
                .detectionId("det-001")
                .logId("log-001")
                .ruleId("rule-001")
                .createdAt(Instant.now())
                .build();

        when(alertRepository.existsByDetectionId("det-001")).thenReturn(false);
        when(alertRepository.save(any(Alert.class))).thenReturn(savedMock);

        // Simulate NotificationService throwing an unexpected runtime exception (e.g. SMTP crash or network drop)
        doThrow(new RuntimeException("Critical SMTP connection failure"))
                .when(notificationService).dispatchAlertNotifications(any(), any(), any());

        // Call createFromDetection
        assertThatCode(() -> {
            Alert result = alertService.createFromDetection(detection, log, rule);
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo("alert-persist-001");
            assertThat(result.getStatus()).isEqualTo(AlertStatus.OPEN);
        }).doesNotThrowAnyException();

        // Verify alert was saved to repository
        verify(alertRepository, times(1)).save(any(Alert.class));
    }

    @Test
    @DisplayName("Successful alert creation updates associated detection status to ALERT_CREATED")
    void successfulAlertCreationUpdatesDetectionStatusToAlertCreated() {
        ThreatDetection detection = ThreatDetection.builder()
                .id("det-100")
                .ruleName("Unauthorized Root Escalation")
                .status(DetectionStatus.NEW)
                .riskScore(90)
                .riskCategory(RiskCategory.CRITICAL)
                .severity(LogSeverity.CRITICAL)
                .build();

        SecurityLog log = SecurityLog.builder()
                .id("log-100")
                .sourceIp("10.0.0.5")
                .eventType(LogEventType.PRIVILEGE_ESCALATION)
                .build();

        DetectionRule rule = DetectionRule.builder()
                .id("rule-100")
                .name("Root Escalation")
                .build();

        Alert savedAlert = Alert.builder()
                .id("alert-100")
                .title("Threat Detected: Root Escalation")
                .severity(LogSeverity.CRITICAL)
                .status(AlertStatus.OPEN)
                .detectionId("det-100")
                .build();

        when(alertRepository.existsByDetectionId("det-100")).thenReturn(false);
        when(alertRepository.save(any(Alert.class))).thenReturn(savedAlert);
        when(detectionRepository.findById("det-100")).thenReturn(Optional.of(detection));

        Alert result = alertService.createFromDetection(detection, log, rule);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("alert-100");
        assertThat(detection.getStatus()).isEqualTo(DetectionStatus.ALERT_CREATED);
        verify(detectionRepository, times(1)).save(detection);
    }

    @Test
    @DisplayName("Failed alert creation does not update detection status")
    void failedAlertCreationDoesNotUpdateDetectionStatus() {
        ThreatDetection detection = ThreatDetection.builder()
                .id("det-200")
                .ruleName("SSH Brute Force")
                .status(DetectionStatus.NEW)
                .riskScore(80)
                .riskCategory(RiskCategory.HIGH)
                .severity(LogSeverity.HIGH)
                .build();

        SecurityLog log = SecurityLog.builder()
                .id("log-200")
                .sourceIp("198.51.100.55")
                .eventType(LogEventType.BRUTE_FORCE)
                .build();

        DetectionRule rule = DetectionRule.builder()
                .id("rule-200")
                .name("SSH Brute Force")
                .build();

        when(alertRepository.existsByDetectionId("det-200")).thenReturn(false);
        when(alertRepository.save(any(Alert.class))).thenThrow(new RuntimeException("MongoDB write error"));

        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            alertService.createFromDetection(detection, log, rule);
        });

        // Detection must retain original status and never be saved to detectionRepository
        assertThat(detection.getStatus()).isEqualTo(DetectionStatus.NEW);
        verify(detectionRepository, never()).save(any(ThreatDetection.class));
    }

    @Test
    @DisplayName("Alert creation avoids duplicate transitions when alert already exists")
    void duplicateAlertCreationDoesNotTransitionDetection() {
        ThreatDetection detection = ThreatDetection.builder()
                .id("det-300")
                .status(DetectionStatus.ALERT_CREATED)
                .build();

        Alert existingAlert = Alert.builder()
                .id("alert-existing")
                .detectionId("det-300")
                .status(AlertStatus.OPEN)
                .build();

        when(alertRepository.existsByDetectionId("det-300")).thenReturn(true);
        when(alertRepository.findByDetectionId("det-300")).thenReturn(Optional.of(existingAlert));

        Alert result = alertService.createFromDetection(detection, null, null);

        assertThat(result.getId()).isEqualTo("alert-existing");
        verify(alertRepository, never()).save(any(Alert.class));
        verify(detectionRepository, never()).save(any(ThreatDetection.class));
    }

    @Test
    @DisplayName("Alert creation avoids overwriting terminal RESOLVED status on detection")
    void alertCreationDoesNotOverwriteTerminalStatus() {
        ThreatDetection resolvedDet = ThreatDetection.builder()
                .id("det-400")
                .ruleName("Resolved Test")
                .status(DetectionStatus.RESOLVED)
                .riskScore(75)
                .riskCategory(RiskCategory.HIGH)
                .severity(LogSeverity.HIGH)
                .build();

        SecurityLog log = SecurityLog.builder().id("log-400").build();
        DetectionRule rule = DetectionRule.builder().id("rule-400").name("Rule").build();

        Alert savedAlert = Alert.builder().id("alert-400").detectionId("det-400").build();

        when(alertRepository.existsByDetectionId("det-400")).thenReturn(false);
        when(alertRepository.save(any(Alert.class))).thenReturn(savedAlert);
        when(detectionRepository.findById("det-400")).thenReturn(Optional.of(resolvedDet));

        alertService.createFromDetection(resolvedDet, log, rule);

        // Terminal RESOLVED status must be preserved
        assertThat(resolvedDet.getStatus()).isEqualTo(DetectionStatus.RESOLVED);
        verify(detectionRepository, never()).save(any(ThreatDetection.class));
    }

    @Test
    @DisplayName("getAlertByDetectionId returns mapped AlertResponse when found")
    void getAlertByDetectionIdReturnsAlertWhenFound() {
        Alert alert = Alert.builder()
                .id("alert-find-01")
                .detectionId("det-555")
                .title("Detection Alert")
                .status(AlertStatus.OPEN)
                .severity(LogSeverity.HIGH)
                .build();

        when(alertRepository.findByDetectionId("det-555")).thenReturn(Optional.of(alert));

        var response = alertService.getAlertByDetectionId("det-555");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("alert-find-01");
        assertThat(response.getDetectionId()).isEqualTo("det-555");
        verify(alertRepository, times(1)).findByDetectionId("det-555");
    }

    @Test
    @DisplayName("getAlertByDetectionId throws NotFoundException when alert does not exist")
    void getAlertByDetectionIdThrowsNotFoundWhenMissing() {
        when(alertRepository.findByDetectionId("det-missing")).thenReturn(Optional.empty());

        org.junit.jupiter.api.Assertions.assertThrows(
                com.threatlens.common.exception.NotFoundException.class,
                () -> alertService.getAlertByDetectionId("det-missing")
        );
    }

    @Test
    @DisplayName("listAlerts queries findByStatusAndSeverity when both parameters are present")
    void listAlertsQueriesCombinedMethod() {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        when(alertRepository.findByStatusAndSeverity(eq(AlertStatus.OPEN), eq(LogSeverity.CRITICAL), eq(pageable)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of()));

        var result = alertService.listAlerts(AlertStatus.OPEN, LogSeverity.CRITICAL, pageable);

        assertThat(result).isNotNull();
        verify(alertRepository, times(1)).findByStatusAndSeverity(AlertStatus.OPEN, LogSeverity.CRITICAL, pageable);
    }
}
