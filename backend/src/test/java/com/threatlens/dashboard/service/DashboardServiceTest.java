package com.threatlens.dashboard.service;

import com.threatlens.alert.model.AlertStatus;
import com.threatlens.alert.repository.AlertRepository;
import com.threatlens.dashboard.dto.DashboardStats;
import com.threatlens.detection.model.DetectionStatus;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.detection.repository.ThreatDetectionRepository;
import com.threatlens.incident.model.IncidentStatus;
import com.threatlens.incident.repository.IncidentRepository;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.log.repository.SecurityLogRepository;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.repository.DetectionRuleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private SecurityLogRepository logRepo;

    @Mock
    private ThreatDetectionRepository detectionRepo;

    @Mock
    private AlertRepository alertRepo;

    @Mock
    private IncidentRepository incidentRepo;

    @Mock
    private DetectionRuleRepository ruleRepo;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    @DisplayName("Active detection KPI aggregates NEW, ACKNOWLEDGED, and ALERT_CREATED statuses")
    void activeDetectionKpiAggregatesUnresolvedStatuses() {
        when(logRepo.count()).thenReturn(1000L);
        when(logRepo.countByTimestampAfter(any())).thenReturn(250L);
        when(detectionRepo.count()).thenReturn(50L);
        when(alertRepo.count()).thenReturn(10L);
        when(alertRepo.countByStatusIn(any())).thenReturn(7L);
        when(alertRepo.countByStatusInAndSeverity(any(), any())).thenReturn(2L);
        when(incidentRepo.count()).thenReturn(3L);
        when(incidentRepo.countByStatus(IncidentStatus.OPEN)).thenReturn(1L);
        when(incidentRepo.countByStatus(IncidentStatus.INVESTIGATING)).thenReturn(1L);
        when(alertRepo.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(detectionRepo.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        // Active detections mock
        when(detectionRepo.countByStatusIn(any())).thenReturn(18L);

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats).isNotNull();
        assertThat(stats.getOpenDetections()).isEqualTo(18L);
        assertThat(stats.getOpenAlerts()).isEqualTo(7L);

        // Verify countByStatusIn was called with all 3 active statuses
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<DetectionStatus>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(detectionRepo).countByStatusIn(captor.capture());

        Collection<DetectionStatus> statuses = captor.getValue();
        assertThat(statuses).containsExactlyInAnyOrder(
                DetectionStatus.NEW,
                DetectionStatus.ACKNOWLEDGED,
                DetectionStatus.ALERT_CREATED
        );
    }

    @Test
    @DisplayName("Active rules KPI returns count of enabled detection rules")
    void activeRulesKpiReturnsCountOfEnabledRules() {
        when(logRepo.count()).thenReturn(100L);
        when(logRepo.countByTimestampAfter(any())).thenReturn(10L);
        when(detectionRepo.count()).thenReturn(5L);
        when(alertRepo.count()).thenReturn(2L);
        when(incidentRepo.count()).thenReturn(1L);
        when(alertRepo.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(detectionRepo.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        List<DetectionRule> enabledRules = List.of(
                DetectionRule.builder().id("r1").enabled(true).build(),
                DetectionRule.builder().id("r2").enabled(true).build(),
                DetectionRule.builder().id("r3").enabled(true).build(),
                DetectionRule.builder().id("r4").enabled(true).build()
        );
        when(ruleRepo.findByEnabled(true)).thenReturn(enabledRules);

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.getActiveRules()).isEqualTo(4L);
        verify(ruleRepo, times(1)).findByEnabled(true);
    }

    @Test
    @DisplayName("Active alert KPI includes OPEN, ACKNOWLEDGED, and ASSIGNED, excluding RESOLVED and CLOSED")
    void activeAlertCountIncludesOpenAcknowledgedAndAssigned() {
        when(alertRepo.count()).thenReturn(20L);
        when(alertRepo.countByStatusIn(any())).thenReturn(8L);
        when(alertRepo.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(detectionRepo.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats).isNotNull();
        assertThat(stats.getOpenAlerts()).isEqualTo(8L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<AlertStatus>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(alertRepo).countByStatusIn(captor.capture());

        Collection<AlertStatus> activeStatuses = captor.getValue();
        assertThat(activeStatuses).containsExactlyInAnyOrder(
                AlertStatus.OPEN,
                AlertStatus.ACKNOWLEDGED,
                AlertStatus.ASSIGNED
        );
        assertThat(activeStatuses).doesNotContain(AlertStatus.RESOLVED, AlertStatus.CLOSED);
    }

    @Test
    @DisplayName("Critical and High severity KPIs count only active alerts and exclude resolved/closed")
    void activeAlertSeverityKpisCountOnlyActiveAlerts() {
        when(alertRepo.count()).thenReturn(30L);
        when(alertRepo.countByStatusIn(any())).thenReturn(10L);
        when(alertRepo.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(detectionRepo.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        // Stub active severity counts dynamically for all LogSeverity values
        when(alertRepo.countByStatusInAndSeverity(any(), any(LogSeverity.class))).thenAnswer(inv -> {
            LogSeverity sev = inv.getArgument(1);
            if (sev == LogSeverity.CRITICAL) return 3L;
            if (sev == LogSeverity.HIGH) return 5L;
            return 0L;
        });

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.getAlertsBySeverity()).isNotNull();
        assertThat(stats.getAlertsBySeverity().get("CRITICAL")).isEqualTo(3L);
        assertThat(stats.getAlertsBySeverity().get("HIGH")).isEqualTo(5L);

        // Verify active statuses passed to countByStatusInAndSeverity
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<AlertStatus>> statusCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(alertRepo, atLeastOnce()).countByStatusInAndSeverity(statusCaptor.capture(), any());

        Collection<AlertStatus> passedStatuses = statusCaptor.getValue();
        assertThat(passedStatuses).containsExactlyInAnyOrder(
                AlertStatus.OPEN,
                AlertStatus.ACKNOWLEDGED,
                AlertStatus.ASSIGNED
        );
        assertThat(passedStatuses).doesNotContain(AlertStatus.RESOLVED, AlertStatus.CLOSED);
    }
}

