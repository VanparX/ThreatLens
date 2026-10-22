package com.threatlens.log.service;

import com.threatlens.log.model.SecurityLog;
import org.springframework.context.ApplicationEvent;

public class SecurityLogIngestedEvent extends ApplicationEvent {
    private final SecurityLog log;

    public SecurityLogIngestedEvent(Object source, SecurityLog log) {
        super(source);
        this.log = log;
    }

    public SecurityLog getLog() {
        return log;
    }
}
