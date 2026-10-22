package com.threatlens.detection.dto;

import com.threatlens.detection.model.DetectionStatus;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.log.model.LogSeverity;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class ThreatDetectionResponse {
    private String id;
    private String logId;
    private String ruleId;
    private String ruleName;
    private String matchReason;
    private int riskScore;
    private RiskCategory riskCategory;
    private List<String> scoreReasons;
    private DetectionStatus status;
    private LogSeverity severity;
    private Instant detectedAt;
    private Instant resolvedAt;
    private String resolvedBy;
}
