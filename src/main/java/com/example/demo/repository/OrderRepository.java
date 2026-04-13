package com.example.demo.repository;

import com.example.demo.model.OrderEntity;
import com.example.demo.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    List<OrderEntity> findByUserOrderByCreatedAtDesc(UserAccount user);
}
