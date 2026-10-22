package com.threatlens.rule.model;

import com.threatlens.log.model.LogEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Represents configurable conditions for detection rules.
 * Fields used depend on RuleType:
 * - THRESHOLD: thresholdCount + thresholdWindowSeconds (+ optional eventType/ipAddresses filter)
 * - PATTERN_MATCH: patterns (matched against log message)
 * - IP_MATCH: ipAddresses
 * - EVENT_TYPE_MATCH: eventTypes
 * - COMPOSITE: combines threshold + patterns
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleCondition {
    // Threshold-based
    private Integer thresholdCount;
    private Integer thresholdWindowSeconds;

    // Pattern-based (regex or keyword)
    private List<String> patterns;

    // IP-based
    private List<String> ipAddresses;

    // Event-type based
    private List<LogEventType> eventTypes;

    // Optional severity filter (applies to all types)
    private List<String> severities;
}
