package com.threatlens.incident.repository;

import com.threatlens.incident.model.Incident;
import com.threatlens.incident.model.IncidentStatus;
import com.threatlens.log.model.LogSeverity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IncidentRepository extends MongoRepository<Incident, String> {
    Page<Incident> findByStatus(IncidentStatus status, Pageable pageable);
    Page<Incident> findBySeverity(LogSeverity severity, Pageable pageable);
    Page<Incident> findByStatusAndSeverity(IncidentStatus status, LogSeverity severity, Pageable pageable);
    Optional<Incident> findByAlertId(String alertId);
    boolean existsByAlertId(String alertId);
    long countByStatus(IncidentStatus status);
}
