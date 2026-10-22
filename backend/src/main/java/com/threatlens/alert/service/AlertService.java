package com.threatlens.alert.service;

import com.threatlens.alert.dto.AlertResponse;
import com.threatlens.alert.dto.AlertUpdateRequest;
import com.threatlens.alert.model.Alert;
import com.threatlens.alert.model.AlertStatus;
import com.threatlens.alert.repository.AlertRepository;
import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.service.AuditService;
import com.threatlens.common.exception.BadRequestException;
import com.threatlens.common.exception.NotFoundException;
import com.threatlens.detection.model.ThreatDetection;
import com.threatlens.log.model.SecurityLog;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    /**
     * Called by ThreatDetectionService for HIGH/CRITICAL detections. Idempotent.
     */
    public Alert createFromDetection(ThreatDetection detection, SecurityLog secLog, DetectionRule rule) {
        if (alertRepository.existsByDetectionId(detection.getId())) {
            log.debug("Alert already exists for detection {}", detection.getId());
            return alertRepository.findByDetectionId(detection.getId()).orElseThrow();
        }

        Alert alert = Alert.builder()
                .title("Threat Detected: " + detection.getRuleName())
                .description("Risk score " + detection.getRiskScore() + " (" + detection.getRiskCategory()
                        + "). Reason: " + detection.getMatchReason())
                .severity(detection.getSeverity())
                .status(AlertStatus.OPEN)
                .detectionId(detection.getId())
                .logId(secLog.getId())
                .ruleId(rule.getId())
                .build();

        Alert saved = alertRepository.save(alert);
        auditService.record(AuditAction.ALERT_CREATED, "Alert", saved.getId(),
                Map.of("detectionId", detection.getId(), "severity", detection.getSeverity()));

        try {
            notificationService.dispatchAlertNotifications(saved, secLog, detection);
        } catch (Exception ex) {
            log.error("Failed to dispatch alert notifications: {}", ex.getMessage());
        }

        log.info("Alert created: id={}, title={}", saved.getId(), saved.getTitle());
        return saved;
    }

    public Page<AlertResponse> listAlerts(AlertStatus status, Pageable pageable) {
        if (status != null)
            return alertRepository.findByStatus(status, pageable).map(this::toResponse);
        return alertRepository.findAll(pageable).map(this::toResponse);
    }

    public AlertResponse getAlert(String id) {
        return toResponse(findById(id));
    }

    public AlertResponse acknowledge(String id) {
        Alert alert = findById(id);
        validateTransition(alert.getStatus(), AlertStatus.ACKNOWLEDGED);
        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        alert.setAcknowledgedBy(currentUser());
        alert.setAcknowledgedAt(Instant.now());
        Alert saved = alertRepository.save(alert);
        auditService.record(AuditAction.ALERT_ACKNOWLEDGED, "Alert", id, Map.of("by", currentUser()));
        return toResponse(saved);
    }

    public AlertResponse assign(String id, String analyst) {
        Alert alert = findById(id);
        alert.setAssignedTo(analyst);
        alert.setStatus(AlertStatus.ASSIGNED);
        Alert saved = alertRepository.save(alert);
        auditService.record(AuditAction.ALERT_ASSIGNED, "Alert", id, Map.of("assignedTo", analyst));
        return toResponse(saved);
    }

    public AlertResponse resolve(String id, AlertUpdateRequest req) {
        Alert alert = findById(id);
        validateTransition(alert.getStatus(), AlertStatus.RESOLVED);
        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedBy(currentUser());
        alert.setResolvedAt(Instant.now());
        if (req.getResolutionNote() != null)
            alert.setResolutionNote(req.getResolutionNote());
        Alert saved = alertRepository.save(alert);
        auditService.record(AuditAction.ALERT_RESOLVED, "Alert", id, Map.of("by", currentUser()));
        return toResponse(saved);
    }

    public AlertResponse close(String id) {
        Alert alert = findById(id);
        alert.setStatus(AlertStatus.CLOSED);
        Alert saved = alertRepository.save(alert);
        auditService.record(AuditAction.ALERT_CLOSED, "Alert", id, Map.of("by", currentUser()));
        return toResponse(saved);
    }

    private void validateTransition(AlertStatus current, AlertStatus next) {
        // Allow any forward transition; reject invalid backwards moves
        if (current == AlertStatus.CLOSED || current == AlertStatus.RESOLVED) {
            throw new BadRequestException("Cannot transition from " + current + " to " + next);
        }
    }

    private Alert findById(String id) {
        return alertRepository.findById(id).orElseThrow(() -> new NotFoundException("Alert not found: " + id));
    }

    private String currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private AlertResponse toResponse(Alert a) {
        return AlertResponse.builder()
                .id(a.getId()).title(a.getTitle()).description(a.getDescription())
                .severity(a.getSeverity()).status(a.getStatus()).detectionId(a.getDetectionId())
                .logId(a.getLogId()).ruleId(a.getRuleId()).assignedTo(a.getAssignedTo())
                .acknowledgedBy(a.getAcknowledgedBy()).acknowledgedAt(a.getAcknowledgedAt())
                .resolvedBy(a.getResolvedBy()).resolvedAt(a.getResolvedAt())
                .resolutionNote(a.getResolutionNote()).createdAt(a.getCreatedAt()).updatedAt(a.getUpdatedAt())
                .build();
    }
}
