package com.threatlens.rule.dto;

import com.threatlens.log.model.LogSeverity;
import com.threatlens.rule.model.RuleCondition;
import com.threatlens.rule.model.RuleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DetectionRuleRequest {
    @NotBlank(message = "Rule name is required")
    private String name;

    private String description;

    @NotNull(message = "Rule type is required")
    private RuleType type;

    @NotNull(message = "Rule condition is required")
    private RuleCondition condition;

    @NotNull(message = "Severity is required")
    private LogSeverity severity;

    private boolean enabled = true;
}
