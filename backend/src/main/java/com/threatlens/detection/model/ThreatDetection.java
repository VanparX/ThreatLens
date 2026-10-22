package com.threatlens.detection.model;

import com.threatlens.log.model.LogSeverity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "threat_detections")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndexes({
    @CompoundIndex(name = "log_rule", def = "{'logId': 1, 'ruleId': 1}", unique = true)
})
public class ThreatDetection {
    @Id
    private String id;

    @Indexed
    private String logId;

    @Indexed
    private String ruleId;

    private String ruleName;

    private String matchReason;

    @Indexed
    private int riskScore;

    @Indexed
    private RiskCategory riskCategory;

    private List<String> scoreReasons;

    @Indexed
    private DetectionStatus status;

    @Indexed
    private LogSeverity severity;

    @CreatedDate
    private Instant detectedAt;

    private Instant resolvedAt;

    private String resolvedBy;
}
