package com.example.demo.controller;

import com.example.demo.service.CartService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.ui.Model;

@ControllerAdvice
public class GlobalModelControllerAdvice {
    private final CartService cartService;
    public GlobalModelControllerAdvice(CartService cartService) { this.cartService = cartService; }

    @ModelAttribute
    public void common(Model model, Authentication authentication) {
        model.addAttribute("cartCount", cartService.getCount());
        boolean loggedIn = authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(String.valueOf(authentication.getPrincipal()));
        String username = loggedIn ? authentication.getName() : null;
        boolean isAdmin = loggedIn && authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        model.addAttribute("currentUser", username);
        model.addAttribute("isAdmin", isAdmin);
        model.addAttribute("isLoggedIn", loggedIn);
    }
}
