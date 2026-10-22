package com.threatlens.dashboard.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class RecentItem {
    private String id;
    private String title;
    private String severity;
    private String status;
    private Instant createdAt;
}
