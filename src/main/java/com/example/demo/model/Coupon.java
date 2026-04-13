package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
public class Coupon {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 50)
    private String code;
    @Column(nullable = false)
    private String title;
    @Column(name = "coupon_type")
    private String couponType = "fixed";
    @Column(name = "coupon_value")
    private long couponValue;
    @Column(name = "min_order_amount")
    private long minOrderAmount;
    @Column(name = "max_discount")
    private long maxDiscount;
    @Column(name = "used_count")
    private int usedCount;
    @Column(name = "is_point_coupon")
    private boolean pointCoupon;
    @Column(name = "points_cost")
    private int pointsCost;
    @Column(name = "reward_stock")
    private int rewardStock;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private UserAccount ownerUser;
    @Column(name = "is_used_once")
    private boolean usedOnce;
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
    @Column(name = "is_active")
    private boolean active = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCouponType() { return couponType; }
    public void setCouponType(String couponType) { this.couponType = couponType; }
    public long getCouponValue() { return couponValue; }
    public void setCouponValue(long couponValue) { this.couponValue = couponValue; }
    public long getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(long minOrderAmount) { this.minOrderAmount = minOrderAmount; }
    public long getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(long maxDiscount) { this.maxDiscount = maxDiscount; }
    public int getUsedCount() { return usedCount; }
    public void setUsedCount(int usedCount) { this.usedCount = usedCount; }
    public boolean isPointCoupon() { return pointCoupon; }
    public void setPointCoupon(boolean pointCoupon) { this.pointCoupon = pointCoupon; }
    public int getPointsCost() { return pointsCost; }
    public void setPointsCost(int pointsCost) { this.pointsCost = pointsCost; }
    public int getRewardStock() { return rewardStock; }
    public void setRewardStock(int rewardStock) { this.rewardStock = rewardStock; }
    public UserAccount getOwnerUser() { return ownerUser; }
    public void setOwnerUser(UserAccount ownerUser) { this.ownerUser = ownerUser; }
    public boolean isUsedOnce() { return usedOnce; }
    public void setUsedOnce(boolean usedOnce) { this.usedOnce = usedOnce; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
