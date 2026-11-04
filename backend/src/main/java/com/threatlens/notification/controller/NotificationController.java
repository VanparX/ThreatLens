package com.threatlens.notification.controller;

import com.threatlens.common.response.ApiResponse;
import com.threatlens.notification.dto.NotificationSettingsDto;
import com.threatlens.notification.dto.TestNotificationRequest;
import com.threatlens.notification.model.NotificationRecord;
import com.threatlens.notification.model.NotificationSettings;
import com.threatlens.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<NotificationSettings>> getSettings() {
        return ResponseEntity.ok(ApiResponse.success("Notification settings fetched", notificationService.getSettings()));
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NotificationSettings>> updateSettings(@Valid @RequestBody NotificationSettingsDto dto) {
        return ResponseEntity.ok(ApiResponse.success("Notification settings updated successfully", notificationService.updateSettings(dto)));
    }

    @PostMapping("/test")
    @PreAuthorize("hasAnyRole('ADMIN', 'SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<NotificationRecord>> testNotification(@Valid @RequestBody TestNotificationRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Test notification dispatched", notificationService.sendTestNotification(req)));
    }

    @GetMapping("/records")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<NotificationRecord>>> listRecords(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Notification audit logs fetched", notificationService.listRecords(pageable)));
    }
}
