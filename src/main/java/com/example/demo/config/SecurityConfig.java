package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/css/**", "/js/**", "/images/**", "/assets/**", "/uploads/**", "/register", "/login", "/forgot-password", "/reset-password/**", "/", "/products", "/product/**", "/products/*").permitAll()
                .requestMatchers("/products/new", "/products/edit/**", "/products/save", "/products/delete/**", "/admin/**").hasRole("ADMIN")
                .requestMatchers("/cart/**", "/checkout", "/orders", "/rewards").authenticated()
                .anyRequest().permitAll())
            .formLogin(form -> form.loginPage("/login").defaultSuccessUrl("/", true).permitAll())
            .logout(logout -> logout.logoutSuccessUrl("/").permitAll());
        return http
                .csrf(csrf -> csrf.disable()).build();
    }
}
