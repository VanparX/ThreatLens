package com.threatlens.notification.dto;

import com.threatlens.log.model.LogSeverity;
import jakarta.validation.constraints.Email;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationSettingsDto {
    private boolean emailEnabled;
    private boolean smsEnabled;
    private boolean webhookEnabled;

    @Email
    private String recipientEmail;
    private String recipientPhone;
    private String webhookUrl;
    private LogSeverity minSeverity;
}
