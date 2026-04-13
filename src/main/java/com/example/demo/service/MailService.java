package com.example.demo.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import com.example.demo.model.OrderEntity;

@Service
public class MailService {
    private final @Nullable JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;
    @Value("${spring.mail.username:no-reply@kingsport.local}")
    private String fromAddress;

    public MailService(@Nullable JavaMailSender mailSender, TemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }


    public boolean sendOrderConfirmationMail(String toEmail, OrderEntity order, long orderNumber) {
        Context context = new Context();
        context.setVariable("order", order);
        context.setVariable("fullName", order.getCustomerName());
        context.setVariable("orderNumber", orderNumber > 0 ? orderNumber : order.getId());
        String html = templateEngine.process("mail/order-confirmation-email", context);
        if (mailSender == null) return false;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(toEmail);
            helper.setFrom(fromAddress);
            helper.setSubject("[KINGSPORT] Xác nhận đặt hàng thành công - Đơn " + (orderNumber > 0 ? orderNumber : order.getId()));
            helper.setText(html, true);
            mailSender.send(message);
            return true;
        } catch (MailException | MessagingException ex) {
            System.out.println("[MAIL ERROR] " + ex.getMessage());
            return false;
        }
    }

    public boolean sendResetPasswordMail(String toEmail, String fullName, String token) {
        String resetUrl = appBaseUrl + "/reset-password/" + token;
        Context context = new Context();
        context.setVariable("fullName", fullName);
        context.setVariable("resetUrl", resetUrl);
        String html = templateEngine.process("mail/reset-password-email", context);
        if (mailSender == null) {
            System.out.println("[MAIL PREVIEW] To: " + toEmail + "\n" + html);
            return false;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(toEmail);
            helper.setFrom(fromAddress);
            helper.setSubject("[KINGSPORT] Đặt lại mật khẩu tài khoản");
            helper.setText(html, true);
            mailSender.send(message);
            return true;
        } catch (MailException | MessagingException ex) {
            System.out.println("[MAIL ERROR] " + ex.getMessage());
            return false;
        }
    }
}
