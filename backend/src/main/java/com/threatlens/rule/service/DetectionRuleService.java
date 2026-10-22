package com.threatlens.rule.service;

import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.service.AuditService;
import com.threatlens.common.exception.BadRequestException;
import com.threatlens.common.exception.ConflictException;
import com.threatlens.common.exception.NotFoundException;
import com.threatlens.rule.dto.DetectionRuleRequest;
import com.threatlens.rule.dto.DetectionRuleResponse;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.model.RuleType;
import com.threatlens.rule.repository.DetectionRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DetectionRuleService {

    private final DetectionRuleRepository ruleRepository;
    private final AuditService auditService;

    public DetectionRuleResponse createRule(DetectionRuleRequest request) {
        if (ruleRepository.existsByName(request.getName())) {
            throw new ConflictException("A rule with this name already exists: " + request.getName());
        }
        validateCondition(request);

        DetectionRule rule = DetectionRule.builder()
                .name(request.getName())
                .description(request.getDescription())
                .type(request.getType())
                .condition(request.getCondition())
                .severity(request.getSeverity())
                .enabled(request.isEnabled())
                .createdBy(getCurrentUsername())
                .build();

        DetectionRule saved = ruleRepository.save(rule);
        auditService.record(AuditAction.RULE_CREATED, "DetectionRule", saved.getId(),
                Map.of("name", saved.getName(), "type", saved.getType()));

        return toResponse(saved);
    }

    public Page<DetectionRuleResponse> listRules(Pageable pageable) {
        return ruleRepository.findAll(pageable).map(this::toResponse);
    }

    public List<DetectionRuleResponse> getEnabledRules() {
        return ruleRepository.findByEnabled(true).stream().map(this::toResponse).toList();
    }

    public DetectionRuleResponse getRule(String id) {
        return toResponse(findById(id));
    }

    public DetectionRuleResponse updateRule(String id, DetectionRuleRequest request) {
        DetectionRule rule = findById(id);
        validateCondition(request);

        rule.setName(request.getName());
        rule.setDescription(request.getDescription());
        rule.setType(request.getType());
        rule.setCondition(request.getCondition());
        rule.setSeverity(request.getSeverity());
        rule.setEnabled(request.isEnabled());

        DetectionRule saved = ruleRepository.save(rule);
        auditService.record(AuditAction.RULE_UPDATED, "DetectionRule", id,
                Map.of("name", saved.getName()));
        return toResponse(saved);
    }

    public DetectionRuleResponse setEnabled(String id, boolean enabled) {
        DetectionRule rule = findById(id);
        rule.setEnabled(enabled);
        DetectionRule saved = ruleRepository.save(rule);
        auditService.record(enabled ? AuditAction.RULE_ENABLED : AuditAction.RULE_DISABLED,
                "DetectionRule", id, Map.of("name", rule.getName()));
        return toResponse(saved);
    }

    private DetectionRule findById(String id) {
        return ruleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Detection rule not found: " + id));
    }

    private void validateCondition(DetectionRuleRequest request) {
        var cond = request.getCondition();
        if (cond == null) throw new BadRequestException("Rule condition is required");

        switch (request.getType()) {
            case THRESHOLD -> {
                if (cond.getThresholdCount() == null || cond.getThresholdCount() < 1)
                    throw new BadRequestException("THRESHOLD rule requires thresholdCount >= 1");
                if (cond.getThresholdWindowSeconds() == null || cond.getThresholdWindowSeconds() < 1)
                    throw new BadRequestException("THRESHOLD rule requires thresholdWindowSeconds >= 1");
            }
            case PATTERN_MATCH -> {
                if (cond.getPatterns() == null || cond.getPatterns().isEmpty())
                    throw new BadRequestException("PATTERN_MATCH rule requires at least one pattern");
            }
            case IP_MATCH -> {
                if (cond.getIpAddresses() == null || cond.getIpAddresses().isEmpty())
                    throw new BadRequestException("IP_MATCH rule requires at least one IP address");
            }
            case EVENT_TYPE_MATCH -> {
                if (cond.getEventTypes() == null || cond.getEventTypes().isEmpty())
                    throw new BadRequestException("EVENT_TYPE_MATCH rule requires at least one event type");
            }
            case COMPOSITE -> {
                // Composite can combine threshold + patterns
            }
        }
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private DetectionRuleResponse toResponse(DetectionRule rule) {
        return DetectionRuleResponse.builder()
                .id(rule.getId())
                .name(rule.getName())
                .description(rule.getDescription())
                .type(rule.getType())
                .condition(rule.getCondition())
                .severity(rule.getSeverity())
                .enabled(rule.isEnabled())
                .createdBy(rule.getCreatedBy())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }
}
