package com.example.demo.service;

import com.example.demo.model.UserAccount;
import com.example.demo.repository.AddressRepository;
import com.example.demo.repository.CouponRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.PointTransactionRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserAdminService {
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final AddressRepository addressRepository;
    private final CouponRepository couponRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public UserAdminService(UserRepository userRepository, OrderRepository orderRepository, AddressRepository addressRepository, CouponRepository couponRepository, PointTransactionRepository pointTransactionRepository) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.addressRepository = addressRepository;
        this.couponRepository = couponRepository;
        this.pointTransactionRepository = pointTransactionRepository;
    }

    public List<UserAccount> findAll() {
        return userRepository.findAll().stream()
                .filter(user -> user.getUsername() == null || !user.getUsername().startsWith("deleted_"))
                .toList();
    }

    public void lock(Long id) {
        userRepository.findById(id).ifPresent(user -> {
            if (!"ROLE_ADMIN".equals(user.getRole().getName())) {
                user.setEnabled(false);
                userRepository.saveAndFlush(user);
            }
        });
    }

    public void unlock(Long id) {
        userRepository.findById(id).ifPresent(user -> {
            user.setEnabled(true);
            userRepository.saveAndFlush(user);
        });
    }

    @Transactional
    public void delete(Long id) {
        userRepository.findById(id).ifPresent(user -> {
            if (user.getRole() != null && "ROLE_ADMIN".equals(user.getRole().getName())) {
                return;
            }
            String marker = Long.toHexString(System.currentTimeMillis());
            String safeUsername = ("deleted_" + user.getId() + "_" + marker);
            if (safeUsername.length() > 50) safeUsername = safeUsername.substring(0, 50);
            String safeEmail = "deleted_" + user.getId() + "_" + marker + "@local";
            user.setEnabled(false);
            user.setForgotPasswordToken(null);
            user.setForgotPasswordTokenExp(null);
            user.setUsername(safeUsername);
            user.setEmail(safeEmail);
            user.setFullName("Tài khoản đã xóa");
            if (user.getPassword() == null || user.getPassword().isBlank()) user.setPassword("deleted");
            userRepository.saveAndFlush(user);
        });
    }
}
