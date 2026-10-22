package com.threatlens.audit.dto;

import com.threatlens.audit.model.AuditAction;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data @Builder
public class AuditLogResponse {
    private String id;
    private String actor;
    private AuditAction action;
    private String resourceType;
    private String resourceId;
    private Map<String, Object> details;
    private Instant timestamp;
}
