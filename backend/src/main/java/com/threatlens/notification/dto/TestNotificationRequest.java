package com.threatlens.notification.dto;

import com.threatlens.notification.model.NotificationChannel;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestNotificationRequest {

    @NotNull
    private NotificationChannel channel;

    private String targetRecipient;
    private String customMessage;
}
