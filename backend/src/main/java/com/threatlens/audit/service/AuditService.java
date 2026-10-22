package com.threatlens.audit.service;

import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.model.AuditLog;
import com.threatlens.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Record an audit event asynchronously to avoid blocking business operations.
     * Never logs passwords, JWTs, or secrets.
     */
    @Async
    public void record(AuditAction action, String resourceType, String resourceId, Map<String, Object> details) {
        String actor = getCurrentActor();
        String actorId = getCurrentActorId();

        AuditLog entry = AuditLog.builder()
                .actor(actor)
                .actorId(actorId)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .details(details)
                .timestamp(Instant.now())
                .build();

        try {
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to save audit log entry: action={}, resource={}/{}", action, resourceType, resourceId, e);
        }
    }

    public void record(AuditAction action, String resourceType, String resourceId) {
        record(action, resourceType, resourceId, null);
    }

    private String getCurrentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getName();
        }
        return "system";
    }

    private String getCurrentActorId() {
        return null; // Could be expanded to fetch user ID from UserRepository
    }

    public Page<AuditLog> getLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }

    public Page<AuditLog> getLogsByActor(String actor, Pageable pageable) {
        return auditLogRepository.findByActor(actor, pageable);
    }

    public Page<AuditLog> getLogsByResource(String resourceType, String resourceId, Pageable pageable) {
        return auditLogRepository.findByResourceTypeAndResourceId(resourceType, resourceId, pageable);
    }
}
