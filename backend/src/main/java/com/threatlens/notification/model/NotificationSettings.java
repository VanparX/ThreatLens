package com.threatlens.notification.model;

import com.threatlens.log.model.LogSeverity;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "notification_settings")
public class NotificationSettings {

    @Id
    private String id;

    @Builder.Default
    private boolean emailEnabled = true;

    @Builder.Default
    private boolean smsEnabled = true;

    @Builder.Default
    private String recipientEmail = "soc-alerts@threatlens.io";

    @Builder.Default
    private String recipientPhone = "+15550192834";

    @Builder.Default
    private LogSeverity minSeverity = LogSeverity.HIGH;

    @Builder.Default
    private String webhookUrl = "";

    @Builder.Default
    private boolean webhookEnabled = false;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
