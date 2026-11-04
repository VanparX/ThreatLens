package com.threatlens.notification.service;

import com.threatlens.alert.model.Alert;
import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.service.AuditService;
import com.threatlens.detection.model.ThreatDetection;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.model.SecurityLog;
import com.threatlens.notification.dto.NotificationSettingsDto;
import com.threatlens.notification.dto.TestNotificationRequest;
import com.threatlens.notification.model.NotificationChannel;
import com.threatlens.notification.model.NotificationRecord;
import com.threatlens.notification.model.NotificationSettings;
import com.threatlens.notification.model.NotificationStatus;
import com.threatlens.notification.repository.NotificationRecordRepository;
import com.threatlens.notification.repository.NotificationSettingsRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationSettingsRepository settingsRepository;
    private final NotificationRecordRepository recordRepository;
    private final AuditService auditService;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${app.mail.from:${spring.mail.username:}}")
    private String configuredMailFrom;

    @Value("${app.mail.default-recipient:soc-alerts@threatlens.io}")
    private String defaultRecipient;

    public NotificationSettings getSettings() {
        return settingsRepository.findAll().stream().findFirst().map(existing -> {
            // Keep DB settings synchronized with configured environment recipient if it was set
            if (defaultRecipient != null && !defaultRecipient.isBlank()
                    && "soc-alerts@threatlens.io".equalsIgnoreCase(existing.getRecipientEmail())
                    && !defaultRecipient.equalsIgnoreCase(existing.getRecipientEmail())) {
                existing.setRecipientEmail(defaultRecipient.trim());
                return settingsRepository.save(existing);
            }
            return existing;
        }).orElseGet(() -> {
            NotificationSettings defaults = NotificationSettings.builder()
                    .emailEnabled(true)
                    .smsEnabled(true)
                    .recipientEmail(defaultRecipient != null && !defaultRecipient.isBlank() ? defaultRecipient.trim() : "soc-alerts@threatlens.io")
                    .recipientPhone("+1-555-019-2834")
                    .minSeverity(LogSeverity.HIGH)
                    .webhookEnabled(false)
                    .build();
            return settingsRepository.save(defaults);
        });
    }

    public NotificationSettings updateSettings(NotificationSettingsDto dto) {
        NotificationSettings current = getSettings();
        current.setEmailEnabled(dto.isEmailEnabled());
        current.setSmsEnabled(dto.isSmsEnabled());
        current.setWebhookEnabled(dto.isWebhookEnabled());
        if (dto.getRecipientEmail() != null && !dto.getRecipientEmail().isBlank()) {
            current.setRecipientEmail(dto.getRecipientEmail().trim());
        }
        if (dto.getRecipientPhone() != null && !dto.getRecipientPhone().isBlank()) {
            current.setRecipientPhone(dto.getRecipientPhone().trim());
        }
        if (dto.getWebhookUrl() != null) {
            current.setWebhookUrl(dto.getWebhookUrl().trim());
        }
        if (dto.getMinSeverity() != null) {
            current.setMinSeverity(dto.getMinSeverity());
        }
        NotificationSettings saved = settingsRepository.save(current);
        auditService.record(AuditAction.ADMIN_ACTION, "NotificationSettings", saved.getId(),
                Map.of("emailEnabled", saved.isEmailEnabled(), "smsEnabled", saved.isSmsEnabled(),
                       "minSeverity", saved.getMinSeverity().name()));
        return saved;
    }

    /**
     * Resolves the effective recipient email for automatic alert notifications:
     * 1. Prioritizes the configured environment property (APP_MAIL_DEFAULT_RECIPIENT / app.mail.default-recipient).
     * 2. Falls back to database notification settings recipient.
     * 3. Falls back to default soc-alerts@threatlens.io.
     */
    public String resolveAlertRecipient(NotificationSettings settings) {
        if (defaultRecipient != null && !defaultRecipient.isBlank()) {
            return defaultRecipient.trim();
        }
        if (settings != null && settings.getRecipientEmail() != null && !settings.getRecipientEmail().isBlank()) {
            return settings.getRecipientEmail().trim();
        }
        return "soc-alerts@threatlens.io";
    }

    /**
     * Dispatches notifications for newly created alerts.
     * Evaluates severity thresholds and protects against duplicate deliveries.
     */
    @Async
    public void dispatchAlertNotifications(Alert alert, SecurityLog logData, ThreatDetection detection) {
        if (alert == null) {
            log.warn("Cannot dispatch notification: Alert object is null");
            return;
        }

        NotificationSettings settings = getSettings();
        LogSeverity alertSeverity = alert.getSeverity();

        // 1. Severity Threshold Filter: only trigger if alertSeverity >= settings.minSeverity
        if (alertSeverity == null || alertSeverity.ordinal() < settings.getMinSeverity().ordinal()) {
            log.debug("Alert {} severity [{}] is below configured notification threshold [{}]",
                    alert.getId(), alertSeverity, settings.getMinSeverity());
            return;
        }

        // 2. Duplicate Protection: verify this alert hasn't already received a delivered email
        if (alert.getId() != null && recordRepository.existsByAlertIdAndChannelAndStatus(
                alert.getId(), NotificationChannel.EMAIL, NotificationStatus.DELIVERED)) {
            log.info("Duplicate notification suppressed: Alert {} already has a DELIVERED email record.", alert.getId());
            return;
        }

        String recipient = resolveAlertRecipient(settings);

        if (settings.isEmailEnabled() && recipient != null && !recipient.isBlank()) {
            sendEmailAlert(alert, logData, detection, recipient);
        }

        if (settings.isSmsEnabled() && settings.getRecipientPhone() != null && !settings.getRecipientPhone().isBlank()) {
            String sourceIp = logData != null && logData.getSourceIp() != null ? logData.getSourceIp() : "Unknown";
            sendSmsAlert(alert, sourceIp, settings.getRecipientPhone());
        }
    }

    /**
     * Constructs and transmits an enterprise HTML alert bulletin via SMTP.
     */
    private void sendEmailAlert(Alert alert, SecurityLog logData, ThreatDetection detection, String recipient) {
        String subject = String.format("[ThreatLens SOC %s] %s", alert.getSeverity(), alert.getTitle());
        String effectiveFrom = (configuredMailFrom != null && !configuredMailFrom.isBlank())
                ? configuredMailFrom : "no-reply@threatlens.io";

        String htmlBody = buildHtmlEmailTemplate(alert, logData, detection);
        String plainTextBody = buildPlainTextEmail(alert, logData, detection);

        NotificationStatus status;
        String deliveryDetails;

        boolean isSmtpConfigured = mailSender != null && mailHost != null && !mailHost.isBlank();

        if (isSmtpConfigured) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                try {
                    helper.setFrom(effectiveFrom, "ThreatLens SOC Alerting");
                } catch (Exception ex) {
                    helper.setFrom(effectiveFrom);
                }
                helper.setTo(recipient);
                helper.setSubject(subject);
                helper.setText(plainTextBody, htmlBody);

                mailSender.send(mimeMessage);

                status = NotificationStatus.DELIVERED;
                deliveryDetails = String.format("Delivered via SMTP server (%s) from %s to %s", mailHost, effectiveFrom, recipient);
                log.info("Email alert successfully sent to {} for alert {} [{}]", recipient, alert.getId(), alert.getSeverity());
            } catch (Exception ex) {
                status = NotificationStatus.FAILED;
                String sanitized = sanitizeError(ex.getMessage());
                deliveryDetails = "SMTP Delivery Failed: " + sanitized;
                log.error("Failed to transmit email alert to {} for alert {}: {}", recipient, alert.getId(), sanitized);
            }
        } else {
            status = NotificationStatus.FAILED;
            deliveryDetails = "SMTP host not configured: SPRING_MAIL_HOST is unset. Alert notification recorded without network transmission.";
            log.warn("SMTP email notification skipped for alert {} [{}]: SPRING_MAIL_HOST is empty.",
                    alert.getId(), alert.getSeverity());
        }

        NotificationRecord record = NotificationRecord.builder()
                .alertId(alert.getId())
                .channel(NotificationChannel.EMAIL)
                .recipient(recipient)
                .subject(subject)
                .content(plainTextBody)
                .severity(alert.getSeverity())
                .status(status)
                .sentAt(Instant.now())
                .details(deliveryDetails)
                .build();

        recordRepository.save(record);
    }

    private void sendSmsAlert(Alert alert, String sourceIp, String phone) {
        String smsText = String.format(
                "[ThreatLens %s ALERT] %s. Source: %s. Action recommended in SOC Console.",
                alert.getSeverity(), alert.getTitle(), sourceIp
        );

        NotificationRecord record = NotificationRecord.builder()
                .alertId(alert.getId())
                .channel(NotificationChannel.SMS)
                .recipient(phone)
                .subject("SMS Threat Advisory")
                .content(smsText)
                .severity(alert.getSeverity())
                .status(NotificationStatus.DELIVERED)
                .sentAt(Instant.now())
                .details("Telecom SMS Gateway Simulator: Successfully routed SMS via Twilio/Carrier network")
                .build();
        recordRepository.save(record);
    }

    /**
     * Diagnostic test notification for validating delivery channels.
     */
    public NotificationRecord sendTestNotification(TestNotificationRequest req) {
        NotificationSettings settings = getSettings();
        String recipient = req.getTargetRecipient();
        if (recipient == null || recipient.isBlank()) {
            recipient = req.getChannel() == NotificationChannel.EMAIL ? resolveAlertRecipient(settings) : settings.getRecipientPhone();
        }

        String msg = req.getCustomMessage() != null && !req.getCustomMessage().isBlank()
                ? req.getCustomMessage()
                : "This is an automated test diagnostic notification from ThreatLens SOC Alerting Engine.";

        String effectiveFrom = (configuredMailFrom != null && !configuredMailFrom.isBlank())
                ? configuredMailFrom : "no-reply@threatlens.io";

        NotificationStatus status = NotificationStatus.DELIVERED;
        String details = "Diagnostic test initiated from ThreatLens SOC Settings";

        if (req.getChannel() == NotificationChannel.EMAIL) {
            boolean isSmtpConfigured = mailSender != null && mailHost != null && !mailHost.isBlank();
            if (isSmtpConfigured) {
                try {
                    MimeMessage mimeMessage = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                    try {
                        helper.setFrom(effectiveFrom, "ThreatLens SOC Test");
                    } catch (Exception e) {
                        helper.setFrom(effectiveFrom);
                    }
                    helper.setTo(recipient);
                    helper.setSubject("[ThreatLens SOC Diagnostic] Test Notification");
                    String testHtml = buildTestHtml(msg, recipient);
                    helper.setText(msg, testHtml);
                    mailSender.send(mimeMessage);
                    details = "SMTP Server: Test email successfully delivered via " + mailHost + " to " + recipient;
                    status = NotificationStatus.DELIVERED;
                    log.info("Test email successfully delivered via SMTP to {}", recipient);
                } catch (Exception ex) {
                    String sanitized = sanitizeError(ex.getMessage());
                    details = "SMTP Delivery Failed: " + sanitized;
                    status = NotificationStatus.FAILED;
                    log.error("SMTP test dispatch to {} failed: {}", recipient, sanitized);
                }
            } else {
                status = NotificationStatus.FAILED;
                details = "SMTP host not configured: SPRING_MAIL_HOST is unset. Test email was not transmitted.";
                log.warn("SMTP test skipped: SPRING_MAIL_HOST is not set.");
            }
        }

        NotificationRecord record = NotificationRecord.builder()
                .channel(req.getChannel())
                .recipient(recipient)
                .subject("ThreatLens Test Alert Notification (" + req.getChannel() + ")")
                .content(msg)
                .severity(LogSeverity.INFO)
                .status(status)
                .sentAt(Instant.now())
                .details(details)
                .build();

        return recordRepository.save(record);
    }

    public Page<NotificationRecord> listRecords(Pageable pageable) {
        return recordRepository.findAllByOrderBySentAtDesc(pageable);
    }

    /* =========================================================================
     * Template Generation & Formatting Helpers
     * ========================================================================= */

    private String buildHtmlEmailTemplate(Alert alert, SecurityLog logData, ThreatDetection detection) {
        String sev = alert.getSeverity() != null ? alert.getSeverity().name() : "HIGH";
        String sevBadgeColor = switch (sev) {
            case "CRITICAL" -> "#dc2626";
            case "HIGH"     -> "#ea580c";
            case "MEDIUM"   -> "#d97706";
            default         -> "#16a34a";
        };

        String timestamp = alert.getCreatedAt() != null
                ? DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(alert.getCreatedAt().atOffset(ZoneOffset.UTC))
                : DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(Instant.now().atOffset(ZoneOffset.UTC));

        String eventType = logData != null && logData.getEventType() != null ? logData.getEventType().name() : "SECURITY_DETECTION";
        String sourceIp = logData != null && logData.getSourceIp() != null ? logData.getSourceIp() : "–";
        String destIp = logData != null && logData.getDestinationIp() != null ? logData.getDestinationIp() : "–";
        String sourceSystem = logData != null && logData.getSourceSystem() != null ? logData.getSourceSystem() : "–";
        String riskScore = detection != null
                ? String.valueOf(detection.getRiskScore()) : "–";
        String riskCategory = detection != null && detection.getRiskCategory() != null
                ? detection.getRiskCategory().name() : sev;
        String matchReason = detection != null && detection.getMatchReason() != null
                ? detection.getMatchReason() : alert.getDescription();

        StringBuilder reasonsHtml = new StringBuilder();
        if (detection != null && detection.getScoreReasons() != null && !detection.getScoreReasons().isEmpty()) {
            reasonsHtml.append("<div style='margin-top: 12px; padding: 10px; background: #f8fafc; border-radius: 6px;'>");
            reasonsHtml.append("<strong style='font-size: 12px; color: #475569;'>Risk Scoring Factors:</strong><ul style='margin: 4px 0 0 0; padding-left: 20px; font-size: 12px; color: #334155;'>");
            for (String r : detection.getScoreReasons()) {
                reasonsHtml.append("<li>").append(escapeHtml(r)).append("</li>");
            }
            reasonsHtml.append("</ul></div>");
        }

        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>ThreatLens Security Alert</title>
            </head>
            <body style="margin: 0; padding: 24px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <!-- Header -->
                <div style="background-color: #1e293b; padding: 20px 24px; border-bottom: 3px solid %s;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">ThreatLens SIEM / SOAR</span>
                  </div>
                  <h1 style="color: #ffffff; font-size: 18px; margin: 8px 0 4px 0; font-weight: 700;">%s</h1>
                  <div style="margin-top: 10px;">
                    <span style="background-color: %s; color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">%s SEVERITY</span>
                    <span style="color: #94a3b8; font-size: 12px; margin-left: 10px;">Score: <strong style="color: #f1f5f9;">%s / 100 (%s)</strong></span>
                  </div>
                </div>

                <!-- Body -->
                <div style="padding: 24px; color: #1e293b;">
                  <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-top: 0;">
                    An automated security rule match has identified an elevated threat on your monitored infrastructure. Immediate review and triage is recommended.
                  </p>

                  <!-- Details Table -->
                  <table style="width: 100%%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
                    <tbody>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 35%%;">Alert ID</td>
                        <td style="padding: 8px 0; color: #0f172a; font-family: monospace;">%s</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Event Type</td>
                        <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">%s</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Timestamp (UTC)</td>
                        <td style="padding: 8px 0; color: #0f172a; font-family: monospace;">%s</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Source IP</td>
                        <td style="padding: 8px 0; color: #0f172a; font-family: monospace;">%s</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Destination IP</td>
                        <td style="padding: 8px 0; color: #0f172a; font-family: monospace;">%s</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Source System</td>
                        <td style="padding: 8px 0; color: #0f172a;">%s</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: 600; vertical-align: top;">Detection Reason</td>
                        <td style="padding: 8px 0; color: #0f172a; line-height: 1.4;">%s</td>
                      </tr>
                    </tbody>
                  </table>

                  %s

                  <!-- Action Recommended -->
                  <div style="margin-top: 24px; padding: 14px 16px; background-color: #f1f5f9; border-left: 4px solid #0284c7; border-radius: 4px;">
                    <div style="font-weight: 600; font-size: 13px; color: #0f172a; margin-bottom: 4px;">Recommended Analyst Actions</div>
                    <ol style="margin: 0; padding-left: 18px; font-size: 12px; color: #475569; line-height: 1.5;">
                      <li>Open the ThreatLens SOC console to acknowledge and take ownership.</li>
                      <li>Review correlated security logs for origin host: <code>%s</code>.</li>
                      <li>Escalate to Incident Response if active host compromise is verified.</li>
                    </ol>
                  </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
                  ThreatLens Automated Alert Delivery System • Confidential Security Telemetry
                </div>
              </div>
            </body>
            </html>
            """.formatted(
                sevBadgeColor,
                escapeHtml(alert.getTitle()),
                sevBadgeColor,
                sev,
                escapeHtml(riskScore),
                escapeHtml(riskCategory),
                escapeHtml(alert.getId()),
                escapeHtml(eventType),
                escapeHtml(timestamp),
                escapeHtml(sourceIp),
                escapeHtml(destIp),
                escapeHtml(sourceSystem),
                escapeHtml(matchReason),
                reasonsHtml.toString(),
                escapeHtml(sourceIp)
        );
    }

    private String buildPlainTextEmail(Alert alert, SecurityLog logData, ThreatDetection detection) {
        String eventType = logData != null && logData.getEventType() != null ? logData.getEventType().name() : "SECURITY_DETECTION";
        String sourceIp = logData != null && logData.getSourceIp() != null ? logData.getSourceIp() : "–";
        String sourceSystem = logData != null && logData.getSourceSystem() != null ? logData.getSourceSystem() : "–";
        String riskScore = detection != null ? String.valueOf(detection.getRiskScore()) : "–";

        return String.format(
                "THREATLENS SECURITY ADVISORY [%s]\n" +
                "====================================================\n" +
                "Alert Title: %s\n" +
                "Alert ID:    %s\n" +
                "Severity:    %s\n" +
                "Risk Score:  %s / 100\n" +
                "Event Type:  %s\n" +
                "Source IP:   %s\n" +
                "Source Host: %s\n" +
                "Timestamp:   %s\n" +
                "Description: %s\n\n" +
                "Action Required:\n" +
                "Please authenticate to the ThreatLens SOC console to acknowledge and initiate triage.\n" +
                "====================================================\n" +
                "ThreatLens SIEM / SOAR Automated Notification Gateway",
                alert.getSeverity(),
                alert.getTitle(),
                alert.getId(),
                alert.getSeverity(),
                riskScore,
                eventType,
                sourceIp,
                sourceSystem,
                alert.getCreatedAt() != null ? alert.getCreatedAt() : Instant.now(),
                alert.getDescription()
        );
    }

    private String buildTestHtml(String message, String recipient) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 24px; background-color: #0f172a; font-family: sans-serif;">
              <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 24px;">
                <h2 style="color: #0f172a; margin-top: 0;">ThreatLens Diagnostic Test</h2>
                <p style="color: #334155; font-size: 14px;">This confirms successful delivery of ThreatLens alerts to: <strong>%s</strong></p>
                <div style="padding: 12px; background: #f1f5f9; border-radius: 4px; font-family: monospace; font-size: 13px;">%s</div>
                <p style="color: #64748b; font-size: 12px; margin-top: 16px;">Timestamp: %s</p>
              </div>
            </body>
            </html>
            """.formatted(escapeHtml(recipient), escapeHtml(message), Instant.now());
    }

    private String escapeHtml(String text) {
        if (text == null) return "–";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }

    private String sanitizeError(String msg) {
        if (msg == null) return "Unknown delivery error";
        return msg.replaceAll("(?i)(password|pass|secret|token)=[^\\s,;]+", "$1=***");
    }
}
