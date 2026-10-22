package com.threatlens.rule.dto;

import com.threatlens.log.model.LogSeverity;
import com.threatlens.rule.model.RuleCondition;
import com.threatlens.rule.model.RuleType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class DetectionRuleResponse {
    private String id;
    private String name;
    private String description;
    private RuleType type;
    private RuleCondition condition;
    private LogSeverity severity;
    private boolean enabled;
    private String createdBy;
    private Instant createdAt;
    private Instant updatedAt;
}
