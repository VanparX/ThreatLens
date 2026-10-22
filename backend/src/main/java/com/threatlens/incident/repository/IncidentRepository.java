package com.threatlens.incident.repository;

import com.threatlens.incident.model.Incident;
import com.threatlens.incident.model.IncidentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IncidentRepository extends MongoRepository<Incident, String> {
    Page<Incident> findByStatus(IncidentStatus status, Pageable pageable);
    Optional<Incident> findByAlertId(String alertId);
    long countByStatus(IncidentStatus status);
}
