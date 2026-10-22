package com.threatlens.audit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

/**
 * Append-only audit log. No update or delete APIs are exposed to application users.
 * Note: MongoDB-level immutability is not implemented; audit integrity relies on
 * application-level access control.
 */
@Document(collection = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndexes({
    @CompoundIndex(name = "actor_timestamp", def = "{'actor': 1, 'timestamp': -1}"),
    @CompoundIndex(name = "resource_timestamp", def = "{'resourceType': 1, 'timestamp': -1}")
})
public class AuditLog {
    @Id
    private String id;

    @Indexed
    private String actor;

    private String actorId;

    @Indexed
    private AuditAction action;

    private String resourceType;

    private String resourceId;

    private Map<String, Object> details;

    @Indexed
    private Instant timestamp;

    private String ipAddress;
}
