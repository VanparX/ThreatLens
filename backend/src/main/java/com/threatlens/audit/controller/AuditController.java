package com.threatlens.audit.controller;

import com.threatlens.audit.dto.AuditLogResponse;
import com.threatlens.audit.model.AuditLog;
import com.threatlens.audit.service.AuditService;
import com.threatlens.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> list(
            @RequestParam(required = false) String actor,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<AuditLog> logs = actor != null
                ? auditService.getLogsByActor(actor, PageRequest.of(page, Math.min(size, 200), Sort.by(Sort.Direction.DESC, "timestamp")))
                : auditService.getLogs(PageRequest.of(page, Math.min(size, 200), Sort.by(Sort.Direction.DESC, "timestamp")));
        return ResponseEntity.ok(ApiResponse.success("Audit logs", logs.map(this::toResponse)));
    }

    @GetMapping("/resource/{type}/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> byResource(
            @PathVariable String type, @PathVariable String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AuditLog> logs = auditService.getLogsByResource(type, id,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp")));
        return ResponseEntity.ok(ApiResponse.success("Resource audit", logs.map(this::toResponse)));
    }

    private AuditLogResponse toResponse(AuditLog l) {
        return AuditLogResponse.builder().id(l.getId()).actor(l.getActor())
                .action(l.getAction()).resourceType(l.getResourceType()).resourceId(l.getResourceId())
                .details(l.getDetails()).timestamp(l.getTimestamp()).build();
    }
}
