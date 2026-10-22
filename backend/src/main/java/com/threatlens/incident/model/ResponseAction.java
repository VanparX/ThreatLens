package com.threatlens.incident.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Records a response action taken during incident investigation.
 * Actions are SIMULATED/RECORDED only — they do not execute
 * against external systems unless a real integration is configured.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResponseAction {
    private String id;
    private String actionType;
    private String target;
    private String description;
    private String performedBy;
    private ResponseActionStatus status;
    /** Always SIMULATED unless explicitly integrated with external system */
    private ResponseActionMode mode;
    private String result;
    private Instant performedAt;
}
