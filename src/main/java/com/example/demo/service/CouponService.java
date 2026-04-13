package com.example.demo.service;

import com.example.demo.model.Coupon;
import com.example.demo.model.UserAccount;
import com.example.demo.repository.CouponRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CouponService {
    public record CouponCalculation(Coupon coupon, long discount, String message) {}

    private final CouponRepository couponRepository;
    private final UserRepository userRepository;

    public CouponService(CouponRepository couponRepository, UserRepository userRepository) {
        this.couponRepository = couponRepository;
        this.userRepository = userRepository;
    }

    public List<Coupon> myCoupons(String username) {
        return userRepository.findByUsername(username)
                .map(user -> couponRepository.findByOwnerUserAndActiveTrueOrderByIdDesc(user).stream()
                        .filter(c -> !c.isPointCoupon())
                        .toList())
                .orElse(List.of());
    }

    public List<Coupon> publicCoupons() {
        return couponRepository.findAll().stream()
                .filter(c -> c.isActive() && !c.isPointCoupon())
                .sorted((a,b) -> Long.compare(b.getId(), a.getId()))
                .toList();
    }

    public List<Coupon> paymentCouponsAdmin() {
        return couponRepository.findAll().stream()
                .filter(c -> !c.isPointCoupon())
                .sorted((a,b) -> Long.compare(b.getId(), a.getId()))
                .toList();
    }

    public List<Coupon> pointCouponsAdmin() {
        return couponRepository.findAll().stream()
                .filter(Coupon::isPointCoupon)
                .filter(c -> c.getOwnerUser() == null)
                .sorted((a,b) -> Long.compare(b.getId(), a.getId()))
                .toList();
    }

    public Coupon findById(Long id) {
        return couponRepository.findById(id).orElse(null);
    }

    public void deleteById(Long id) {
        couponRepository.deleteById(id);
    }

    public Optional<CouponCalculation> validate(String code, long subtotal, String username) {
        if (code == null || code.isBlank()) return Optional.empty();
        Optional<Coupon> found = couponRepository.findByCodeIgnoreCase(code.trim());
        if (found.isEmpty()) return Optional.empty();
        Coupon coupon = found.get();
        if (!coupon.isActive()) return Optional.of(new CouponCalculation(coupon, 0, "Mã giảm giá đã bị khóa."));
        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(LocalDateTime.now())) {
            return Optional.of(new CouponCalculation(coupon, 0, "Mã giảm giá đã hết hạn."));
        }
        if (subtotal < coupon.getMinOrderAmount()) {
            return Optional.of(new CouponCalculation(coupon, 0, "Đơn hàng chưa đạt giá trị tối thiểu."));
        }
        if (coupon.getOwnerUser() != null && username != null && !coupon.getOwnerUser().getUsername().equals(username)) {
            return Optional.of(new CouponCalculation(coupon, 0, "Mã này không thuộc tài khoản của bạn."));
        }
        long discount;
        if ("percent".equalsIgnoreCase(coupon.getCouponType())) {
            discount = subtotal * coupon.getCouponValue() / 100;
            if (coupon.getMaxDiscount() > 0) discount = Math.min(discount, coupon.getMaxDiscount());
        } else {
            discount = coupon.getCouponValue();
        }
        discount = Math.max(0, Math.min(discount, subtotal));
        return Optional.of(new CouponCalculation(coupon, discount, "Áp mã thành công."));
    }



    public void consume(String code, String username) {
        if (code == null || code.isBlank()) return;
        couponRepository.findByCodeIgnoreCase(code.trim()).ifPresent(coupon -> {
            if (coupon.getOwnerUser() != null && username != null) {
                String owner = coupon.getOwnerUser().getUsername();
                if (owner != null && !owner.equals(username)) return;
            }
            coupon.setUsedCount(coupon.getUsedCount() + 1);
            if (coupon.isUsedOnce() || coupon.getOwnerUser() != null) {
                coupon.setActive(false);
            }
            if (coupon.getRewardStock() > 0) {
                coupon.setRewardStock(Math.max(0, coupon.getRewardStock() - 1));
            }
            couponRepository.save(coupon);
        });
    }

    public Coupon save(Coupon coupon) {
        normalize(coupon);
        return couponRepository.save(coupon);
    }

    public Coupon savePaymentCoupon(Coupon coupon) {
        coupon.setPointCoupon(false);
        normalize(coupon);
        return couponRepository.save(coupon);
    }

    public Coupon savePointCoupon(Coupon coupon) {
        coupon.setPointCoupon(true);
        if (coupon.getCode() == null || coupon.getCode().isBlank()) {
            coupon.setCode("POINT" + coupon.getPointsCost() + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        }
        if (coupon.getTitle() == null || coupon.getTitle().isBlank()) {
            String label = "percent".equalsIgnoreCase(coupon.getCouponType()) ? coupon.getCouponValue() + "%" : formatMoney(coupon.getCouponValue()) + "đ";
            coupon.setTitle("Đổi " + coupon.getPointsCost() + " điểm nhận ưu đãi " + label);
        }
        normalize(coupon);
        return couponRepository.save(coupon);
    }

    private void normalize(Coupon coupon) {
        if (coupon.getCode() != null) coupon.setCode(coupon.getCode().trim().toUpperCase());
        if (coupon.getTitle() != null) coupon.setTitle(coupon.getTitle().trim());
        if (coupon.getCouponType() == null || coupon.getCouponType().isBlank()) coupon.setCouponType("fixed");
    }

    private String formatMoney(long value) {
        return String.format("%,d", value).replace(',', '.');
    }
}
