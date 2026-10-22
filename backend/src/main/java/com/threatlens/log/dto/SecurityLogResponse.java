package com.threatlens.log.dto;

import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
public class SecurityLogResponse {
    private String id;
    private Instant timestamp;
    private String sourceIp;
    private String destinationIp;
    private LogEventType eventType;
    private LogSeverity severity;
    private String sourceSystem;
    private String message;
    private Map<String, Object> metadata;
    private Instant ingestedAt;
    private boolean processed;
}
