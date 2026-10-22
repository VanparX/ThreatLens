package com.threatlens.incident.dto;

import com.threatlens.log.model.LogSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class IncidentRequest {
    @NotBlank(message = "Title is required")
    private String title;
    private String description;
    @NotNull(message = "Severity is required")
    private LogSeverity severity;
    private String assignedTo;
    private String alertId;
    private String detectionId;
    private List<String> relatedLogIds;
}
