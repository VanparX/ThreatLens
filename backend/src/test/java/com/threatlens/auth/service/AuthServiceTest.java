package com.threatlens.auth.service;

import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.service.AuditService;
import com.threatlens.auth.dto.UserResponse;
import com.threatlens.auth.model.User;
import com.threatlens.auth.model.UserRole;
import com.threatlens.auth.repository.UserRepository;
import com.threatlens.common.exception.BadRequestException;
import com.threatlens.common.exception.NotFoundException;
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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("listUsers without role filter queries findAll(pageable)")
    void listUsersAll() {
        Pageable pageable = PageRequest.of(0, 10);
        User u = User.builder()
                .id("u-1")
                .username("admin")
                .email("admin@threatlens.io")
                .roles(Set.of(UserRole.ADMIN))
                .enabled(true)
                .createdAt(Instant.now())
                .build();

        when(userRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(u)));

        Page<UserResponse> res = authService.listUsers(null, pageable);

        assertThat(res.getContent()).hasSize(1);
        assertThat(res.getContent().get(0).getUsername()).isEqualTo("admin");
        verify(userRepository).findAll(pageable);
    }

    @Test
    @DisplayName("listUsers with role filter queries findByRole(role, pageable)")
    void listUsersByRole() {
        Pageable pageable = PageRequest.of(0, 10);
        User u = User.builder()
                .id("u-2")
                .username("analyst_mike")
                .email("mike@threatlens.io")
                .roles(Set.of(UserRole.SECURITY_ANALYST))
                .enabled(true)
                .build();

        when(userRepository.findByRole(UserRole.SECURITY_ANALYST, pageable))
                .thenReturn(new PageImpl<>(List.of(u)));

        Page<UserResponse> res = authService.listUsers(UserRole.SECURITY_ANALYST, pageable);

        assertThat(res.getContent()).hasSize(1);
        assertThat(res.getContent().get(0).getRoles()).containsExactly(UserRole.SECURITY_ANALYST);
        verify(userRepository).findByRole(UserRole.SECURITY_ANALYST, pageable);
    }

    @Test
    @DisplayName("getUserStats aggregates accurate counts for all roles and account statuses")
    void getUserStats() {
        when(userRepository.count()).thenReturn(15L);
        when(userRepository.countByRole(UserRole.ADMIN)).thenReturn(2L);
        when(userRepository.countByRole(UserRole.SECURITY_ANALYST)).thenReturn(8L);
        when(userRepository.countByRole(UserRole.VIEWER)).thenReturn(5L);
        when(userRepository.countByEnabled(true)).thenReturn(14L);

        Map<String, Long> stats = authService.getUserStats();

        assertThat(stats.get("totalUsers")).isEqualTo(15L);
        assertThat(stats.get("adminCount")).isEqualTo(2L);
        assertThat(stats.get("analystCount")).isEqualTo(8L);
        assertThat(stats.get("viewerCount")).isEqualTo(5L);
        assertThat(stats.get("enabledCount")).isEqualTo(14L);
        assertThat(stats.get("disabledCount")).isEqualTo(1L);
    }

    @Test
    @DisplayName("updateUserRoles replaces the entire role set and records audit action")
    void updateUserRolesReplacesEntireRoleSet() {
        User user = User.builder()
                .id("u-100")
                .username("analyst_sarah")
                .roles(Set.of(UserRole.SECURITY_ANALYST))
                .build();

        when(userRepository.findById("u-100")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        Set<UserRole> newRoles = Set.of(UserRole.ADMIN, UserRole.SECURITY_ANALYST);
        UserResponse updated = authService.updateUserRoles("u-100", newRoles);

        assertThat(updated.getRoles()).containsExactlyInAnyOrder(UserRole.ADMIN, UserRole.SECURITY_ANALYST);
        verify(auditService).record(eq(AuditAction.USER_ROLE_CHANGED), eq("User"), eq("u-100"), any());
    }

    @Test
    @DisplayName("updateUserRoles rejects null or empty role set with BadRequestException")
    void updateUserRolesRejectsEmptyRoles() {
        assertThatThrownBy(() -> authService.updateUserRoles("u-101", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("At least one role must be assigned");

        assertThatThrownBy(() -> authService.updateUserRoles("u-101", Set.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("At least one role must be assigned");
    }

    @Test
    @DisplayName("setUserEnabled updates status and records USER_ENABLED/USER_DISABLED audit action")
    void setUserEnabled() {
        User user = User.builder()
                .id("u-200")
                .username("contractor_john")
                .enabled(true)
                .build();

        when(userRepository.findById("u-200")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // Disable user
        UserResponse disabled = authService.setUserEnabled("u-200", false);
        assertThat(disabled.isEnabled()).isFalse();
        verify(auditService).record(eq(AuditAction.USER_DISABLED), eq("User"), eq("u-200"), any());

        // Enable user
        UserResponse enabled = authService.setUserEnabled("u-200", true);
        assertThat(enabled.isEnabled()).isTrue();
        verify(auditService).record(eq(AuditAction.USER_ENABLED), eq("User"), eq("u-200"), any());
    }

    @Test
    @DisplayName("getUser returns mapped DTO or throws NotFoundException")
    void getUser() {
        User user = User.builder()
                .id("u-300")
                .username("soc_lead")
                .email("lead@threatlens.io")
                .roles(Set.of(UserRole.ADMIN))
                .build();

        when(userRepository.findById("u-300")).thenReturn(Optional.of(user));
        when(userRepository.findById("u-unknown")).thenReturn(Optional.empty());

        UserResponse res = authService.getUser("u-300");
        assertThat(res.getUsername()).isEqualTo("soc_lead");

        assertThatThrownBy(() -> authService.getUser("u-unknown"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("User not found");
    }
}

