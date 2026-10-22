package com.threatlens.alert.model;

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

@Document(collection = "alerts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {
    @Id
    private String id;

    private String title;

    private String description;

    @Indexed
    private LogSeverity severity;

    @Indexed
    private AlertStatus status;

    @Indexed
    private String detectionId;

    private String logId;

    private String ruleId;

    private String assignedTo;

    private String acknowledgedBy;

    private Instant acknowledgedAt;

    private String resolvedBy;

    private Instant resolvedAt;

    private String resolutionNote;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
