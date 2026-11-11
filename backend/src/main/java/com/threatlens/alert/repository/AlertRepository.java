package com.threatlens.alert.repository;

import com.threatlens.alert.model.Alert;
import com.threatlens.alert.model.AlertStatus;
import com.threatlens.log.model.LogSeverity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface AlertRepository extends MongoRepository<Alert, String> {
    Page<Alert> findByStatus(AlertStatus status, Pageable pageable);
    Page<Alert> findBySeverity(LogSeverity severity, Pageable pageable);
    Page<Alert> findByStatusAndSeverity(AlertStatus status, LogSeverity severity, Pageable pageable);
    Optional<Alert> findByDetectionId(String detectionId);
    long countByStatus(AlertStatus status);
    long countByStatusIn(Collection<AlertStatus> statuses);
    long countBySeverity(LogSeverity severity);
    long countByStatusInAndSeverity(Collection<AlertStatus> statuses, LogSeverity severity);
    boolean existsByDetectionId(String detectionId);
}
