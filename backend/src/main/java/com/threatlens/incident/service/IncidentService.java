package com.threatlens.incident.service;

import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.service.AuditService;
import com.threatlens.common.exception.BadRequestException;
import com.threatlens.common.exception.NotFoundException;
import com.threatlens.incident.dto.*;
import com.threatlens.incident.model.*;
import com.threatlens.incident.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final AuditService auditService;

    public IncidentResponse createIncident(IncidentRequest request) {
        Incident incident = Incident.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .severity(request.getSeverity())
                .status(IncidentStatus.OPEN)
                .assignedTo(request.getAssignedTo())
                .createdBy(currentUser())
                .alertId(request.getAlertId())
                .detectionId(request.getDetectionId())
                .relatedLogIds(request.getRelatedLogIds())
                .notes(new ArrayList<>())
                .responseActions(new ArrayList<>())
                .build();

        Incident saved = incidentRepository.save(incident);
        auditService.record(AuditAction.INCIDENT_CREATED, "Incident", saved.getId(),
                Map.of("title", saved.getTitle(), "severity", saved.getSeverity()));
        return toResponse(saved);
    }

    public Page<IncidentResponse> listIncidents(IncidentStatus status, Pageable pageable) {
        if (status != null) return incidentRepository.findByStatus(status, pageable).map(this::toResponse);
        return incidentRepository.findAll(pageable).map(this::toResponse);
    }

    public IncidentResponse getIncident(String id) {
        return toResponse(findById(id));
    }

    public IncidentResponse updateStatus(String id, IncidentStatus newStatus, String resolutionSummary) {
        Incident incident = findById(id);
        validateStatusTransition(incident.getStatus(), newStatus);

        IncidentStatus old = incident.getStatus();
        incident.setStatus(newStatus);

        switch (newStatus) {
            case CONTAINED -> incident.setContainedAt(Instant.now());
            case RESOLVED -> {
                incident.setResolvedAt(Instant.now());
                if (resolutionSummary != null) incident.setResolutionSummary(resolutionSummary);
            }
            case CLOSED -> incident.setClosedAt(Instant.now());
            default -> {}
        }

        Incident saved = incidentRepository.save(incident);
        auditService.record(AuditAction.INCIDENT_STATUS_CHANGED, "Incident", id,
                Map.of("from", old, "to", newStatus, "by", currentUser()));
        return toResponse(saved);
    }

    public IncidentResponse assign(String id, String analyst) {
        Incident incident = findById(id);
        incident.setAssignedTo(analyst);
        Incident saved = incidentRepository.save(incident);
        auditService.record(AuditAction.INCIDENT_ASSIGNED, "Incident", id, Map.of("assignedTo", analyst));
        return toResponse(saved);
    }

    public IncidentResponse addNote(String id, IncidentNoteRequest request) {
        Incident incident = findById(id);
        if (incident.getNotes() == null) incident.setNotes(new ArrayList<>());

        IncidentNote note = IncidentNote.builder()
                .id(UUID.randomUUID().toString())
                .author(currentUser())
                .content(request.getContent())
                .createdAt(Instant.now())
                .build();

        incident.getNotes().add(note);
        Incident saved = incidentRepository.save(incident);
        auditService.record(AuditAction.INCIDENT_NOTE_ADDED, "Incident", id, Map.of("author", currentUser()));
        return toResponse(saved);
    }

    public IncidentResponse addResponseAction(String id, ResponseActionRequest request) {
        Incident incident = findById(id);
        if (incident.getResponseActions() == null) incident.setResponseActions(new ArrayList<>());

        ResponseAction action = ResponseAction.builder()
                .id(UUID.randomUUID().toString())
                .actionType(request.getActionType())
                .target(request.getTarget())
                .description(request.getDescription())
                .performedBy(currentUser())
                .mode(ResponseActionMode.SIMULATED) // Always simulated — no real external execution
                .status(ResponseActionStatus.COMPLETED)
                .result("Recorded as simulated action. No external system was modified.")
                .performedAt(Instant.now())
                .build();

        incident.getResponseActions().add(action);
        Incident saved = incidentRepository.save(incident);
        auditService.record(AuditAction.RESPONSE_ACTION_RECORDED, "Incident", id,
                Map.of("actionType", action.getActionType(), "target", action.getTarget(), "mode", "SIMULATED"));
        return toResponse(saved);
    }

    private void validateStatusTransition(IncidentStatus from, IncidentStatus to) {
        if (from == IncidentStatus.CLOSED) {
            throw new BadRequestException("Cannot transition from CLOSED status");
        }
        // Basic ordering check
        int fromOrd = from.ordinal(), toOrd = to.ordinal();
        if (toOrd < fromOrd && to != IncidentStatus.OPEN) {
            throw new BadRequestException("Invalid status transition: " + from + " → " + to);
        }
    }

    private Incident findById(String id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Incident not found: " + id));
    }

    private String currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private IncidentResponse toResponse(Incident i) {
        return IncidentResponse.builder()
                .id(i.getId()).title(i.getTitle()).description(i.getDescription())
                .severity(i.getSeverity()).status(i.getStatus()).assignedTo(i.getAssignedTo())
                .createdBy(i.getCreatedBy()).alertId(i.getAlertId()).detectionId(i.getDetectionId())
                .relatedLogIds(i.getRelatedLogIds()).notes(i.getNotes())
                .responseActions(i.getResponseActions()).resolutionSummary(i.getResolutionSummary())
                .containedAt(i.getContainedAt()).resolvedAt(i.getResolvedAt()).closedAt(i.getClosedAt())
                .createdAt(i.getCreatedAt()).updatedAt(i.getUpdatedAt())
                .build();
    }
}
