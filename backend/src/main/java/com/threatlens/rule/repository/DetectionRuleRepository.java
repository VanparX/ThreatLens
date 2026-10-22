package com.threatlens.rule.repository;

import com.threatlens.rule.model.DetectionRule;
import com.threatlens.rule.model.RuleType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetectionRuleRepository extends MongoRepository<DetectionRule, String> {
    List<DetectionRule> findByEnabled(boolean enabled);
    List<DetectionRule> findByType(RuleType type);
    boolean existsByName(String name);
}
