package com.threatlens.log.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Document(collection = "security_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndexes({
    @CompoundIndex(name = "timestamp_severity", def = "{'timestamp': -1, 'severity': 1}"),
    @CompoundIndex(name = "source_ip_timestamp", def = "{'sourceIp': 1, 'timestamp': -1}")
})
public class SecurityLog {
    @Id
    private String id;

    @Indexed
    private Instant timestamp;

    private String sourceIp;

    private String destinationIp;

    @Indexed
    private LogEventType eventType;

    @Indexed
    private LogSeverity severity;

    private String sourceSystem;

    private String message;

    private Map<String, Object> metadata;

    @CreatedDate
    private Instant ingestedAt;

    private boolean processed;
}
