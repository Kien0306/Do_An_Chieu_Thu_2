package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class UserAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 50)
    private String username;
    @Column(nullable = false)
    private String password;
    @Column(nullable = false, unique = true)
    private String email;
    @Column(name = "full_name", nullable = false)
    private String fullName;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    private Role role;
    @Column(name = "loyalty_points")
    private Integer loyaltyPoints = 0;
    @Column(nullable = false)
    private boolean enabled = true;
    @Column(name = "forgot_password_token")
    private String forgotPasswordToken;
    @Column(name = "forgot_password_token_exp")
    private LocalDateTime forgotPasswordTokenExp;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public Integer getLoyaltyPoints() { return loyaltyPoints == null ? 0 : loyaltyPoints; }
    public void setLoyaltyPoints(Integer loyaltyPoints) { this.loyaltyPoints = loyaltyPoints; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getForgotPasswordToken() { return forgotPasswordToken; }
    public void setForgotPasswordToken(String forgotPasswordToken) { this.forgotPasswordToken = forgotPasswordToken; }
    public LocalDateTime getForgotPasswordTokenExp() { return forgotPasswordTokenExp; }
    public void setForgotPasswordTokenExp(LocalDateTime forgotPasswordTokenExp) { this.forgotPasswordTokenExp = forgotPasswordTokenExp; }
}
