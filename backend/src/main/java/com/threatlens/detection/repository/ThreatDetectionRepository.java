package com.threatlens.detection.repository;

import com.threatlens.detection.model.DetectionStatus;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.detection.model.ThreatDetection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface ThreatDetectionRepository extends MongoRepository<ThreatDetection, String> {
    Optional<ThreatDetection> findByLogIdAndRuleId(String logId, String ruleId);
    Page<ThreatDetection> findByStatus(DetectionStatus status, Pageable pageable);
    Page<ThreatDetection> findByRiskCategory(RiskCategory category, Pageable pageable);
    Page<ThreatDetection> findByStatusAndRiskCategory(DetectionStatus status, RiskCategory category, Pageable pageable);
    long countByStatus(DetectionStatus status);
    long countByStatusIn(Collection<DetectionStatus> statuses);
    long countByRiskCategory(RiskCategory category);
    long countByDetectedAtAfter(Instant after);
}
