package com.threatlens.incident.model;

import com.threatlens.log.model.LogSeverity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "incidents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Incident {
    @Id
    private String id;

    private String title;

    private String description;

    @Indexed
    private LogSeverity severity;

    @Indexed
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

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
