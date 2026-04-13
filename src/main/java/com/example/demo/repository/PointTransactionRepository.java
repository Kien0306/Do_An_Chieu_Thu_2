package com.example.demo.repository;

import com.example.demo.model.PointTransaction;
import com.example.demo.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {
    List<PointTransaction> findByUserOrderByCreatedAtDesc(UserAccount user);
}
