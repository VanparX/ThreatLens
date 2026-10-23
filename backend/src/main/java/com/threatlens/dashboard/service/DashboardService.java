package com.threatlens.dashboard.service;

import com.threatlens.alert.model.AlertStatus;
import com.threatlens.alert.repository.AlertRepository;
import com.threatlens.dashboard.dto.DashboardStats;
import com.threatlens.dashboard.dto.RecentItem;
import com.threatlens.detection.model.DetectionStatus;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.detection.repository.ThreatDetectionRepository;
import com.threatlens.incident.model.IncidentStatus;
import com.threatlens.incident.repository.IncidentRepository;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.repository.SecurityLogRepository;
import com.threatlens.rule.repository.DetectionRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final SecurityLogRepository logRepo;
    private final ThreatDetectionRepository detectionRepo;
    private final AlertRepository alertRepo;
    private final IncidentRepository incidentRepo;
    private final DetectionRuleRepository ruleRepo;

    public DashboardStats getStats() {
        Instant yesterday = Instant.now().minus(24, ChronoUnit.HOURS);

        Map<String, Long> alertsBySeverity = new LinkedHashMap<>();
        for (LogSeverity sev : LogSeverity.values()) {
            alertsBySeverity.put(sev.name(), alertRepo.countBySeverity(sev));
        }

        Map<String, Long> detectionsByCategory = Arrays.stream(RiskCategory.values())
                .collect(Collectors.toMap(Enum::name, detectionRepo::countByRiskCategory, (a, b) -> a, LinkedHashMap::new));

        Map<String, Long> incidentsByStatus = Arrays.stream(IncidentStatus.values())
                .collect(Collectors.toMap(Enum::name, incidentRepo::countByStatus, (a, b) -> a, LinkedHashMap::new));

        List<RecentItem> recentAlerts = alertRepo.findAll(
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))).stream()
                .map(a -> RecentItem.builder().id(a.getId()).title(a.getTitle())
                        .severity(a.getSeverity() != null ? a.getSeverity().name() : null)
                        .status(a.getStatus().name()).createdAt(a.getCreatedAt()).build())
                .collect(Collectors.toList());

        List<RecentItem> recentDetections = detectionRepo.findAll(
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "detectedAt"))).stream()
                .map(d -> RecentItem.builder().id(d.getId()).title(d.getRuleName())
                        .severity(d.getSeverity() != null ? d.getSeverity().name() : null)
                        .status(d.getStatus().name()).createdAt(d.getDetectedAt()).build())
                .collect(Collectors.toList());

        return DashboardStats.builder()
                .totalLogs(logRepo.count())
                .logsLast24h(logRepo.countByTimestampAfter(yesterday))
                .totalDetections(detectionRepo.count())
                .openDetections(detectionRepo.countByStatus(DetectionStatus.NEW))
                .totalAlerts(alertRepo.count())
                .openAlerts(alertRepo.countByStatus(AlertStatus.OPEN) + alertRepo.countByStatus(AlertStatus.ACKNOWLEDGED))
                .totalIncidents(incidentRepo.count())
                .openIncidents(incidentRepo.countByStatus(IncidentStatus.OPEN) + incidentRepo.countByStatus(IncidentStatus.INVESTIGATING))
                .activeRules(ruleRepo.findByEnabled(true).size())
                .alertsBySeverity(alertsBySeverity)
                .detectionsByCategory(detectionsByCategory)
                .incidentsByStatus(incidentsByStatus)
                .recentAlerts(recentAlerts)
                .recentDetections(recentDetections)
                .build();
    }
}
