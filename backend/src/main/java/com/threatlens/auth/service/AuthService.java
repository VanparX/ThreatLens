package com.threatlens.auth.service;

import com.threatlens.audit.model.AuditAction;
import com.threatlens.audit.service.AuditService;
import com.threatlens.auth.dto.*;
import com.threatlens.auth.model.User;
import com.threatlens.auth.model.UserRole;
import com.threatlens.auth.repository.UserRepository;
import com.threatlens.auth.security.JwtService;
import com.threatlens.common.exception.BadRequestException;
import com.threatlens.common.exception.ConflictException;
import com.threatlens.common.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final AuditService auditService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Username already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered: " + request.getEmail());
        }

        Set<UserRole> roles = request.getRoles() != null && !request.getRoles().isEmpty()
                ? request.getRoles()
                : Set.of(UserRole.VIEWER);

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .roles(roles)
                .enabled(true)
                .build();

        userRepository.save(user);
        log.info("Registered new user: {}", request.getUsername());

        auditService.record(AuditAction.USER_REGISTERED, "User", user.getId(),
                Map.of("username", user.getUsername(), "roles", user.getRoles()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtService.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(user.getRoles())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new NotFoundException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtService.generateToken(userDetails);

        auditService.record(AuditAction.USER_LOGIN, "User", user.getId(),
                Map.of("username", user.getUsername()));

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(user.getRoles())
                .build();
    }

    public Page<UserResponse> listUsers(UserRole role, Pageable pageable) {
        if (role != null) {
            return userRepository.findByRole(role, pageable).map(this::toUserResponse);
        }
        return userRepository.findAll(pageable).map(this::toUserResponse);
    }

    public Page<UserResponse> listUsers(Pageable pageable) {
        return listUsers(null, pageable);
    }

    public Map<String, Long> getUserStats() {
        long total = userRepository.count();
        long adminCount = userRepository.countByRole(UserRole.ADMIN);
        long analystCount = userRepository.countByRole(UserRole.SECURITY_ANALYST);
        long viewerCount = userRepository.countByRole(UserRole.VIEWER);
        long enabledCount = userRepository.countByEnabled(true);
        return Map.of(
                "totalUsers", total,
                "adminCount", adminCount,
                "analystCount", analystCount,
                "viewerCount", viewerCount,
                "enabledCount", enabledCount,
                "disabledCount", total - enabledCount
        );
    }

    public UserResponse getUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
        return toUserResponse(user);
    }

    public UserResponse updateUserRoles(String id, Set<UserRole> roles) {
        if (roles == null || roles.isEmpty()) {
            throw new BadRequestException("At least one role must be assigned to the user");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
        Set<UserRole> oldRoles = user.getRoles();
        user.setRoles(roles);
        userRepository.save(user);

        auditService.record(AuditAction.USER_ROLE_CHANGED, "User", id,
                Map.of("oldRoles", oldRoles, "newRoles", roles));

        return toUserResponse(user);
    }

    public UserResponse setUserEnabled(String id, boolean enabled) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
        user.setEnabled(enabled);
        userRepository.save(user);

        auditService.record(enabled ? AuditAction.USER_ENABLED : AuditAction.USER_DISABLED,
                "User", id, Map.of("username", user.getUsername()));

        return toUserResponse(user);
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(user.getRoles())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
