package com.threatlens.incident.dto;

import com.threatlens.incident.model.IncidentNote;
import com.threatlens.incident.model.IncidentStatus;
import com.threatlens.incident.model.ResponseAction;
import com.threatlens.log.model.LogSeverity;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class IncidentResponse {
    private String id;
    private String title;
    private String description;
    private LogSeverity severity;
    private IncidentStatus status;
    private String assignedTo;
    private String createdBy;
    private String alertId;
    private String detectionId;
    private List<String> relatedLogIds;
    private List<IncidentNote> notes;
    private List<ResponseAction> responseActions;
    private String resolutionSummary;
    private Instant containedAt;
    private Instant resolvedAt;
    private Instant closedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
