package com.threatlens.dashboard.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data @Builder
public class DashboardStats {
    private long totalLogs;
    private long logsLast24h;
    private long totalDetections;
    private long openDetections;
    private long totalAlerts;
    private long openAlerts;
    private long totalIncidents;
    private long openIncidents;
    private long activeRules;
    private Map<String, Long> alertsBySeverity;
    private Map<String, Long> detectionsByCategory;
    private Map<String, Long> incidentsByStatus;
    private List<RecentItem> recentAlerts;
    private List<RecentItem> recentDetections;
}
