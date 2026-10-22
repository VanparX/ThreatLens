package com.threatlens.incident.model;

public enum ResponseActionMode {
    /** Action is recorded only; not applied to any external system */
    SIMULATED,
    /** Action was actually executed against an external system */
    EXECUTED
}
