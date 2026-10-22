package com.threatlens.detection.model;

public enum RiskCategory {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL;

    public static RiskCategory fromScore(int score) {
        if (score >= 75) return CRITICAL;
        if (score >= 50) return HIGH;
        if (score >= 25) return MEDIUM;
        return LOW;
    }
}
