package com.threatlens.incident.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResponseActionRequest {
    @NotBlank(message = "Action type is required")
    private String actionType;
    @NotBlank(message = "Target is required")
    private String target;
    private String description;
}
