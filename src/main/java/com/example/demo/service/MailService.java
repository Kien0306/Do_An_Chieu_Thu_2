package com.example.demo.service;

import com.example.demo.model.OrderEntity;
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

@Service
public class MailService {
    private final @Nullable JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    @Value("${spring.mail.username:no-reply@kingsport.local}")
    private String fromAddress;

    @Value("${app.payment.momo-qr-image:/images/momo-qr-user.png}")
    private String momoQrImageUrl;

    @Value("${app.payment.transfer-prefix:DH}")
    private String bankTransferPrefix;

    public MailService(@Nullable JavaMailSender mailSender, TemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    public boolean sendOrderConfirmationMail(String toEmail, OrderEntity order) {
        Context context = new Context();
        context.setVariable("order", order);
        context.setVariable("fullName", order.getCustomerName());
        context.setVariable("momoQrImageUrl", appBaseUrl + momoQrImageUrl);
        context.setVariable("transferContent", transferContentFor(order));
        context.setVariable("transferUrl", appBaseUrl + "/orders/" + order.getId() + "/momo-payment");
        String html = templateEngine.process("mail/order-confirmation-email", context);
        if (mailSender == null) {
            System.out.println("[MAIL PREVIEW] To: " + toEmail + "\n" + html);
            return false;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(toEmail);
            helper.setFrom(fromAddress);
            helper.setSubject("[KINGSPORT] Xác nhận đặt hàng thành công - Đơn " + order.getId());
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

    private String transferContentFor(OrderEntity order) {
        if (order == null || order.getId() == null) return (bankTransferPrefix == null || bankTransferPrefix.isBlank() ? "DH" : bankTransferPrefix) + "TEMP";
        String digits = order.getCustomerPhone() == null ? "" : order.getCustomerPhone().replaceAll("\\D", "");
        String phoneSuffix = digits.length() <= 4 ? digits : digits.substring(digits.length() - 4);
        String prefix = bankTransferPrefix == null || bankTransferPrefix.isBlank() ? "DH" : bankTransferPrefix.trim();
        return prefix + order.getId() + (phoneSuffix.isBlank() ? "" : "_" + phoneSuffix);
    }
}
