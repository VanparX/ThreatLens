package com.threatlens.detection.service;

import com.threatlens.alert.service.AlertService;
import com.threatlens.common.exception.BadRequestException;
import com.threatlens.common.exception.NotFoundException;
import com.threatlens.detection.dto.ThreatDetectionResponse;
import com.threatlens.detection.model.DetectionStatus;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.detection.model.ThreatDetection;
import com.threatlens.detection.repository.ThreatDetectionRepository;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.model.SecurityLog;
import com.threatlens.log.repository.SecurityLogRepository;
import com.threatlens.log.service.SecurityLogIngestedEvent;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.repository.DetectionRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThreatDetectionService {

    private final ThreatDetectionRepository detectionRepository;
    private final DetectionRuleRepository ruleRepository;
    private final SecurityLogRepository logRepository;
    private final RuleMatcher ruleMatcher;
    private final RiskScoringEngine riskScoringEngine;
    // AlertService injected via setter to break circular dep
    private AlertService alertService;

    public void setAlertService(AlertService alertService) {
        this.alertService = alertService;
    }

    /**
     * Called asynchronously when a new security log is ingested.
     * Evaluates ALL enabled rules against the log.
     */
    @EventListener
    @Async
    public void onLogIngested(SecurityLogIngestedEvent event) {
        SecurityLog secLog = event.getLog();
        List<DetectionRule> enabledRules = ruleRepository.findByEnabled(true);

        for (DetectionRule rule : enabledRules) {
            try {
                processRuleAgainstLog(secLog, rule);
            } catch (Exception e) {
                log.error("Error evaluating rule {} against log {}: {}", rule.getId(), secLog.getId(), e.getMessage(), e);
            }
        }

        // Mark log as processed
        secLog.setProcessed(true);
        logRepository.save(secLog);
    }

    private void processRuleAgainstLog(SecurityLog secLog, DetectionRule rule) {
        // Idempotency: skip if already detected
        if (detectionRepository.findByLogIdAndRuleId(secLog.getId(), rule.getId()).isPresent()) {
            return;
        }

        ruleMatcher.evaluate(secLog, rule).ifPresent(match -> {
            RiskScoringEngine.RiskScore riskScore = riskScoringEngine.calculate(
                    secLog, rule, match.thresholdExceededSignificantly());

            ThreatDetection detection = ThreatDetection.builder()
                    .logId(secLog.getId())
                    .ruleId(rule.getId())
                    .ruleName(rule.getName())
                    .matchReason(match.reason())
                    .riskScore(riskScore.score())
                    .riskCategory(riskScore.category())
                    .scoreReasons(riskScore.reasons())
                    .status(DetectionStatus.NEW)
                    .severity(rule.getSeverity())
                    .build();

            ThreatDetection saved = detectionRepository.save(detection);
            log.info("Threat detection created: id={}, rule={}, score={}, category={}",
                    saved.getId(), rule.getName(), riskScore.score(), riskScore.category());

            // Auto-create alert for HIGH/CRITICAL rule severity
            if (saved.getSeverity() == LogSeverity.HIGH || saved.getSeverity() == LogSeverity.CRITICAL) {
                if (alertService != null) {
                    try {
                        alertService.createFromDetection(saved, secLog, rule);
                    } catch (Exception e) {
                        log.error("Failed to auto-create alert for detection {}: {}", saved.getId(), e.getMessage());
                    }
                }
            }
        });
    }

    public Page<ThreatDetectionResponse> listDetections(DetectionStatus status, RiskCategory category, Pageable pageable) {
        if (status != null && category != null) {
            return detectionRepository.findByStatusAndRiskCategory(status, category, pageable).map(this::toResponse);
        }
        if (status != null) {
            return detectionRepository.findByStatus(status, pageable).map(this::toResponse);
        }
        if (category != null) {
            return detectionRepository.findByRiskCategory(category, pageable).map(this::toResponse);
        }
        return detectionRepository.findAll(pageable).map(this::toResponse);
    }

    public ThreatDetectionResponse getDetection(String id) {
        return toResponse(findById(id));
    }

    public ThreatDetectionResponse updateStatus(String id, DetectionStatus newStatus) {
        if (newStatus == null) {
            throw new BadRequestException("Target status is required");
        }
        ThreatDetection det = findById(id);
        DetectionStatus currentStatus = det.getStatus();

        if (!currentStatus.canTransitionTo(newStatus)) {
            throw new BadRequestException("Invalid detection status transition: " + currentStatus + " → " + newStatus);
        }

        det.setStatus(newStatus);
        if (newStatus == DetectionStatus.RESOLVED) {
            det.setResolvedAt(Instant.now());
            det.setResolvedBy(currentUser());
        } else {
            det.setResolvedAt(null);
            det.setResolvedBy(null);
        }

        ThreatDetection saved = detectionRepository.save(det);
        log.info("Detection status updated: id={}, from={}, to={}, by={}",
                saved.getId(), currentStatus, newStatus, currentUser());
        return toResponse(saved);
    }

    private String currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null && !auth.getName().isBlank()) ? auth.getName() : "system";
    }

    private ThreatDetection findById(String id) {
        return detectionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Threat detection not found: " + id));
    }

    private ThreatDetectionResponse toResponse(ThreatDetection d) {
        return ThreatDetectionResponse.builder()
                .id(d.getId()).logId(d.getLogId()).ruleId(d.getRuleId())
                .ruleName(d.getRuleName()).matchReason(d.getMatchReason())
                .riskScore(d.getRiskScore()).riskCategory(d.getRiskCategory())
                .scoreReasons(d.getScoreReasons()).status(d.getStatus())
                .severity(d.getSeverity()).detectedAt(d.getDetectedAt())
                .resolvedAt(d.getResolvedAt()).resolvedBy(d.getResolvedBy())
                .build();
    }
}
