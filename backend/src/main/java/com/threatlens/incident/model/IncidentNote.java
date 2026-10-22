package com.threatlens.incident.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentNote {
    private String id;
    private String author;
    private String content;
    private Instant createdAt;
}
