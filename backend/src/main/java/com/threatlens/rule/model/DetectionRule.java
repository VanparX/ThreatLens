package com.threatlens.rule.model;

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

@Document(collection = "detection_rules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetectionRule {
    @Id
    private String id;

    private String name;

    private String description;

    @Indexed
    private RuleType type;

    private RuleCondition condition;

    @Indexed
    private LogSeverity severity;

    @Indexed
    private boolean enabled;

    private String createdBy;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
