package com.threatlens.log.controller;

import com.threatlens.common.response.ApiResponse;
import com.threatlens.log.dto.SecurityLogRequest;
import com.threatlens.log.dto.SecurityLogResponse;
import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.service.SecurityLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class SecurityLogController {

    private final SecurityLogService logService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<SecurityLogResponse>> ingest(
            @Valid @RequestBody SecurityLogRequest request) {
        SecurityLogResponse response = logService.ingest(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Log ingested", response));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<SecurityLogResponse>>> listLogs(
            @RequestParam(required = false) LogSeverity severity,
            @RequestParam(required = false) LogEventType eventType,
            @RequestParam(required = false) String sourceIp,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sort,
            @RequestParam(defaultValue = "desc") String direction) {
        Sort.Direction sortDir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Page<SecurityLogResponse> logs = logService.listLogs(severity, eventType, sourceIp, from, to,
                PageRequest.of(page, Math.min(size, 100), Sort.by(sortDir, sort)));
        return ResponseEntity.ok(ApiResponse.success("Logs fetched", logs));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SecurityLogResponse>> getLog(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Log fetched", logService.getLog(id)));
    }
}
