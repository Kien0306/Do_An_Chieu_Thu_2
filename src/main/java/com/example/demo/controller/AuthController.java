package com.example.demo.controller;

import com.example.demo.service.AuthService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class AuthController {
    private final AuthService authService;
    public AuthController(AuthService authService) { this.authService = authService; }

    @GetMapping("/login")
    public String login() { return "login"; }

    @GetMapping("/register")
    public String register() { return "register"; }

    @PostMapping("/register")
    public String doRegister(@RequestParam String username, @RequestParam String email, @RequestParam String fullName,
                             @RequestParam String password, RedirectAttributes ra) {
        try {
            authService.register(username, email, fullName, password);
            ra.addFlashAttribute("success", "Đăng ký thành công. Hãy đăng nhập.");
            return "redirect:/login";
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
            return "redirect:/register";
        }
    }

    @GetMapping("/forgot-password")
    public String forgotPassword() { return "forgot-password"; }

    @PostMapping("/forgot-password")
    public String submitForgotPassword(@RequestParam String email, RedirectAttributes ra) {
        try {
            authService.createResetToken(email);
            ra.addFlashAttribute("success", "Nếu email tồn tại trong hệ thống, liên kết đổi mật khẩu sẽ được gửi tới hộp thư của bạn.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/forgot-password";
    }

    @GetMapping("/reset-password/{token}")
    public String resetPassword(@PathVariable String token, Model model, RedirectAttributes ra) {
        if (!authService.isResetTokenValid(token)) {
            ra.addFlashAttribute("error", "Liên kết đổi mật khẩu không hợp lệ hoặc đã hết hạn.");
            return "redirect:/forgot-password";
        }
        model.addAttribute("token", token);
        return "reset-password";
    }

    @PostMapping("/reset-password/{token}")
    public String doResetPassword(@PathVariable String token, @RequestParam String password, @RequestParam(required = false) String confirmPassword, RedirectAttributes ra) {
        try {
            if (confirmPassword != null && !confirmPassword.equals(password)) throw new IllegalArgumentException("Mật khẩu xác nhận không khớp.");
            authService.resetPassword(token, password);
            ra.addFlashAttribute("success", "Đổi mật khẩu thành công. Hãy đăng nhập lại.");
            return "redirect:/login";
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
            return "redirect:/forgot-password";
        }
    }
}
