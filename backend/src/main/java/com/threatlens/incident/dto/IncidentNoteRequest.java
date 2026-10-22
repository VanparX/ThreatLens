package com.threatlens.incident.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class IncidentNoteRequest {
    @NotBlank(message = "Note content is required")
    private String content;
}
