package com.threatlens.audit.repository;

import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    Page<AuditLog> findByActor(String actor, Pageable pageable);
    Page<AuditLog> findByAction(AuditAction action, Pageable pageable);
    Page<AuditLog> findByTimestampBetween(Instant from, Instant to, Pageable pageable);
    Page<AuditLog> findByResourceTypeAndResourceId(String resourceType, String resourceId, Pageable pageable);
}
