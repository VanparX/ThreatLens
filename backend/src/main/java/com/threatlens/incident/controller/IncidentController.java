package com.threatlens.incident.controller;

import com.threatlens.common.response.ApiResponse;
import com.threatlens.incident.dto.*;
import com.threatlens.incident.model.IncidentStatus;
import com.threatlens.incident.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentController {
    private final IncidentService incidentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<IncidentResponse>> create(@Valid @RequestBody IncidentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Incident created", incidentService.createIncident(req)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<IncidentResponse>>> list(
            @RequestParam(required = false) IncidentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("Incidents fetched",
                incidentService.listIncidents(status, PageRequest.of(page, Math.min(size, 100),
                        Sort.by(Sort.Direction.DESC, "createdAt")))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<IncidentResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Incident fetched", incidentService.getIncident(id)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<IncidentResponse>> updateStatus(
            @PathVariable String id, @RequestParam IncidentStatus status,
            @RequestParam(required = false) String resolutionSummary) {
        return ResponseEntity.ok(ApiResponse.success("Status updated",
                incidentService.updateStatus(id, status, resolutionSummary)));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<IncidentResponse>> assign(
            @PathVariable String id, @RequestParam String analyst) {
        return ResponseEntity.ok(ApiResponse.success("Assigned", incidentService.assign(id, analyst)));
    }

    @PostMapping("/{id}/notes")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<IncidentResponse>> addNote(
            @PathVariable String id, @Valid @RequestBody IncidentNoteRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Note added", incidentService.addNote(id, req)));
    }

    @PostMapping("/{id}/actions")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<IncidentResponse>> addAction(
            @PathVariable String id, @Valid @RequestBody ResponseActionRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Action recorded", incidentService.addResponseAction(id, req)));
    }
}
