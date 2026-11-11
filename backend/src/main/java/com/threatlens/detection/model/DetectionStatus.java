package com.threatlens.detection.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum DetectionStatus {
    NEW,
    ACKNOWLEDGED,
    ALERT_CREATED,
    RESOLVED,
    FALSE_POSITIVE;

    private static final Map<DetectionStatus, Set<DetectionStatus>> ALLOWED_TRANSITIONS = Map.of(
            NEW, EnumSet.of(ACKNOWLEDGED, ALERT_CREATED, RESOLVED, FALSE_POSITIVE),
            ACKNOWLEDGED, EnumSet.of(ALERT_CREATED, RESOLVED, FALSE_POSITIVE),
            ALERT_CREATED, EnumSet.of(ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE),
            RESOLVED, Collections.emptySet(),
            FALSE_POSITIVE, Collections.emptySet()
    );

    /**
     * Determines whether transitioning from this status to target status is permitted.
     * Transitions from terminal states (RESOLVED, FALSE_POSITIVE) or to the same status are disallowed.
     */
    public boolean canTransitionTo(DetectionStatus next) {
        if (next == null || next == this) {
            return false;
        }
        return ALLOWED_TRANSITIONS.getOrDefault(this, Collections.emptySet()).contains(next);
    }

    public Set<DetectionStatus> getAllowedNextStatuses() {
        return Collections.unmodifiableSet(ALLOWED_TRANSITIONS.getOrDefault(this, Collections.emptySet()));
    }
}
