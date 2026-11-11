package com.threatlens.auth.repository;

import com.threatlens.auth.model.User;
import com.threatlens.auth.model.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    @Query("{ 'roles': ?0 }")
    Page<User> findByRole(UserRole role, Pageable pageable);
    @Query(value = "{ 'roles': ?0 }", count = true)
    long countByRole(UserRole role);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    long countByEnabled(boolean enabled);
}
