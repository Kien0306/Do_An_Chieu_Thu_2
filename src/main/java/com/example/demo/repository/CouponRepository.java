package com.example.demo.repository;

import com.example.demo.model.Coupon;
import com.example.demo.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, Long> {
    Optional<Coupon> findByCodeIgnoreCase(String code);
    List<Coupon> findByOwnerUserOrOwnerUserIsNullAndActiveTrueOrderByIdDesc(UserAccount ownerUser);
    List<Coupon> findByOwnerUserAndActiveTrueOrderByIdDesc(UserAccount ownerUser);
}
