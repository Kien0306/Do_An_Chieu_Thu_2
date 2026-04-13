package com.example.demo.service;

import com.example.demo.model.Role;
import com.example.demo.model.UserAccount;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService implements UserDetailsService {
    public record ResetRequestResult(String token, boolean mailSent, String email, String fullName) {}

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public AuthService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder, MailService mailService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserAccount user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản"));
        return new User(user.getUsername(), user.getPassword(), user.isEnabled(), true, true, true,
                List.of(new SimpleGrantedAuthority(user.getRole().getName())));
    }

    public UserAccount register(String username, String email, String fullName, String rawPassword) {
        if (username == null || username.isBlank() || email == null || email.isBlank() || fullName == null || fullName.isBlank() || rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập đầy đủ thông tin đăng ký.");
        }
        if (userRepository.findByUsername(username.trim()).isPresent()) throw new IllegalArgumentException("Tên đăng nhập đã tồn tại.");
        if (userRepository.findByEmail(email.trim()).isPresent()) throw new IllegalArgumentException("Email đã tồn tại.");
        Role role = roleRepository.findByName("ROLE_USER").or(() -> roleRepository.findByName("ROLE_CUSTOMER")).orElseThrow(() -> new IllegalArgumentException("Thiếu role người dùng trong database."));
        UserAccount user = new UserAccount();
        user.setUsername(username.trim());
        user.setEmail(email.trim());
        user.setFullName(fullName.trim());
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setEnabled(true);
        return userRepository.save(user);
    }

    @Transactional
    public ResetRequestResult createResetToken(String email) {
        UserAccount user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("Email không tồn tại trong hệ thống."));
        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        user.setForgotPasswordToken(token);
        user.setForgotPasswordTokenExp(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);
        boolean mailSent = mailService.sendResetPasswordMail(user.getEmail(), user.getFullName(), token);
        return new ResetRequestResult(token, mailSent, user.getEmail(), user.getFullName());
    }

    public boolean isResetTokenValid(String token) {
        return userRepository.findAll().stream().anyMatch(user -> token.equals(user.getForgotPasswordToken())
                && user.getForgotPasswordTokenExp() != null
                && user.getForgotPasswordTokenExp().isAfter(LocalDateTime.now()));
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        UserAccount user = userRepository.findAll().stream().filter(item -> token.equals(item.getForgotPasswordToken())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Token đổi mật khẩu không hợp lệ."));
        if (user.getForgotPasswordTokenExp() == null || user.getForgotPasswordTokenExp().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Liên kết đổi mật khẩu đã hết hạn.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setForgotPasswordToken(null);
        user.setForgotPasswordTokenExp(null);
        userRepository.save(user);
    }
}
