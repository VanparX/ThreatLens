package com.threatlens.alert.dto;

import com.threatlens.alert.model.AlertStatus;
import com.threatlens.log.model.LogSeverity;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AlertResponse {
    private String id;
    private String title;
    private String description;
    private LogSeverity severity;
    private AlertStatus status;
    private String detectionId;
    private String logId;
    private String ruleId;
    private String assignedTo;
    private String acknowledgedBy;
    private Instant acknowledgedAt;
    private String resolvedBy;
    private Instant resolvedAt;
    private String resolutionNote;
    private Instant createdAt;
    private Instant updatedAt;
}
