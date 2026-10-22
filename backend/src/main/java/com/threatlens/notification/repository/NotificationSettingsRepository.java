package com.threatlens.notification.repository;

import com.threatlens.notification.model.NotificationSettings;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationSettingsRepository extends MongoRepository<NotificationSettings, String> {
}
