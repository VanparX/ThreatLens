package com.threatlens.alert.service;

import com.threatlens.alert.model.Alert;
import com.threatlens.alert.model.AlertStatus;
import com.threatlens.alert.repository.AlertRepository;
import com.threatlens.audit.service.AuditService;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.detection.model.ThreatDetection;
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
}
