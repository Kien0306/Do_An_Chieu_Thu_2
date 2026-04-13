package com.example.demo.service;

import com.example.demo.model.Coupon;
import com.example.demo.model.PointTransaction;
import com.example.demo.model.UserAccount;
import com.example.demo.repository.CouponRepository;
import com.example.demo.repository.PointTransactionRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class LoyaltyService {
    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final CouponRepository couponRepository;

    public LoyaltyService(UserRepository userRepository, PointTransactionRepository pointTransactionRepository, CouponRepository couponRepository) {
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.couponRepository = couponRepository;
    }

    public int pointsOf(String username) {
        return userRepository.findByUsername(username).map(UserAccount::getLoyaltyPoints).orElse(0);
    }

    public List<PointTransaction> history(String username) {
        return userRepository.findByUsername(username)
                .map(pointTransactionRepository::findByUserOrderByCreatedAtDesc)
                .orElse(List.of());
    }

    @Transactional
    public void awardOrderPoints(UserAccount user, long orderTotal, Long orderId) {
        int points = (int) Math.max(0, orderTotal / 1000);
        user.setLoyaltyPoints(user.getLoyaltyPoints() + points);
        userRepository.save(user);
        PointTransaction tx = new PointTransaction();
        tx.setUser(user);
        tx.setTransactionType("earn");
        tx.setPoints(points);
        tx.setDescription("Cộng điểm từ đơn hàng #" + orderId);
        pointTransactionRepository.save(tx);
    }

    @Transactional
    public Coupon redeem(String username, int pointsCost, String title, String couponType, long couponValue, long maxDiscount) {
        UserAccount user = userRepository.findByUsername(username).orElseThrow();
        if (user.getLoyaltyPoints() < pointsCost) {
            throw new IllegalStateException("Không đủ điểm để đổi quà.");
        }
        user.setLoyaltyPoints(user.getLoyaltyPoints() - pointsCost);
        userRepository.save(user);

        PointTransaction tx = new PointTransaction();
        tx.setUser(user);
        tx.setTransactionType("redeem");
        tx.setPoints(-pointsCost);
        tx.setDescription("Đổi quà: " + title);
        pointTransactionRepository.save(tx);

        Coupon coupon = new Coupon();
        coupon.setCode("RW" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase());
        coupon.setTitle(title);
        coupon.setCouponType(couponType);
        coupon.setCouponValue(couponValue);
        coupon.setMaxDiscount(maxDiscount);
        coupon.setMinOrderAmount(0);
        coupon.setPointCoupon(false);
        coupon.setPointsCost(pointsCost);
        coupon.setRewardStock(1);
        coupon.setOwnerUser(user);
        coupon.setUsedOnce(true);
        coupon.setActive(true);
        coupon.setExpiresAt(null);
        return couponRepository.save(coupon);
    }
}
