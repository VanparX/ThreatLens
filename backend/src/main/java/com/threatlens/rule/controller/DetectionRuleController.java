package com.threatlens.rule.controller;

import com.threatlens.common.response.ApiResponse;
import com.threatlens.rule.dto.DetectionRuleRequest;
import com.threatlens.rule.dto.DetectionRuleResponse;
import com.threatlens.rule.service.DetectionRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class DetectionRuleController {

    private final DetectionRuleService ruleService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<DetectionRuleResponse>> createRule(
            @Valid @RequestBody DetectionRuleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Rule created", ruleService.createRule(request)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<DetectionRuleResponse>>> listRules(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("Rules fetched",
                ruleService.listRules(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))));
    }

    @GetMapping("/enabled")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<DetectionRuleResponse>>> getEnabledRules() {
        return ResponseEntity.ok(ApiResponse.success("Enabled rules", ruleService.getEnabledRules()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DetectionRuleResponse>> getRule(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Rule fetched", ruleService.getRule(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<DetectionRuleResponse>> updateRule(
            @PathVariable String id, @Valid @RequestBody DetectionRuleRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Rule updated", ruleService.updateRule(id, request)));
    }

    @PutMapping("/{id}/enable")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<DetectionRuleResponse>> enableRule(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Rule enabled", ruleService.setEnabled(id, true)));
    }

    @PutMapping("/{id}/disable")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<ApiResponse<DetectionRuleResponse>> disableRule(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Rule disabled", ruleService.setEnabled(id, false)));
    }
}
