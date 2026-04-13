package com.example.demo.controller;

import com.example.demo.model.OrderEntity;
import com.example.demo.service.LoyaltyService;
import com.example.demo.service.OrderService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.security.Principal;

@Controller
public class OrderController {
    private final OrderService orderService;
    private final LoyaltyService loyaltyService;

    public OrderController(OrderService orderService, LoyaltyService loyaltyService) {
        this.orderService = orderService;
        this.loyaltyService = loyaltyService;
    }

    @GetMapping("/orders")
    public String orders(Model model, Principal principal) {
        model.addAttribute("orders", orderService.findForUser(principal.getName()));
        model.addAttribute("rewardPoints", loyaltyService.pointsOf(principal.getName()));
        return "cart/orders";
    }

    @GetMapping("/orders/{id}/momo-payment")
    public String momoPaymentGuide(@PathVariable Long id, Model model, Principal principal, RedirectAttributes ra) {
        OrderEntity order = orderService.findById(id);
        if (order == null || principal == null || order.getUser() == null || !principal.getName().equals(order.getUser().getUsername())) {
            ra.addFlashAttribute("error", "Không tìm thấy đơn hàng thanh toán QR phù hợp.");
            return "redirect:/orders";
        }
        if (!orderService.requiresManualTransfer(order.getPaymentMethod())) {
            ra.addFlashAttribute("error", "Đơn hàng này không dùng phương thức thanh toán QR MoMo.");
            return "redirect:/orders";
        }

        model.addAttribute("order", order);
        model.addAttribute("momoQrImageUrl", orderService.getMomoQrImageUrl());
        model.addAttribute("transferContent", orderService.transferContentFor(order));
        model.addAttribute("paymentStatusLabel", orderService.paymentStatusLabel(order.getPaymentStatus()));
        return "cart/momo-payment";
    }

    @PostMapping("/orders/{id}/momo-payment/confirmed")
    public String momoPaymentConfirmed(@PathVariable Long id, Principal principal, RedirectAttributes ra) {
        OrderEntity order = orderService.findById(id);
        if (order == null || principal == null || order.getUser() == null || !principal.getName().equals(order.getUser().getUsername())) {
            ra.addFlashAttribute("error", "Không tìm thấy đơn hàng thanh toán QR phù hợp.");
            return "redirect:/orders";
        }
        orderService.updatePaymentStatus(order.getId(), "paid");
        ra.addFlashAttribute("success", "Đã cập nhật đơn #" + order.getId() + " sang trạng thái đã thanh toán.");
        return "redirect:/orders";
    }
}
