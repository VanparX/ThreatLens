package com.threatlens.notification.model;

import com.threatlens.log.model.LogSeverity;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "notification_records")
public class NotificationRecord {

    @Id
    private String id;

    private String alertId;
    private NotificationChannel channel;
    private String recipient;
    private String subject;
    private String content;
    private LogSeverity severity;
    private NotificationStatus status;
    private Instant sentAt;
    private String details;

    @CreatedDate
    private Instant createdAt;
}
