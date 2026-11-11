package com.threatlens.rule.service;

import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.service.AuditService;
import com.threatlens.common.exception.BadRequestException;
import com.threatlens.common.exception.ConflictException;
import com.threatlens.common.exception.NotFoundException;
import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.rule.dto.DetectionRuleRequest;
import com.threatlens.rule.dto.DetectionRuleResponse;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.model.RuleCondition;
import com.threatlens.rule.model.RuleType;
import com.threatlens.rule.repository.DetectionRuleRepository;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DetectionRuleServiceTest {

    @Mock
    private DetectionRuleRepository ruleRepository;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private DetectionRuleService ruleService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("soc_analyst", "pwd")
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("createRule saves valid rule, assigns user, and audits creation")
    void createRuleSuccess() {
        DetectionRuleRequest req = new DetectionRuleRequest();
        req.setName("SSH Brute Force Detection");
        req.setDescription("Threshold-based detection for SSH auth failures");
        req.setType(RuleType.THRESHOLD);
        req.setSeverity(LogSeverity.HIGH);
        req.setEnabled(true);
        req.setCondition(RuleCondition.builder()
                .thresholdCount(5)
                .thresholdWindowSeconds(300)
                .groupBySourceIp(true)
                .eventTypes(List.of(LogEventType.AUTHENTICATION_FAILURE))
                .build());

        when(ruleRepository.existsByName(req.getName())).thenReturn(false);
        when(ruleRepository.save(any(DetectionRule.class))).thenAnswer(inv -> {
            DetectionRule r = inv.getArgument(0);
            r.setId("rule-001");
            r.setCreatedAt(Instant.now());
            return r;
        });

        DetectionRuleResponse res = ruleService.createRule(req);

        assertThat(res).isNotNull();
        assertThat(res.getId()).isEqualTo("rule-001");
        assertThat(res.getName()).isEqualTo("SSH Brute Force Detection");
        assertThat(res.getType()).isEqualTo(RuleType.THRESHOLD);
        assertThat(res.getSeverity()).isEqualTo(LogSeverity.HIGH);
        assertThat(res.isEnabled()).isTrue();
        assertThat(res.getCondition().getThresholdCount()).isEqualTo(5);
        assertThat(res.getCreatedBy()).isEqualTo("soc_analyst");

        verify(auditService).record(eq(AuditAction.RULE_CREATED), eq("DetectionRule"), eq("rule-001"), any());
    }

    @Test
    @DisplayName("createRule rejects duplicate rule name with ConflictException")
    void createRuleDuplicateName() {
        DetectionRuleRequest req = new DetectionRuleRequest();
        req.setName("Existing Rule");
        req.setType(RuleType.EVENT_TYPE_MATCH);
        req.setCondition(RuleCondition.builder().eventTypes(List.of(LogEventType.PORT_SCAN)).build());

        when(ruleRepository.existsByName("Existing Rule")).thenReturn(true);

        assertThatThrownBy(() -> ruleService.createRule(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("validateCondition enforces rule type specific constraints")
    void validateConditionConstraints() {
        // THRESHOLD requires thresholdCount >= 1 and thresholdWindowSeconds >= 1
        DetectionRuleRequest reqThresh = new DetectionRuleRequest();
        reqThresh.setName("Invalid Threshold");
        reqThresh.setType(RuleType.THRESHOLD);
        reqThresh.setCondition(RuleCondition.builder().thresholdCount(0).thresholdWindowSeconds(60).build());

        assertThatThrownBy(() -> ruleService.createRule(reqThresh))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("thresholdCount >= 1");

        // PATTERN_MATCH requires at least one pattern
        DetectionRuleRequest reqPattern = new DetectionRuleRequest();
        reqPattern.setName("Invalid Pattern");
        reqPattern.setType(RuleType.PATTERN_MATCH);
        reqPattern.setCondition(RuleCondition.builder().patterns(List.of()).build());

        assertThatThrownBy(() -> ruleService.createRule(reqPattern))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("at least one pattern");

        // IP_MATCH requires at least one IP
        DetectionRuleRequest reqIp = new DetectionRuleRequest();
        reqIp.setName("Invalid IP");
        reqIp.setType(RuleType.IP_MATCH);
        reqIp.setCondition(RuleCondition.builder().ipAddresses(null).build());

        assertThatThrownBy(() -> ruleService.createRule(reqIp))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("at least one IP address");

        // EVENT_TYPE_MATCH requires at least one event type
        DetectionRuleRequest reqEvent = new DetectionRuleRequest();
        reqEvent.setName("Invalid Event Type");
        reqEvent.setType(RuleType.EVENT_TYPE_MATCH);
        reqEvent.setCondition(RuleCondition.builder().eventTypes(List.of()).build());

        assertThatThrownBy(() -> ruleService.createRule(reqEvent))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("at least one event type");
    }

    @Test
    @DisplayName("listRules dispatches enabled, type and combined repository queries")
    void listRulesFiltering() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<DetectionRule> emptyPage = new PageImpl<>(List.of());

        // Enabled and type
        when(ruleRepository.findByEnabledAndType(true, RuleType.THRESHOLD, pageable)).thenReturn(emptyPage);
        ruleService.listRules(true, RuleType.THRESHOLD, pageable);
        verify(ruleRepository).findByEnabledAndType(true, RuleType.THRESHOLD, pageable);

        // Enabled only
        when(ruleRepository.findByEnabled(false, pageable)).thenReturn(emptyPage);
        ruleService.listRules(false, null, pageable);
        verify(ruleRepository).findByEnabled(false, pageable);

        // Type only
        when(ruleRepository.findByType(RuleType.IP_MATCH, pageable)).thenReturn(emptyPage);
        ruleService.listRules(null, RuleType.IP_MATCH, pageable);
        verify(ruleRepository).findByType(RuleType.IP_MATCH, pageable);

        // No filters
        when(ruleRepository.findAll(pageable)).thenReturn(emptyPage);
        ruleService.listRules(null, null, pageable);
        verify(ruleRepository).findAll(pageable);
    }

    @Test
    @DisplayName("getRuleStats returns accurate total, enabled, and disabled counts")
    void getRuleStats() {
        when(ruleRepository.count()).thenReturn(10L);
        when(ruleRepository.countByEnabled(true)).thenReturn(8L);

        Map<String, Long> stats = ruleService.getRuleStats();

        assertThat(stats.get("totalRules")).isEqualTo(10L);
        assertThat(stats.get("enabledRules")).isEqualTo(8L);
        assertThat(stats.get("disabledRules")).isEqualTo(2L);
    }

    @Test
    @DisplayName("updateRule updates fields, validates condition, and prevents duplicate rename")
    void updateRuleSuccessAndConflict() {
        DetectionRule existing = DetectionRule.builder()
                .id("rule-100")
                .name("Original Rule Name")
                .type(RuleType.EVENT_TYPE_MATCH)
                .condition(RuleCondition.builder().eventTypes(List.of(LogEventType.SQL_INJECTION)).build())
                .severity(LogSeverity.MEDIUM)
                .enabled(true)
                .build();

        when(ruleRepository.findById("rule-100")).thenReturn(Optional.of(existing));
        when(ruleRepository.save(any(DetectionRule.class))).thenAnswer(inv -> inv.getArgument(0));

        // Successful update with same name
        DetectionRuleRequest updateReq = new DetectionRuleRequest();
        updateReq.setName("Original Rule Name");
        updateReq.setDescription("Updated description");
        updateReq.setType(RuleType.EVENT_TYPE_MATCH);
        updateReq.setCondition(RuleCondition.builder().eventTypes(List.of(LogEventType.SQL_INJECTION)).build());
        updateReq.setSeverity(LogSeverity.CRITICAL);
        updateReq.setEnabled(false);

        DetectionRuleResponse res = ruleService.updateRule("rule-100", updateReq);
        assertThat(res.getSeverity()).isEqualTo(LogSeverity.CRITICAL);
        assertThat(res.isEnabled()).isFalse();
        assertThat(res.getDescription()).isEqualTo("Updated description");

        // Conflict when renaming to an existing name
        when(ruleRepository.existsByName("Taken Name")).thenReturn(true);
        DetectionRuleRequest conflictReq = new DetectionRuleRequest();
        conflictReq.setName("Taken Name");
        conflictReq.setType(RuleType.EVENT_TYPE_MATCH);
        conflictReq.setCondition(RuleCondition.builder().eventTypes(List.of(LogEventType.SQL_INJECTION)).build());

        assertThatThrownBy(() -> ruleService.updateRule("rule-100", conflictReq))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("setEnabled enables or disables rule and records audit events")
    void setEnabled() {
        DetectionRule rule = DetectionRule.builder()
                .id("rule-200")
                .name("Toggle Rule")
                .enabled(true)
                .build();

        when(ruleRepository.findById("rule-200")).thenReturn(Optional.of(rule));
        when(ruleRepository.save(any(DetectionRule.class))).thenAnswer(inv -> inv.getArgument(0));

        // Disable
        DetectionRuleResponse disabled = ruleService.setEnabled("rule-200", false);
        assertThat(disabled.isEnabled()).isFalse();
        verify(auditService).record(eq(AuditAction.RULE_DISABLED), eq("DetectionRule"), eq("rule-200"), any());

        // Enable
        DetectionRuleResponse enabled = ruleService.setEnabled("rule-200", true);
        assertThat(enabled.isEnabled()).isTrue();
        verify(auditService).record(eq(AuditAction.RULE_ENABLED), eq("DetectionRule"), eq("rule-200"), any());
    }

    @Test
    @DisplayName("deleteRule deletes entity from repository and records RULE_DELETED audit")
    void deleteRule() {
        DetectionRule rule = DetectionRule.builder()
                .id("rule-300")
                .name("Rule to Delete")
                .build();

        when(ruleRepository.findById("rule-300")).thenReturn(Optional.of(rule));

        ruleService.deleteRule("rule-300");

        verify(ruleRepository).delete(rule);
        verify(auditService).record(eq(AuditAction.RULE_DELETED), eq("DetectionRule"), eq("rule-300"), any());
    }
}

