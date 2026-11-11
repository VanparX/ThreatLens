package com.threatlens.auth.controller;

import com.threatlens.auth.dto.*;
import com.threatlens.auth.model.UserRole;
import com.threatlens.auth.service.AuthService;
import com.threatlens.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        // Prevent external registration from assigning ADMIN role
        if (request.getRoles() != null) {
            request.getRoles().remove(UserRole.ADMIN);
        }
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> listUsers(
            @RequestParam(required = false) UserRole role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<UserResponse> users = authService.listUsers(
                role,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.success("Users fetched", users));
    }

    @GetMapping("/users/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUserStats() {
        return ResponseEntity.ok(ApiResponse.success("User statistics", authService.getUserStats()));
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("User fetched", authService.getUser(id)));
    }

    @PutMapping("/users/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateRoles(
            @PathVariable String id,
            @RequestBody Set<UserRole> roles) {
        return ResponseEntity.ok(ApiResponse.success("Roles updated", authService.updateUserRoles(id, roles)));
    }

    @PutMapping("/users/{id}/enable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> enableUser(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("User enabled", authService.setUserEnabled(id, true)));
    }

    @PutMapping("/users/{id}/disable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> disableUser(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("User disabled", authService.setUserEnabled(id, false)));
    }
}
