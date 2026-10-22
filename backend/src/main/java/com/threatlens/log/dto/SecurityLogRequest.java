package com.threatlens.log.dto;

import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
public class SecurityLogRequest {
    @NotNull(message = "Timestamp is required")
    private Instant timestamp;

    @Pattern(regexp = "^(\\d{1,3}\\.){3}\\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^$",
             message = "Invalid IP address format")
    private String sourceIp;

    private String destinationIp;

    @NotNull(message = "Event type is required")
    private LogEventType eventType;

    @NotNull(message = "Severity is required")
    private LogSeverity severity;

    @NotBlank(message = "Source system is required")
    private String sourceSystem;

    @NotBlank(message = "Message is required")
    private String message;

    private Map<String, Object> metadata;
}
