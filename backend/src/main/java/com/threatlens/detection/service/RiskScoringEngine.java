package com.threatlens.detection.service;

import com.threatlens.detection.model.RiskCategory;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.log.model.SecurityLog;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic risk scoring engine.
 *
 * Score = baseSeverityScore + ruleSeverityBonus + frequencyBonus + eventTypeBonus
 * Range: 0–100
 *
 * Formula (documented):
 *   baseSeverityScore  = log severity mapped to 0–40
 *   ruleSeverityBonus  = rule severity mapped to 0–30
 *   frequencyBonus     = 0 or 20 (threshold-based rules that fired at 2x+ threshold)
 *   eventTypeBonus     = 0–10 based on high-risk event types
 *
 * Total is capped at 100.
 * This is a rule-based heuristic, NOT a machine-learning model.
 */
@Component
public class RiskScoringEngine {

    public RiskScore calculate(SecurityLog log, DetectionRule rule, boolean thresholdExceededSignificantly) {
        List<String> reasons = new ArrayList<>();
        int score = 0;

        // Base: log severity (0-40)
        int logSeverityScore = logSeverityScore(log.getSeverity());
        score += logSeverityScore;
        reasons.add("Log severity " + log.getSeverity() + " → +" + logSeverityScore);

        // Rule severity bonus (0-30)
        int ruleSeverityBonus = ruleSeverityBonus(rule.getSeverity());
        score += ruleSeverityBonus;
        reasons.add("Rule severity " + rule.getSeverity() + " → +" + ruleSeverityBonus);

        // Frequency bonus for threshold rules (0-20)
        if (thresholdExceededSignificantly) {
            score += 20;
            reasons.add("Threshold significantly exceeded → +20");
        }

        // Event type risk bonus (0-10)
        int eventTypeBonus = eventTypeBonus(log);
        score += eventTypeBonus;
        if (eventTypeBonus > 0) {
            reasons.add("High-risk event type " + log.getEventType() + " → +" + eventTypeBonus);
        }

        score = Math.min(score, 100);

        return new RiskScore(score, RiskCategory.fromScore(score), reasons);
    }

    private int logSeverityScore(LogSeverity severity) {
        if (severity == null) return 5;
        return switch (severity) {
            case CRITICAL -> 40;
            case HIGH     -> 30;
            case MEDIUM   -> 20;
            case LOW      -> 10;
            case INFO     -> 5;
        };
    }

    private int ruleSeverityBonus(LogSeverity severity) {
        if (severity == null) return 5;
        return switch (severity) {
            case CRITICAL -> 30;
            case HIGH     -> 22;
            case MEDIUM   -> 15;
            case LOW      -> 8;
            case INFO     -> 3;
        };
    }

    private int eventTypeBonus(SecurityLog log) {
        if (log.getEventType() == null) return 0;
        return switch (log.getEventType()) {
            case BRUTE_FORCE, PRIVILEGE_ESCALATION, DATA_EXFILTRATION,
                 MALWARE_DETECTED, RANSOMWARE_DETECTED -> 10;
            case SQL_INJECTION, XSS_ATTEMPT, PORT_SCAN,
                 SUSPICIOUS_PROCESS -> 7;
            case AUTHENTICATION_FAILURE, POLICY_VIOLATION,
                 FILE_INTEGRITY_VIOLATION -> 4;
            default -> 0;
        };
    }

    public record RiskScore(int score, RiskCategory category, List<String> reasons) {}
}
