package com.threatlens.detection.service;

import com.threatlens.log.model.SecurityLog;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.model.RuleCondition;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;

/**
 * Evaluates a single security log against a single detection rule.
 * Uses explicit, validated rule types only — no dynamic code execution.
 *
 * Limitations:
 *  - THRESHOLD rules count recent events in MongoDB (not a streaming window).
 *  - Pattern matching is simple contains/regex check, not a full text-search engine.
 */
@Component
@RequiredArgsConstructor
public class RuleMatcher {

    private final MongoTemplate mongoTemplate;

    public Optional<MatchResult> evaluate(SecurityLog log, DetectionRule rule) {
        if (!rule.isEnabled()) return Optional.empty();

        RuleCondition cond = rule.getCondition();
        if (cond == null) return Optional.empty();

        return switch (rule.getType()) {
            case EVENT_TYPE_MATCH -> evaluateEventTypeMatch(log, rule, cond);
            case IP_MATCH         -> evaluateIpMatch(log, rule, cond);
            case PATTERN_MATCH    -> evaluatePatternMatch(log, rule, cond);
            case THRESHOLD        -> evaluateThreshold(log, rule, cond);
            case COMPOSITE        -> evaluateComposite(log, rule, cond);
        };
    }

    private Optional<MatchResult> evaluateEventTypeMatch(SecurityLog log, DetectionRule rule, RuleCondition cond) {
        if (cond.getEventTypes() == null || cond.getEventTypes().isEmpty()) return Optional.empty();
        if (cond.getEventTypes().contains(log.getEventType())) {
            return Optional.of(new MatchResult(
                    rule,
                    "Event type matched: " + log.getEventType(),
                    false));
        }
        return Optional.empty();
    }

    private Optional<MatchResult> evaluateIpMatch(SecurityLog log, DetectionRule rule, RuleCondition cond) {
        if (cond.getIpAddresses() == null || cond.getIpAddresses().isEmpty()) return Optional.empty();
        String ip = log.getSourceIp();
        if (ip != null && cond.getIpAddresses().contains(ip)) {
            return Optional.of(new MatchResult(rule, "Source IP matched watchlist: " + ip, false));
        }
        return Optional.empty();
    }

    private Optional<MatchResult> evaluatePatternMatch(SecurityLog log, DetectionRule rule, RuleCondition cond) {
        if (cond.getPatterns() == null || cond.getPatterns().isEmpty()) return Optional.empty();
        String message = log.getMessage();
        if (message == null) return Optional.empty();

        for (String pattern : cond.getPatterns()) {
            // Safe: use simple contains or basic regex only (no dynamic eval)
            try {
                if (message.toLowerCase().contains(pattern.toLowerCase()) ||
                    message.matches("(?i).*" + pattern + ".*")) {
                    return Optional.of(new MatchResult(
                            rule,
                            "Log message matched pattern: '" + pattern + "'",
                            false));
                }
            } catch (Exception ignored) {
                // Invalid regex — fall back to contains
                if (message.toLowerCase().contains(pattern.toLowerCase())) {
                    return Optional.of(new MatchResult(rule, "Log message matched keyword: '" + pattern + "'", false));
                }
            }
        }
        return Optional.empty();
    }

    private Optional<MatchResult> evaluateThreshold(SecurityLog log, DetectionRule rule, RuleCondition cond) {
        if (cond.getThresholdCount() == null || cond.getThresholdWindowSeconds() == null) return Optional.empty();

        // 1. IP allowlist check: If rule defines an ipAddresses allowlist, log.sourceIp must match
        if (cond.getIpAddresses() != null && !cond.getIpAddresses().isEmpty()) {
            String ip = log.getSourceIp();
            if (ip == null || !cond.getIpAddresses().contains(ip)) {
                return Optional.empty();
            }
        }

        // 2. Source-IP grouping strategy
        boolean groupBySourceIp = Boolean.TRUE.equals(cond.getGroupBySourceIp());
        String sourceIp = log.getSourceIp();

        if (groupBySourceIp) {
            // When groupBySourceIp is true, require a valid, non-empty source IP
            if (sourceIp == null || sourceIp.isBlank()) {
                return Optional.empty();
            }
        }

        Instant logTimestamp = log.getTimestamp() != null ? log.getTimestamp() : Instant.now();
        Instant windowStart = logTimestamp.minusSeconds(cond.getThresholdWindowSeconds());

        Query query = new Query();
        Criteria criteria = Criteria.where("timestamp").gte(windowStart).lte(logTimestamp);

        // Apply sourceIp filter depending on grouping strategy vs allowlist
        if (groupBySourceIp) {
            criteria = criteria.and("sourceIp").is(sourceIp);
        } else if (cond.getIpAddresses() != null && !cond.getIpAddresses().isEmpty()) {
            // Global threshold with IP allowlist: count only events whose sourceIp is in the allowlist
            criteria = criteria.and("sourceIp").in(cond.getIpAddresses());
        }

        if (cond.getEventTypes() != null && !cond.getEventTypes().isEmpty()) {
            criteria = criteria.and("eventType").in(cond.getEventTypes());
        }
        query.addCriteria(criteria);

        long count = mongoTemplate.count(query, "security_logs");
        boolean exceeded = count >= cond.getThresholdCount();
        boolean significantlyExceeded = count >= cond.getThresholdCount() * 2;

        if (exceeded) {
            return Optional.of(new MatchResult(
                    rule,
                    count + " events in " + cond.getThresholdWindowSeconds() + "s window (threshold: " + cond.getThresholdCount() + ")",
                    significantlyExceeded));
        }
        return Optional.empty();
    }

    private Optional<MatchResult> evaluateComposite(SecurityLog log, DetectionRule rule, RuleCondition cond) {
        // Composite: pattern match AND threshold
        boolean patternMatch = false;
        if (cond.getPatterns() != null && !cond.getPatterns().isEmpty()) {
            patternMatch = evaluatePatternMatch(log, rule, cond).isPresent();
        } else {
            patternMatch = true; // no pattern filter = always matches
        }

        if (!patternMatch) return Optional.empty();
        return evaluateThreshold(log, rule, cond);
    }

    public record MatchResult(DetectionRule rule, String reason, boolean thresholdExceededSignificantly) {}
}
