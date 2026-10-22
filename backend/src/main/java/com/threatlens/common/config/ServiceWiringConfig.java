package com.threatlens.common.config;

import com.threatlens.alert.service.AlertService;
import com.threatlens.detection.service.ThreatDetectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Resolves circular dependency between ThreatDetectionService and AlertService
 * by wiring AlertService after both beans are fully initialized.
 */
@Component
@RequiredArgsConstructor
@Order(1)
public class ServiceWiringConfig implements ApplicationRunner {
    private final ThreatDetectionService detectionService;
    private final AlertService alertService;

    @Override
    public void run(ApplicationArguments args) {
        detectionService.setAlertService(alertService);
    }
}
