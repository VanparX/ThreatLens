package com.threatlens.notification.repository;

import com.threatlens.notification.model.NotificationRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRecordRepository extends MongoRepository<NotificationRecord, String> {
    Page<NotificationRecord> findAllByOrderBySentAtDesc(Pageable pageable);
    List<NotificationRecord> findByAlertId(String alertId);
}
