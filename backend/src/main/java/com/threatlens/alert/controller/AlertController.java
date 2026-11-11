package com.threatlens.alert.controller;

import com.threatlens.alert.dto.AlertResponse;
import com.threatlens.alert.dto.AlertUpdateRequest;
import com.threatlens.alert.model.AlertStatus;
import com.threatlens.alert.service.AlertService;
import com.threatlens.common.response.ApiResponse;
import com.threatlens.log.model.LogSeverity;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {
    private final AlertService alertService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<AlertResponse>>> list(
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(required = false) LogSeverity severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("Alerts fetched",
                alertService.listAlerts(status, severity, PageRequest.of(page, Math.min(size, 100),
                        Sort.by(Sort.Direction.DESC, "createdAt")))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AlertResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Alert fetched", alertService.getAlert(id)));
    }

    @GetMapping("/by-detection/{detectionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AlertResponse>> getByDetection(@PathVariable String detectionId) {
        return ResponseEntity.ok(ApiResponse.success("Alert fetched", alertService.getAlertByDetectionId(detectionId)));
    }

    @PutMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<AlertResponse>> acknowledge(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Alert acknowledged", alertService.acknowledge(id)));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<AlertResponse>> assign(
            @PathVariable String id, @RequestParam String analyst) {
        return ResponseEntity.ok(ApiResponse.success("Alert assigned", alertService.assign(id, analyst)));
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<AlertResponse>> resolve(
            @PathVariable String id, @RequestBody(required = false) AlertUpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Alert resolved",
                alertService.resolve(id, req != null ? req : new AlertUpdateRequest())));
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<AlertResponse>> close(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Alert closed", alertService.close(id)));
    }
}
