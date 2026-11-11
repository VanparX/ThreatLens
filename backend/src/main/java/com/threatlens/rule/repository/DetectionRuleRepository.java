package com.threatlens.rule.repository;

import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.model.RuleType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetectionRuleRepository extends MongoRepository<DetectionRule, String> {
    List<DetectionRule> findByEnabled(boolean enabled);
    List<DetectionRule> findByType(RuleType type);
    Page<DetectionRule> findByEnabled(boolean enabled, Pageable pageable);
    Page<DetectionRule> findByType(RuleType type, Pageable pageable);
    Page<DetectionRule> findByEnabledAndType(boolean enabled, RuleType type, Pageable pageable);
    long countByEnabled(boolean enabled);
    boolean existsByName(String name);
}
