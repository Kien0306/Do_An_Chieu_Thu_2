package com.example.demo.controller;

import com.example.demo.service.LoyaltyService;
import com.example.demo.service.OrderService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Controller
public class OrderController {
    private final OrderService orderService;
    private final LoyaltyService loyaltyService;
    public OrderController(OrderService orderService, LoyaltyService loyaltyService) { this.orderService = orderService; this.loyaltyService = loyaltyService; }

    @GetMapping("/orders")
    public String orders(Model model, Principal principal) {
        List<com.example.demo.model.OrderEntity> orders = orderService.findForUser(principal.getName());
        Map<Long, Long> orderNumbers = new LinkedHashMap<>();
        for (com.example.demo.model.OrderEntity order : orders) {
            if (order != null && order.getId() != null) {
                orderNumbers.put(order.getId(), orderService.displayOrderNumber(order));
            }
        }
        model.addAttribute("orders", orders);
        model.addAttribute("orderNumbers", orderNumbers);
        model.addAttribute("rewardPoints", loyaltyService.pointsOf(principal.getName()));
        return "cart/orders";
    }
}
