package com.threatlens.alert.dto;

import lombok.Data;

@Data
public class AlertUpdateRequest {
    private String assignedTo;
    private String resolutionNote;
}
