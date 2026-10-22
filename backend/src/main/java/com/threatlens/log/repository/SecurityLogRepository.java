package com.threatlens.log.repository;

import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.model.SecurityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface SecurityLogRepository extends MongoRepository<SecurityLog, String> {
    Page<SecurityLog> findBySeverity(LogSeverity severity, Pageable pageable);
    Page<SecurityLog> findByEventType(LogEventType eventType, Pageable pageable);
    Page<SecurityLog> findBySourceIp(String sourceIp, Pageable pageable);
    Page<SecurityLog> findByTimestampBetween(Instant from, Instant to, Pageable pageable);
    long countBySeverity(LogSeverity severity);
    long countByTimestampAfter(Instant after);
    long countByProcessed(boolean processed);
}
