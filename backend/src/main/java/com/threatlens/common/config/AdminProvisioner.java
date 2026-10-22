package com.threatlens.common.config;

import com.threatlens.auth.model.User;
import com.threatlens.auth.model.UserRole;
import com.threatlens.auth.repository.UserRepository;
import com.threatlens.log.model.LogEventType;
import com.threatlens.log.model.LogSeverity;
import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.model.RuleCondition;
import com.threatlens.rule.model.RuleType;
import com.threatlens.rule.repository.DetectionRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Creates initial admin account and default SOC detection rules on first startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminProvisioner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final DetectionRuleRepository ruleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:ChangeMe!Admin123}")
    private String adminPassword;

    @Value("${app.admin.email:admin@threatlens.local}")
    private String adminEmail;

    @Override
    public void run(ApplicationArguments args) {
        provisionAdmin();
        provisionDefaultRules();
    }

    private void provisionAdmin() {
        if (userRepository.existsByUsername(adminUsername)) {
            log.info("Admin user '{}' already exists — skipping provisioning", adminUsername);
            return;
        }

        User admin = User.builder()
                .username(adminUsername)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .roles(Set.of(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
                .enabled(true)
                .build();

        userRepository.save(admin);
        log.info("Initial admin user '{}' provisioned.", adminUsername);
    }

    private void provisionDefaultRules() {
        if (ruleRepository.count() > 0) {
            log.info("Detection rules already exist — skipping default rule seeding");
            return;
        }

        List<DetectionRule> defaultRules = List.of(
                DetectionRule.builder()
                        .name("SSH Brute Force Detection")
                        .description("Triggers when 3 or more authentication failures occur from the same source IP within 60 seconds")
                        .type(RuleType.THRESHOLD)
                        .severity(LogSeverity.HIGH)
                        .enabled(true)
                        .createdBy("SYSTEM")
                        .condition(RuleCondition.builder()
                                .thresholdCount(3)
                                .thresholdWindowSeconds(60)
                                .eventTypes(List.of(LogEventType.BRUTE_FORCE, LogEventType.AUTHENTICATION_FAILURE))
                                .build())
                        .build(),

                DetectionRule.builder()
                        .name("Ransomware Encryption Activity")
                        .description("Immediate emergency alert upon detection of ransomware canary beacons or mass file encryption")
                        .type(RuleType.EVENT_TYPE_MATCH)
                        .severity(LogSeverity.CRITICAL)
                        .enabled(true)
                        .createdBy("SYSTEM")
                        .condition(RuleCondition.builder()
                                .eventTypes(List.of(LogEventType.RANSOMWARE_DETECTED))
                                .build())
                        .build(),

                DetectionRule.builder()
                        .name("Reconnaissance & Port Sweep")
                        .description("Flags TCP/UDP port enumeration sweeps against internal bastion and DMZ services")
                        .type(RuleType.EVENT_TYPE_MATCH)
                        .severity(LogSeverity.MEDIUM)
                        .enabled(true)
                        .createdBy("SYSTEM")
                        .condition(RuleCondition.builder()
                                .eventTypes(List.of(LogEventType.PORT_SCAN))
                                .build())
                        .build(),

                DetectionRule.builder()
                        .name("Unauthorized Privilege Escalation")
                        .description("Detects unauthorized sudo elevation or credential impersonation by non-privileged accounts")
                        .type(RuleType.EVENT_TYPE_MATCH)
                        .severity(LogSeverity.HIGH)
                        .enabled(true)
                        .createdBy("SYSTEM")
                        .condition(RuleCondition.builder()
                                .eventTypes(List.of(LogEventType.PRIVILEGE_ESCALATION))
                                .build())
                        .build()
        );

        ruleRepository.saveAll(defaultRules);
        log.info("Seeded {} default SOC detection rules successfully.", defaultRules.size());
    }
}
