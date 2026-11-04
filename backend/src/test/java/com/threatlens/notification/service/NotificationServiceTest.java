package com.threatlens.notification.service;

import com.threatlens.alert.model.Alert;
import com.threatlens.audit.service.AuditService;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.detection.model.ThreatDetection;
import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.model.SecurityLog;
import com.threatlens.notification.dto.TestNotificationRequest;
import com.threatlens.notification.model.NotificationChannel;
import com.threatlens.notification.model.NotificationRecord;
import com.threatlens.notification.model.NotificationSettings;
import com.threatlens.notification.model.NotificationStatus;
import com.threatlens.notification.repository.NotificationRecordRepository;
import com.threatlens.notification.repository.NotificationSettingsRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationSettingsRepository settingsRepository;

    @Mock
    private NotificationRecordRepository recordRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private NotificationService notificationService;

    private NotificationSettings defaultSettings;

    @BeforeEach
    void setUp() {
        defaultSettings = NotificationSettings.builder()
                .emailEnabled(true)
                .smsEnabled(false)
                .recipientEmail("analyst@threatlens.io")
                .minSeverity(LogSeverity.HIGH)
                .build();

        when(settingsRepository.findAll()).thenReturn(List.of(defaultSettings));
        lenient().when(recordRepository.save(any(NotificationRecord.class))).thenAnswer(i -> i.getArgument(0));

        ReflectionTestUtils.setField(notificationService, "mailSender", mailSender);
        ReflectionTestUtils.setField(notificationService, "mailHost", "smtp.threatlens.local");
        ReflectionTestUtils.setField(notificationService, "configuredMailFrom", "alerts@threatlens.io");
        ReflectionTestUtils.setField(notificationService, "defaultRecipient", "analyst@threatlens.io");
    }

    private MimeMessage createDummyMimeMessage() {
        return new MimeMessage(Session.getDefaultInstance(new Properties()));
    }

    @Test
    @DisplayName("1. HIGH alert triggers email notification when threshold is HIGH")
    void highAlertTriggersEmailNotification() {
        when(mailSender.createMimeMessage()).thenReturn(createDummyMimeMessage());

        Alert alert = Alert.builder()
                .id("alert-high-101")
                .title("Threat Detected: SSH Brute Force")
                .description("Repeated SSH auth failures")
                .severity(LogSeverity.HIGH)
                .createdAt(Instant.now())
                .build();

        SecurityLog log = SecurityLog.builder()
                .sourceIp("198.51.100.55")
                .destinationIp("10.0.1.10")
                .eventType(LogEventType.BRUTE_FORCE)
                .sourceSystem("ssh-bastion")
                .build();

        ThreatDetection detection = ThreatDetection.builder()
                .riskScore(82)
                .riskCategory(RiskCategory.HIGH)
                .matchReason("Threshold of 3 failures exceeded")
                .scoreReasons(List.of("Log severity HIGH -> +30", "Threshold exceeded -> +20"))
                .build();

        notificationService.dispatchAlertNotifications(alert, log, detection);

        verify(mailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<NotificationRecord> recordCaptor = ArgumentCaptor.forClass(NotificationRecord.class);
        verify(recordRepository, times(1)).save(recordCaptor.capture());

        NotificationRecord savedRecord = recordCaptor.getValue();
        assertThat(savedRecord.getStatus()).isEqualTo(NotificationStatus.DELIVERED);
        assertThat(savedRecord.getRecipient()).isEqualTo("analyst@threatlens.io");
        assertThat(savedRecord.getSeverity()).isEqualTo(LogSeverity.HIGH);
        assertThat(savedRecord.getSubject()).contains("[ThreatLens SOC HIGH]");
    }

    @Test
    @DisplayName("2. CRITICAL alert triggers email notification")
    void criticalAlertTriggersEmailNotification() {
        when(mailSender.createMimeMessage()).thenReturn(createDummyMimeMessage());

        Alert alert = Alert.builder()
                .id("alert-crit-202")
                .title("Threat Detected: Ransomware Canary Encryption")
                .description("Canary files encrypted on host")
                .severity(LogSeverity.CRITICAL)
                .createdAt(Instant.now())
                .build();

        SecurityLog log = SecurityLog.builder()
                .sourceIp("10.0.4.88")
                .destinationIp("198.51.100.200")
                .eventType(LogEventType.RANSOMWARE_DETECTED)
                .sourceSystem("edr-agent")
                .build();

        ThreatDetection detection = ThreatDetection.builder()
                .riskScore(95)
                .riskCategory(RiskCategory.CRITICAL)
                .matchReason("Ransomware signature match")
                .build();

        notificationService.dispatchAlertNotifications(alert, log, detection);

        verify(mailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<NotificationRecord> recordCaptor = ArgumentCaptor.forClass(NotificationRecord.class);
        verify(recordRepository).save(recordCaptor.capture());
        assertThat(recordCaptor.getValue().getStatus()).isEqualTo(NotificationStatus.DELIVERED);
        assertThat(recordCaptor.getValue().getSeverity()).isEqualTo(LogSeverity.CRITICAL);
    }

    @Test
    @DisplayName("3. LOW and MEDIUM alerts do NOT trigger notifications when minSeverity is HIGH")
    void lowAndMediumAlertsDoNotTriggerNotifications() {
        Alert mediumAlert = Alert.builder()
                .id("alert-med-301")
                .title("Port Scan Detected")
                .severity(LogSeverity.MEDIUM)
                .build();

        Alert lowAlert = Alert.builder()
                .id("alert-low-302")
                .title("Policy Check")
                .severity(LogSeverity.LOW)
                .build();

        notificationService.dispatchAlertNotifications(mediumAlert, null, null);
        notificationService.dispatchAlertNotifications(lowAlert, null, null);

        verify(mailSender, never()).send(any(MimeMessage.class));
        verify(recordRepository, never()).save(any());
    }

    @Test
    @DisplayName("4. SMTP failure does not throw exception and records FAILED status")
    void smtpFailureDoesNotThrowAndRecordsFailedStatus() {
        when(mailSender.createMimeMessage()).thenReturn(createDummyMimeMessage());
        doThrow(new MailSendException("SMTP server connection timeout: host unreachable"))
                .when(mailSender).send(any(MimeMessage.class));

        Alert alert = Alert.builder()
                .id("alert-high-fail")
                .title("Unauthorized Privilege Escalation")
                .severity(LogSeverity.HIGH)
                .build();

        assertThatCode(() -> notificationService.dispatchAlertNotifications(alert, null, null))
                .doesNotThrowAnyException();

        ArgumentCaptor<NotificationRecord> recordCaptor = ArgumentCaptor.forClass(NotificationRecord.class);
        verify(recordRepository).save(recordCaptor.capture());

        NotificationRecord savedRecord = recordCaptor.getValue();
        assertThat(savedRecord.getStatus()).isEqualTo(NotificationStatus.FAILED);
        assertThat(savedRecord.getDetails()).contains("SMTP Delivery Failed");
    }

    @Test
    @DisplayName("5. Missing SMTP configuration is handled clearly and recorded as FAILED without throwing")
    void missingSmtpConfigurationHandledClearly() {
        // Set mailHost to empty string to simulate unconfigured SMTP
        ReflectionTestUtils.setField(notificationService, "mailHost", "");

        Alert alert = Alert.builder()
                .id("alert-unconfigured")
                .title("CRITICAL Host Breach")
                .severity(LogSeverity.CRITICAL)
                .build();

        assertThatCode(() -> notificationService.dispatchAlertNotifications(alert, null, null))
                .doesNotThrowAnyException();

        verify(mailSender, never()).send(any(MimeMessage.class));

        ArgumentCaptor<NotificationRecord> recordCaptor = ArgumentCaptor.forClass(NotificationRecord.class);
        verify(recordRepository).save(recordCaptor.capture());

        NotificationRecord savedRecord = recordCaptor.getValue();
        assertThat(savedRecord.getStatus()).isEqualTo(NotificationStatus.FAILED);
        assertThat(savedRecord.getDetails()).contains("SMTP host not configured: SPRING_MAIL_HOST is unset");
    }

    @Test
    @DisplayName("6. Duplicate alert processing suppresses duplicate email transmissions")
    void duplicateAlertProcessingDoesNotSendDuplicateEmails() {
        Alert alert = Alert.builder()
                .id("alert-dup-001")
                .title("Repeated Attack Alert")
                .severity(LogSeverity.HIGH)
                .build();

        // Simulate that this alert already had an email DELIVERED
        when(recordRepository.existsByAlertIdAndChannelAndStatus(
                "alert-dup-001", NotificationChannel.EMAIL, NotificationStatus.DELIVERED))
                .thenReturn(true);

        notificationService.dispatchAlertNotifications(alert, null, null);

        verify(mailSender, never()).send(any(MimeMessage.class));
        verify(recordRepository, never()).save(any());
    }

    @Test
    @DisplayName("7. Email content contains all required alert and investigation details")
    void emailContentContainsCorrectAlertDetails() throws Exception {
        MimeMessage mimeMessage = createDummyMimeMessage();
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        Alert alert = Alert.builder()
                .id("alert-detailed-777")
                .title("Host Compromise: Ransomware Beacon")
                .description("C2 beacon detected on finance workstation")
                .severity(LogSeverity.CRITICAL)
                .createdAt(Instant.parse("2026-11-02T14:30:00Z"))
                .build();

        SecurityLog log = SecurityLog.builder()
                .sourceIp("10.0.8.99")
                .destinationIp("198.51.100.222")
                .eventType(LogEventType.RANSOMWARE_DETECTED)
                .sourceSystem("crowdstrike-agent")
                .build();

        ThreatDetection detection = ThreatDetection.builder()
                .riskScore(98)
                .riskCategory(RiskCategory.CRITICAL)
                .matchReason("Mass encryption signature matched")
                .scoreReasons(List.of("Log severity CRITICAL -> +40", "High-risk event -> +10"))
                .build();

        notificationService.dispatchAlertNotifications(alert, log, detection);

        ArgumentCaptor<MimeMessage> mimeCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(mimeCaptor.capture());

        MimeMessage sentMessage = mimeCaptor.getValue();
        assertThat(sentMessage.getSubject()).isEqualTo("[ThreatLens SOC CRITICAL] Host Compromise: Ransomware Beacon");

        ArgumentCaptor<NotificationRecord> recordCaptor = ArgumentCaptor.forClass(NotificationRecord.class);
        verify(recordRepository).save(recordCaptor.capture());

        NotificationRecord record = recordCaptor.getValue();
        assertThat(record.getContent()).contains("Alert ID:    alert-detailed-777");
        assertThat(record.getContent()).contains("Severity:    CRITICAL");
        assertThat(record.getContent()).contains("Risk Score:  98 / 100");
        assertThat(record.getContent()).contains("Event Type:  RANSOMWARE_DETECTED");
        assertThat(record.getContent()).contains("Source IP:   10.0.8.99");
        assertThat(record.getContent()).contains("Source Host: crowdstrike-agent");
    }

    @Test
    @DisplayName("8. Automatic alert email prioritizes configured environment property APP_MAIL_DEFAULT_RECIPIENT")
    void automaticAlertPrioritizesConfiguredEnvironmentDefaultRecipient() {
        when(mailSender.createMimeMessage()).thenReturn(createDummyMimeMessage());

        // Configure an environment recipient different from the DB settings
        ReflectionTestUtils.setField(notificationService, "defaultRecipient", "configured-env-lead@threatlens.io");

        Alert alert = Alert.builder()
                .id("alert-crit-env-test")
                .title("Critical Infiltration Alert")
                .severity(LogSeverity.CRITICAL)
                .build();

        notificationService.dispatchAlertNotifications(alert, null, null);

        verify(mailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<NotificationRecord> recordCaptor = ArgumentCaptor.forClass(NotificationRecord.class);
        verify(recordRepository).save(recordCaptor.capture());

        NotificationRecord saved = recordCaptor.getValue();
        assertThat(saved.getStatus()).isEqualTo(NotificationStatus.DELIVERED);
        assertThat(saved.getRecipient()).isEqualTo("configured-env-lead@threatlens.io");
    }

    @Test
    @DisplayName("9. Test notification preserves explicit target recipient")
    void testNotificationPreservesExplicitTargetRecipient() {
        when(mailSender.createMimeMessage()).thenReturn(createDummyMimeMessage());

        TestNotificationRequest req = TestNotificationRequest.builder()
                .channel(NotificationChannel.EMAIL)
                .targetRecipient("explicit-analyst@custom-domain.com")
                .customMessage("Manual probe")
                .build();

        NotificationRecord record = notificationService.sendTestNotification(req);

        assertThat(record.getStatus()).isEqualTo(NotificationStatus.DELIVERED);
        assertThat(record.getRecipient()).isEqualTo("explicit-analyst@custom-domain.com");
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("10. Test notification falls back to configured environment recipient when targetRecipient is omitted")
    void testNotificationFallsBackToConfiguredEnvironmentRecipient() {
        when(mailSender.createMimeMessage()).thenReturn(createDummyMimeMessage());

        TestNotificationRequest req = TestNotificationRequest.builder()
                .channel(NotificationChannel.EMAIL)
                .targetRecipient("") // Omitted / blank
                .customMessage("Diagnostic without explicit target")
                .build();

        NotificationRecord record = notificationService.sendTestNotification(req);

        assertThat(record.getStatus()).isEqualTo(NotificationStatus.DELIVERED);
        assertThat(record.getRecipient()).isEqualTo("analyst@threatlens.io");
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }
}
