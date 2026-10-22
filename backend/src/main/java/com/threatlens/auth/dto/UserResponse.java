package com.threatlens.auth.dto;

import com.threatlens.auth.model.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private String id;
    private String username;
    private String email;
    private Set<UserRole> roles;
    private boolean enabled;
    private Instant createdAt;
}
