package com.threatlens.detection.controller;

import com.threatlens.common.response.ApiResponse;
import com.threatlens.detection.dto.ThreatDetectionResponse;
import com.threatlens.detection.model.DetectionStatus;
import com.threatlens.detection.model.RiskCategory;
import com.threatlens.detection.service.ThreatDetectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/detections")
@RequiredArgsConstructor
public class ThreatDetectionController {
    private final ThreatDetectionService detectionService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<ThreatDetectionResponse>>> list(
            @RequestParam(required = false) DetectionStatus status,
            @RequestParam(required = false) RiskCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("Detections fetched",
                detectionService.listDetections(status, category,
                        PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "detectedAt")))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ThreatDetectionResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Detection fetched", detectionService.getDetection(id)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<ThreatDetectionResponse>> updateStatus(
            @PathVariable String id, @RequestParam DetectionStatus status) {
        return ResponseEntity.ok(ApiResponse.success("Status updated", detectionService.updateStatus(id, status)));
    }
}
