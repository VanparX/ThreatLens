package com.threatlens.incident.service;

import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.service.AuditService;
import com.threatlens.common.exception.BadRequestException;
import com.threatlens.common.exception.NotFoundException;
import com.threatlens.incident.dto.IncidentNoteRequest;
import com.threatlens.incident.dto.IncidentRequest;
import com.threatlens.incident.dto.IncidentResponse;
import com.threatlens.incident.dto.ResponseActionRequest;
import com.threatlens.incident.model.*;
import com.threatlens.incident.repository.IncidentRepository;
import com.threatlens.log.model.LogSeverity;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncidentServiceTest {

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private IncidentService incidentService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("analyst_jane", "pwd")
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("createIncident initializes status OPEN, stores audit event and returns response")
    void createIncidentSuccess() {
        IncidentRequest req = new IncidentRequest();
        req.setTitle("Suspicious Privilege Escalation");
        req.setDescription("Multiple failed sudo attempts followed by root access");
        req.setSeverity(LogSeverity.CRITICAL);
        req.setAssignedTo("analyst_jane");
        req.setAlertId("alert-999");
        req.setDetectionId("det-888");
        req.setRelatedLogIds(List.of("log-1", "log-2"));

        when(incidentRepository.save(any(Incident.class))).thenAnswer(invocation -> {
            Incident inc = invocation.getArgument(0);
            inc.setId("inc-001");
            inc.setCreatedAt(Instant.now());
            return inc;
        });

        IncidentResponse res = incidentService.createIncident(req);

        assertThat(res).isNotNull();
        assertThat(res.getId()).isEqualTo("inc-001");
        assertThat(res.getTitle()).isEqualTo("Suspicious Privilege Escalation");
        assertThat(res.getStatus()).isEqualTo(IncidentStatus.OPEN);
        assertThat(res.getSeverity()).isEqualTo(LogSeverity.CRITICAL);
        assertThat(res.getCreatedBy()).isEqualTo("analyst_jane");
        assertThat(res.getAlertId()).isEqualTo("alert-999");
        assertThat(res.getDetectionId()).isEqualTo("det-888");
        assertThat(res.getRelatedLogIds()).containsExactly("log-1", "log-2");

        verify(auditService).record(eq(AuditAction.INCIDENT_CREATED), eq("Incident"), eq("inc-001"), any());
    }

    @Test
    @DisplayName("listIncidents dispatches combined status and severity query correctly")
    void listIncidentsFiltering() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Incident> emptyPage = new PageImpl<>(List.of());

        // 1. Both status and severity
        when(incidentRepository.findByStatusAndSeverity(IncidentStatus.OPEN, LogSeverity.HIGH, pageable))
                .thenReturn(emptyPage);
        incidentService.listIncidents(IncidentStatus.OPEN, LogSeverity.HIGH, pageable);
        verify(incidentRepository).findByStatusAndSeverity(IncidentStatus.OPEN, LogSeverity.HIGH, pageable);

        // 2. Status only
        when(incidentRepository.findByStatus(IncidentStatus.OPEN, pageable)).thenReturn(emptyPage);
        incidentService.listIncidents(IncidentStatus.OPEN, null, pageable);
        verify(incidentRepository).findByStatus(IncidentStatus.OPEN, pageable);

        // 3. Severity only
        when(incidentRepository.findBySeverity(LogSeverity.CRITICAL, pageable)).thenReturn(emptyPage);
        incidentService.listIncidents(null, LogSeverity.CRITICAL, pageable);
        verify(incidentRepository).findBySeverity(LogSeverity.CRITICAL, pageable);

        // 4. No filters
        when(incidentRepository.findAll(pageable)).thenReturn(emptyPage);
        incidentService.listIncidents(null, null, pageable);
        verify(incidentRepository).findAll(pageable);
    }

    @Test
    @DisplayName("getIncidentByAlertId returns matched incident or throws NotFoundException")
    void getIncidentByAlertId() {
        Incident inc = Incident.builder()
                .id("inc-123")
                .alertId("alert-456")
                .title("Alert Escalation")
                .status(IncidentStatus.OPEN)
                .build();

        when(incidentRepository.findByAlertId("alert-456")).thenReturn(Optional.of(inc));
        when(incidentRepository.findByAlertId("alert-unknown")).thenReturn(Optional.empty());

        IncidentResponse found = incidentService.getIncidentByAlertId("alert-456");
        assertThat(found.getId()).isEqualTo("inc-123");

        assertThatThrownBy(() -> incidentService.getIncidentByAlertId("alert-unknown"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Incident not found for alert");
    }

    @Test
    @DisplayName("updateStatus progresses from OPEN -> INVESTIGATING -> CONTAINED -> RESOLVED -> CLOSED")
    void updateStatusValidProgression() {
        Incident inc = Incident.builder()
                .id("inc-100")
                .status(IncidentStatus.OPEN)
                .notes(new ArrayList<>())
                .responseActions(new ArrayList<>())
                .build();

        when(incidentRepository.findById("inc-100")).thenReturn(Optional.of(inc));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(i -> i.getArgument(0));

        // OPEN -> INVESTIGATING
        IncidentResponse r1 = incidentService.updateStatus("inc-100", IncidentStatus.INVESTIGATING, null);
        assertThat(r1.getStatus()).isEqualTo(IncidentStatus.INVESTIGATING);

        // INVESTIGATING -> CONTAINED
        IncidentResponse r2 = incidentService.updateStatus("inc-100", IncidentStatus.CONTAINED, null);
        assertThat(r2.getStatus()).isEqualTo(IncidentStatus.CONTAINED);
        assertThat(r2.getContainedAt()).isNotNull();

        // CONTAINED -> RESOLVED
        IncidentResponse r3 = incidentService.updateStatus("inc-100", IncidentStatus.RESOLVED, "Contained and isolated");
        assertThat(r3.getStatus()).isEqualTo(IncidentStatus.RESOLVED);
        assertThat(r3.getResolvedAt()).isNotNull();
        assertThat(r3.getResolutionSummary()).isEqualTo("Contained and isolated");

        // RESOLVED -> CLOSED
        IncidentResponse r4 = incidentService.updateStatus("inc-100", IncidentStatus.CLOSED, null);
        assertThat(r4.getStatus()).isEqualTo(IncidentStatus.CLOSED);
        assertThat(r4.getClosedAt()).isNotNull();
    }

    @Test
    @DisplayName("updateStatus allows transitioning back to OPEN from later states")
    void updateStatusAllowsReopen() {
        Incident inc = Incident.builder()
                .id("inc-101")
                .status(IncidentStatus.RESOLVED)
                .notes(new ArrayList<>())
                .responseActions(new ArrayList<>())
                .build();

        when(incidentRepository.findById("inc-101")).thenReturn(Optional.of(inc));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(i -> i.getArgument(0));

        IncidentResponse res = incidentService.updateStatus("inc-101", IncidentStatus.OPEN, null);
        assertThat(res.getStatus()).isEqualTo(IncidentStatus.OPEN);
    }

    @Test
    @DisplayName("updateStatus rejects transitioning from CLOSED status")
    void updateStatusRejectsFromClosed() {
        Incident inc = Incident.builder()
                .id("inc-102")
                .status(IncidentStatus.CLOSED)
                .build();

        when(incidentRepository.findById("inc-102")).thenReturn(Optional.of(inc));

        assertThatThrownBy(() -> incidentService.updateStatus("inc-102", IncidentStatus.OPEN, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot transition from CLOSED status");
    }

    @Test
    @DisplayName("updateStatus rejects invalid backward non-OPEN transitions")
    void updateStatusRejectsInvalidBackwardTransition() {
        Incident inc = Incident.builder()
                .id("inc-103")
                .status(IncidentStatus.CONTAINED)
                .build();

        when(incidentRepository.findById("inc-103")).thenReturn(Optional.of(inc));

        assertThatThrownBy(() -> incidentService.updateStatus("inc-103", IncidentStatus.INVESTIGATING, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid status transition");
    }

    @Test
    @DisplayName("assign analyst updates assignee and records audit action")
    void assignAnalyst() {
        Incident inc = Incident.builder()
                .id("inc-200")
                .assignedTo("analyst_mike")
                .build();

        when(incidentRepository.findById("inc-200")).thenReturn(Optional.of(inc));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(i -> i.getArgument(0));

        IncidentResponse res = incidentService.assign("inc-200", "analyst_sarah");

        assertThat(res.getAssignedTo()).isEqualTo("analyst_sarah");
        verify(auditService).record(eq(AuditAction.INCIDENT_ASSIGNED), eq("Incident"), eq("inc-200"), any());
    }

    @Test
    @DisplayName("addNote appends new note with author and timestamp, preserving existing notes")
    void addNotePreservesExisting() {
        IncidentNote existingNote = IncidentNote.builder()
                .id("n-1")
                .author("analyst_mike")
                .content("Initial triage")
                .createdAt(Instant.now().minusSeconds(3600))
                .build();

        Incident inc = Incident.builder()
                .id("inc-300")
                .notes(new ArrayList<>(List.of(existingNote)))
                .build();

        when(incidentRepository.findById("inc-300")).thenReturn(Optional.of(inc));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(i -> i.getArgument(0));

        IncidentNoteRequest req = new IncidentNoteRequest();
        req.setContent("Found suspicious reverse shell on port 4444");

        IncidentResponse res = incidentService.addNote("inc-300", req);

        assertThat(res.getNotes()).hasSize(2);
        assertThat(res.getNotes().get(0).getContent()).isEqualTo("Initial triage");
        assertThat(res.getNotes().get(1).getContent()).isEqualTo("Found suspicious reverse shell on port 4444");
        assertThat(res.getNotes().get(1).getAuthor()).isEqualTo("analyst_jane");
        assertThat(res.getNotes().get(1).getCreatedAt()).isNotNull();

        verify(auditService).record(eq(AuditAction.INCIDENT_NOTE_ADDED), eq("Incident"), eq("inc-300"), any());
    }

    @Test
    @DisplayName("addResponseAction records simulated response action with completed status")
    void addResponseActionSimulated() {
        Incident inc = Incident.builder()
                .id("inc-400")
                .responseActions(new ArrayList<>())
                .build();

        when(incidentRepository.findById("inc-400")).thenReturn(Optional.of(inc));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(i -> i.getArgument(0));

        ResponseActionRequest req = new ResponseActionRequest();
        req.setActionType("HOST_ISOLATION");
        req.setTarget("host-prod-db-01");
        req.setDescription("Quarantine network access via software firewall rules");

        IncidentResponse res = incidentService.addResponseAction("inc-400", req);

        assertThat(res.getResponseActions()).hasSize(1);
        ResponseAction act = res.getResponseActions().get(0);
        assertThat(act.getActionType()).isEqualTo("HOST_ISOLATION");
        assertThat(act.getTarget()).isEqualTo("host-prod-db-01");
        assertThat(act.getMode()).isEqualTo(ResponseActionMode.SIMULATED);
        assertThat(act.getStatus()).isEqualTo(ResponseActionStatus.COMPLETED);
        assertThat(act.getPerformedBy()).isEqualTo("analyst_jane");
        assertThat(act.getPerformedAt()).isNotNull();

        verify(auditService).record(eq(AuditAction.RESPONSE_ACTION_RECORDED), eq("Incident"), eq("inc-400"), any());
    }
}

