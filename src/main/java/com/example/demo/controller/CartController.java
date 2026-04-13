package com.example.demo.controller;

import com.example.demo.service.AddressService;
import com.example.demo.service.CartService;
import com.example.demo.service.CouponService;
import com.example.demo.service.OrderService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import java.security.Principal;

@Controller
public class CartController {
    private final CartService cartService;
    private final OrderService orderService;
    private final CouponService couponService;
    private final AddressService addressService;
    private final double storeLat;
    private final double storeLon;
    private final long shippingPricePerKm;
    private final ObjectMapper objectMapper;
    public CartController(CartService cartService, OrderService orderService, CouponService couponService, AddressService addressService, ObjectMapper objectMapper,
                          @Value("${app.store.lat:10.776889}") double storeLat,
                          @Value("${app.store.lon:106.700806}") double storeLon,
                          @Value("${app.shipping.price-per-km:3000}") long shippingPricePerKm) {
        this.cartService = cartService; this.orderService = orderService; this.couponService = couponService; this.addressService = addressService; this.objectMapper = objectMapper; this.storeLat = storeLat; this.storeLon = storeLon; this.shippingPricePerKm = shippingPricePerKm; }

    @GetMapping("/cart")
    public String cart(Model model) {
        model.addAttribute("items", cartService.getItems());
        model.addAttribute("total", cartService.getTotal());
        return "cart/cart";
    }

    @PostMapping("/cart/add/{id}")
    public String add(@PathVariable Long id,
                      @RequestParam(required = false) String selectedSize,
                      @RequestParam(required = false) String selectedColor,
                      RedirectAttributes ra) {
        cartService.add(id, selectedSize, selectedColor);
        ra.addFlashAttribute("success", "Đã thêm sản phẩm vào giỏ hàng.");
        return "redirect:/cart";
    }

    @PostMapping("/cart/update")
    public String update(@RequestParam String lineKey, @RequestParam int quantity) {
        cartService.update(lineKey, quantity);
        return "redirect:/cart";
    }

    @PostMapping("/cart/update-options")
    public String updateOptions(@RequestParam String lineKey,
                                @RequestParam(required = false) String selectedSize,
                                @RequestParam(required = false) String selectedColor) {
        cartService.changeOptions(lineKey, selectedSize, selectedColor);
        return "redirect:/cart";
    }

    @RequestMapping(value = "/cart/remove", method = {RequestMethod.GET, RequestMethod.POST})
    public String remove(@RequestParam String lineKey) {
        cartService.remove(lineKey);
        return "redirect:/cart";
    }

    @GetMapping("/checkout/coupon-preview")
    @ResponseBody
    public Map<String, Object> previewCoupon(@RequestParam(required = false) String couponCode,
                                             @RequestParam(required = false) Double customerLat,
                                             @RequestParam(required = false) Double customerLon,
                                             Principal principal) {
        long subtotal = cartService.getTotal();
        var calc = couponService.validate(couponCode, subtotal, principal != null ? principal.getName() : null).orElse(null);
        long discount = calc != null ? calc.discount() : 0L;
        double shippingDistanceKm = orderService.estimateDistanceKm(customerLat, customerLon);
        long shippingFee = orderService.estimateShippingFee(customerLat, customerLon);
        long total = Math.max(0L, subtotal + shippingFee - discount);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", calc != null);
        body.put("couponCode", couponCode == null ? "" : couponCode.trim());
        body.put("couponMessage", calc != null ? calc.message() : "");
        body.put("subtotal", subtotal);
        body.put("discount", discount);
        body.put("shippingDistanceKm", shippingDistanceKm);
        body.put("shippingFee", shippingFee);
        body.put("total", total);
        return body;
    }


    @GetMapping("/checkout/address-search")
    @ResponseBody
    public List<Map<String, Object>> searchAddressApi(@RequestParam String q) {
        String keyword = q == null ? "" : q.trim();
        if (keyword.isBlank()) return List.of();
        try {
            String url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=vn&q="
                    + java.net.URLEncoder.encode(keyword, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .header("Accept-Language", "vi")
                    .header("User-Agent", "KingsportCheckout/1.0")
                    .timeout(Duration.ofSeconds(12))
                    .GET()
                    .build();
            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) return List.of();
            List<Map<String, Object>> raw = objectMapper.readValue(response.body(), new TypeReference<List<Map<String, Object>>>() {});
            List<Map<String, Object>> cleaned = new ArrayList<>();
            for (Map<String, Object> item : raw) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("lat", item.get("lat"));
                row.put("lon", item.get("lon"));
                row.put("display_name", item.getOrDefault("display_name", ""));
                cleaned.add(row);
            }
            return cleaned;
        } catch (Exception e) {
            return List.of();
        }
    }

    @GetMapping("/checkout")
    public String checkout(@RequestParam(required = false) String couponCode, Model model, Principal principal) {
        long subtotal = cartService.getTotal();
        var calc = couponService.validate(couponCode, subtotal, principal != null ? principal.getName() : null).orElse(null);
        long discount = calc != null ? calc.discount() : 0L;
        model.addAttribute("items", cartService.getItems());
        model.addAttribute("subtotal", subtotal);
        model.addAttribute("discount", discount);
        model.addAttribute("total", subtotal - discount);
        model.addAttribute("couponCode", couponCode == null ? "" : couponCode);
        model.addAttribute("storeLat", storeLat);
        model.addAttribute("storeLon", storeLon);
        model.addAttribute("shippingPricePerKm", shippingPricePerKm);
        model.addAttribute("couponMessage", calc != null ? calc.message() : "");
        if (principal != null) {
            model.addAttribute("savedAddress", addressService.defaultAddress(principal.getName()).orElse(null));
            model.addAttribute("myCoupons", couponService.myCoupons(principal.getName()));
        }
        return "cart/checkout";
    }

    @PostMapping("/checkout")
    public String doCheckout(@RequestParam String customerName,
                             @RequestParam String customerPhone,
                             @RequestParam String customerAddress,
                             @RequestParam(required = false) Double customerLat,
                             @RequestParam(required = false) Double customerLon,
                             @RequestParam(defaultValue = "cod") String paymentMethod,
                             @RequestParam(required = false) String couponCode,
                             @RequestParam(required = false) String note,
                             Principal principal, RedirectAttributes ra) {
        try {
            var order = orderService.checkout(new OrderService.CheckoutRequest(customerName, customerPhone, customerAddress, customerLat, customerLon, paymentMethod, couponCode, note), principal);
            ra.addFlashAttribute("success", "Đặt hàng thành công. Mã đơn: #" + order.getId());
            return "redirect:/orders";
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage() == null || e.getMessage().isBlank() ? "Không thể thanh toán lúc này." : e.getMessage());
            return "redirect:/checkout" + (couponCode != null && !couponCode.isBlank() ? "?couponCode=" + couponCode : "");
        }
    }
}
