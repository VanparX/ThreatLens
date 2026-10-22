package com.threatlens.log.service;

import com.threatlens.common.exception.NotFoundException;
import com.threatlens.log.dto.SecurityLogRequest;
import com.threatlens.log.dto.SecurityLogResponse;
import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.model.SecurityLog;
import com.threatlens.log.repository.SecurityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class SecurityLogService {

    private final SecurityLogRepository logRepository;
    private final ApplicationEventPublisher eventPublisher;

    public SecurityLogResponse ingest(SecurityLogRequest request) {
        SecurityLog log = SecurityLog.builder()
                .timestamp(request.getTimestamp())
                .sourceIp(request.getSourceIp())
                .destinationIp(request.getDestinationIp())
                .eventType(request.getEventType())
                .severity(request.getSeverity())
                .sourceSystem(request.getSourceSystem())
                .message(request.getMessage())
                .metadata(request.getMetadata())
                .processed(false)
                .build();

        SecurityLog saved = logRepository.save(log);
        eventPublisher.publishEvent(new SecurityLogIngestedEvent(this, saved));
        return toResponse(saved);
    }

    public Page<SecurityLogResponse> listLogs(LogSeverity severity, LogEventType eventType,
                                              String sourceIp, Instant from, Instant to,
                                              Pageable pageable) {
        if (severity != null) {
            return logRepository.findBySeverity(severity, pageable).map(this::toResponse);
        }
        if (eventType != null) {
            return logRepository.findByEventType(eventType, pageable).map(this::toResponse);
        }
        if (sourceIp != null && !sourceIp.isBlank()) {
            return logRepository.findBySourceIp(sourceIp, pageable).map(this::toResponse);
        }
        if (from != null && to != null) {
            return logRepository.findByTimestampBetween(from, to, pageable).map(this::toResponse);
        }
        return logRepository.findAll(pageable).map(this::toResponse);
    }

    public SecurityLogResponse getLog(String id) {
        SecurityLog log = logRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Security log not found: " + id));
        return toResponse(log);
    }

    public void markProcessed(String id) {
        SecurityLog log = logRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Security log not found: " + id));
        log.setProcessed(true);
        logRepository.save(log);
    }

    private SecurityLogResponse toResponse(SecurityLog log) {
        return SecurityLogResponse.builder()
                .id(log.getId())
                .timestamp(log.getTimestamp())
                .sourceIp(log.getSourceIp())
                .destinationIp(log.getDestinationIp())
                .eventType(log.getEventType())
                .severity(log.getSeverity())
                .sourceSystem(log.getSourceSystem())
                .message(log.getMessage())
                .metadata(log.getMetadata())
                .ingestedAt(log.getIngestedAt())
                .processed(log.isProcessed())
                .build();
    }
}
