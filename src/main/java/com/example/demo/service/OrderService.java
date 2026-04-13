package com.example.demo.service;

import com.example.demo.model.*;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Principal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class OrderService {
    public record RevenueBar(String label, long total, int heightPercent) {}
    public record TopSellingItem(String name, String category, long soldCount, int widthPercent) {}
    public record AxisScale(String topLabel, String middleLabel, long maxValue) {}
    public record CheckoutRequest(String customerName,
                                  String customerPhone,
                                  String customerAddress,
                                  Double customerLat,
                                  Double customerLon,
                                  String paymentMethod,
                                  String couponCode,
                                  String note) {}

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CartService cartService;
    private final CouponService couponService;
    private final LoyaltyService loyaltyService;
    private final AddressService addressService;
    private final MailService mailService;
    private final ProductService productService;
    private final InventoryService inventoryService;
    private final double storeLat;
    private final double storeLon;
    private final long shippingPricePerKm;
    private final ObjectMapper objectMapper;
    private final String momoQrImageUrl;
    private final String bankTransferPrefix;

    public OrderService(OrderRepository orderRepository,
                        UserRepository userRepository,
                        CartService cartService,
                        CouponService couponService,
                        LoyaltyService loyaltyService,
                        AddressService addressService,
                        MailService mailService,
                        ProductService productService,
                        InventoryService inventoryService,
                        ObjectMapper objectMapper,
                        @Value("${app.store.lat:10.776889}") double storeLat,
                        @Value("${app.store.lon:106.700806}") double storeLon,
                        @Value("${app.shipping.price-per-km:3000}") long shippingPricePerKm,
                        @Value("${app.payment.momo-qr-image:/images/momo-qr-user.png}") String momoQrImageUrl,
                        @Value("${app.payment.transfer-prefix:DH}") String bankTransferPrefix) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.cartService = cartService;
        this.couponService = couponService;
        this.loyaltyService = loyaltyService;
        this.addressService = addressService;
        this.mailService = mailService;
        this.productService = productService;
        this.inventoryService = inventoryService;
        this.objectMapper = objectMapper;
        this.storeLat = storeLat;
        this.storeLon = storeLon;
        this.shippingPricePerKm = shippingPricePerKm;
        this.momoQrImageUrl = momoQrImageUrl;
        this.bankTransferPrefix = bankTransferPrefix;
    }

    public List<OrderEntity> findAll() {
        return orderRepository.findAll().stream()
                .filter(o -> !isDeleted(o))
                .sorted(Comparator.comparing(OrderEntity::getId))
                .toList();
    }

    public List<OrderEntity> findForUser(String username) {
        return userRepository.findByUsername(username)
                .map(orderRepository::findByUserOrderByCreatedAtDesc)
                .map(list -> list.stream()
                        .filter(o -> !isDeleted(o))
                        .sorted(Comparator.comparing(OrderEntity::getId))
                        .toList())
                .orElse(List.of());
    }

    public OrderEntity findById(Long id) { return orderRepository.findById(id).orElse(null); }

    public void updateStatus(Long id, OrderStatus status) {
        OrderEntity order = findById(id);
        if (order == null) return;
        order.setStatus(status);
        if (status == OrderStatus.COMPLETED || status == OrderStatus.PAID) order.setPaymentStatus("paid");
        if (status == OrderStatus.SHIPPING) order.setDeliveryStatus("shipping");
        if (status == OrderStatus.COMPLETED) order.setDeliveryStatus("delivered");
        orderRepository.save(order);
    }

    public void updatePaymentStatus(Long id, String paymentStatus) {
        OrderEntity order = findById(id);
        if (order == null) return;
        String normalized = paymentStatus == null ? "pending" : paymentStatus.trim().toLowerCase(Locale.ROOT);
        if ("awaiting".equals(normalized)) {
            normalized = "awaiting_transfer";
        }
        if (!Set.of("pending", "awaiting_transfer", "paid").contains(normalized)) {
            normalized = "pending";
        }
        order.setPaymentStatus(normalized);
        if ("paid".equals(normalized)) {
            order.setStatus(OrderStatus.PAID);
        } else if (order.getStatus() == OrderStatus.PAID) {
            order.setStatus(OrderStatus.PENDING);
        }
        orderRepository.save(order);
    }

    public void updateDeliveryStatus(Long id, String deliveryStatus) {
        OrderEntity order = findById(id);
        if (order == null) return;
        order.setDeliveryStatus(deliveryStatus);
        if ("shipping".equalsIgnoreCase(deliveryStatus)) order.setStatus(OrderStatus.SHIPPING);
        else if ("delivered".equalsIgnoreCase(deliveryStatus)) order.setStatus(OrderStatus.COMPLETED);
        else if (order.getStatus() == OrderStatus.SHIPPING || order.getStatus() == OrderStatus.COMPLETED) order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order);
    }

    @Transactional
    public void delete(Long id) {
        OrderEntity order = findById(id);
        if (order == null) return;
        order.setCustomerName("__deleted__" + order.getId());
        order.setCustomerPhone("-");
        order.setCustomerAddress("-");
        order.setCouponCode("");
        order.setPaymentStatus("deleted");
        order.setDeliveryStatus("deleted");
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
    }

    @Transactional
    public OrderEntity checkout(CheckoutRequest request, Principal principal) {
        if (cartService.isEmpty()) throw new IllegalStateException("Giỏ hàng đang trống.");

        long subtotal = cartService.getTotal();
        String username = principal != null ? principal.getName() : null;
        CouponService.CouponCalculation calc = couponService.validate(request.couponCode(), subtotal, username).orElse(null);
        long discount = calc != null ? calc.discount() : 0L;
        double shippingDistanceKm = calculateDistanceKm(request.customerLat(), request.customerLon());
        long shippingFee = calculateShippingFee(shippingDistanceKm);

        OrderEntity order = new OrderEntity();
        order.setCustomerName(request.customerName());
        order.setCustomerPhone(request.customerPhone());
        order.setCustomerAddress(request.customerAddress());
        order.setPaymentMethod(normalizePaymentMethod(request.paymentMethod()));
        order.setPaymentStatus(requiresManualTransfer(order.getPaymentMethod()) ? "awaiting_transfer" : "pending");
        order.setDeliveryStatus("pending");
        order.setStatus(OrderStatus.PENDING);
        order.setOriginalAmount(subtotal);
        order.setDiscountAmount(discount);
        order.setShippingDistanceKm(shippingDistanceKm);
        order.setShippingFee(shippingFee);
        order.setCouponCode(request.couponCode() == null ? "" : request.couponCode().trim());
        order.setTotalAmount(Math.max(0L, subtotal + shippingFee - discount));

        if (username != null) {
            UserAccount user = userRepository.findByUsername(username).orElse(null);
            order.setUser(user);
            addressService.saveOrUpdateDefault(username, request.customerName(), request.customerPhone(), request.customerAddress());
        }

        List<OrderItem> items = new ArrayList<>();
        for (CartService.CartLine line : cartService.getItems()) {
            if (line == null || line.getProduct() == null) continue;
            Product product = line.getProduct() != null && line.getProduct().getId() != null ? productService.findById(line.getProduct().getId()) : null;
            if (product == null) continue;
            String selectedSize = line.getSelectedSize();
            if (selectedSize == null || selectedSize.isBlank()) {
                String[] sizes = product.getSizes();
                selectedSize = (sizes != null && sizes.length > 0) ? sizes[0].trim() : "";
            }
            int quantity = Math.max(1, line.getQuantity());
            if (selectedSize != null && !selectedSize.isBlank()) {
                inventoryService.exportStock(product.getId(), selectedSize, quantity);
            } else {
                product.setStock(Math.max(0, (product.getStock() == null ? 0 : product.getStock()) - quantity));
                product.setSoldCount((product.getSoldCount() == null ? 0 : product.getSoldCount()) + quantity);
                productService.save(product);
            }
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setTitle(product.getName());
            item.setSelectedSize(selectedSize);
            item.setColorName(line.getSelectedColor());
            item.setPrice(product.getPrice());
            item.setQuantity(quantity);
            item.setSubtotal(product.getPrice() * quantity);
            items.add(item);
        }
        if (items.isEmpty()) throw new IllegalStateException("Giỏ hàng không hợp lệ hoặc đã hết dữ liệu sản phẩm.");
        order.setItems(items);

        OrderEntity saved = orderRepository.save(order);
        if (calc != null && discount > 0) {
            try {
                couponService.consume(calc.coupon().getCode(), username);
            } catch (Exception ignored) {}
        }
        if (saved.getUser() != null) {
            try {
                loyaltyService.awardOrderPoints(saved.getUser(), saved.getTotalAmount(), saved.getId());
            } catch (Exception ignored) {}
            try {
                if (saved.getUser().getEmail() != null && !saved.getUser().getEmail().isBlank()) {
                    mailService.sendOrderConfirmationMail(saved.getUser().getEmail(), saved);
                }
            } catch (Exception ignored) {}
        }
        cartService.clear();
        return saved;
    }

    public long totalRevenue() {
        return paidOrders().stream()
                .filter(Objects::nonNull)
                                .mapToLong(OrderEntity::getTotalAmount)
                .sum();
    }

    public Map<OrderStatus, Long> statusCounts() {
        Map<OrderStatus, Long> map = new EnumMap<>(OrderStatus.class);
        for (OrderStatus status : OrderStatus.values()) {
            map.put(status, 0L);
        }

        for (OrderEntity order : findAll()) {
            if (order == null || order.getStatus() == null) {
                continue;
            }
            map.put(order.getStatus(), map.getOrDefault(order.getStatus(), 0L) + 1);
        }
        return map;
    }

    public List<RevenueBar> revenueLast7Days() {
        Map<LocalDate, Long> byDay = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            byDay.put(today.minusDays(i), 0L);
        }

        for (OrderEntity order : paidOrders()) {
            if (order == null || order.getCreatedAt() == null) {
                continue;
            }
            LocalDate date = order.getCreatedAt().toLocalDate();
            if (byDay.containsKey(date)) {
                byDay.put(date, byDay.get(date) + order.getTotalAmount());
            }
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM/dd");
        long axisMax = 10_000_000L;
        List<RevenueBar> rows = byDay.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .map(e -> new RevenueBar(e.getKey().format(fmt), e.getValue(), percentForChart(e.getValue(), axisMax)))
                .toList();
        return rows.isEmpty() ? List.of(new RevenueBar(today.format(fmt), 0L, 0)) : rows;
    }

    public AxisScale revenueLast7DaysScale() {
        return new AxisScale("10tr", "5tr", 10_000_000L);
    }

    public List<RevenueBar> revenueByMonth() {
        Map<String, Long> byMonth = new LinkedHashMap<>();
        for (OrderEntity order : paidOrders()) {
            if (order == null || order.getCreatedAt() == null) {
                continue;
            }
            String key = "Tháng " + order.getCreatedAt().getMonthValue();
            byMonth.put(key, byMonth.getOrDefault(key, 0L) + order.getTotalAmount());
        }
        if (byMonth.isEmpty()) {
            byMonth.put("Tháng " + LocalDate.now().getMonthValue(), 0L);
        }
        long axisMax = 100_000_000L;
        return byMonth.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .map(e -> new RevenueBar(e.getKey(), e.getValue(), percentForChart(e.getValue(), axisMax)))
                .toList();
    }

    public AxisScale revenueByMonthScale() {
        return new AxisScale("100tr", "50tr", 100_000_000L);
    }

    public List<TopSellingItem> topSellingProducts() {
        Map<String, Long> totals = new LinkedHashMap<>();
        Map<String, String> cats = new HashMap<>();

        for (OrderEntity order : paidOrders()) {
            if (order == null || order.getItems() == null) {
                continue;
            }

            for (OrderItem item : order.getItems()) {
                if (item == null || item.getTitle() == null || item.getTitle().isBlank()) {
                    continue;
                }

                String key = item.getTitle();
                long qty = item.getQuantity() == null ? 0L : item.getQuantity().longValue();
                totals.put(key, totals.getOrDefault(key, 0L) + qty);

                String category = "Khác";
                if (item.getProduct() != null
                        && item.getProduct().getCategory() != null
                        && item.getProduct().getCategory().getName() != null) {
                    category = item.getProduct().getCategory().getName();
                }
                cats.put(key, category);
            }
        }

        long max = totals.values().stream().mapToLong(Long::longValue).max().orElse(1L);
        return totals.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(6)
                .map(e -> new TopSellingItem(
                        e.getKey(),
                        cats.getOrDefault(e.getKey(), "Khác"),
                        e.getValue(),
                        (int) Math.max(12, Math.round((e.getValue() * 100.0) / max))
                ))
                .toList();
    }

    public double estimateDistanceKm(Double customerLat, Double customerLon) {
        return calculateDistanceKm(customerLat, customerLon);
    }

    public long estimateShippingFee(Double customerLat, Double customerLon) {
        return calculateShippingFee(calculateDistanceKm(customerLat, customerLon));
    }

    public String getMomoQrImageUrl() {
        return momoQrImageUrl;
    }

    public String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null) return "cod";
        if ("momo".equalsIgnoreCase(paymentMethod) || "bank".equalsIgnoreCase(paymentMethod)) return "momo";
        return "cod";
    }

    public String paymentMethodLabel(String paymentMethod) {
        return requiresManualTransfer(paymentMethod) ? "Thanh toán QR MoMo" : "Thanh toán khi nhận hàng";
    }


    public String statusLabel(OrderStatus status) {
        if (status == null) return "Đang xử lý";
        return switch (status) {
            case PAID -> "Đã thanh toán";
            case SHIPPING -> "Đang giao";
            case COMPLETED -> "Hoàn thành";
            case CANCELLED -> "Đã hủy";
            default -> "Đang xử lý";
        };
    }

    public String paymentStatusLabel(String paymentStatus) {
        if (paymentStatus == null || paymentStatus.isBlank()) return "Chưa thanh toán";
        return switch (paymentStatus.toLowerCase(Locale.ROOT)) {
            case "awaiting", "awaiting_transfer" -> "Chờ thanh toán QR";
            case "paid" -> "Đã thanh toán";
            case "deleted" -> "Đã xóa";
            default -> "Chưa thanh toán";
        };
    }

    public String deliveryStatusLabel(String deliveryStatus) {
        if (deliveryStatus == null || deliveryStatus.isBlank()) return "Chưa giao";
        return switch (deliveryStatus.toLowerCase(Locale.ROOT)) {
            case "shipping" -> "Đang giao";
            case "delivered" -> "Đã giao";
            case "deleted" -> "Đã xóa";
            default -> "Chưa giao";
        };
    }

    public String orderStatusClass(OrderStatus status) {
        if (status == null) return "status-processing";
        return switch (status) {
            case PAID -> "status-paid";
            case SHIPPING -> "status-shipping";
            case COMPLETED -> "status-completed";
            case CANCELLED -> "status-cancelled";
            default -> "status-processing";
        };
    }

    public String paymentStatusClass(String paymentStatus) {
        if (paymentStatus == null || paymentStatus.isBlank()) return "status-processing";
        return switch (paymentStatus.toLowerCase(Locale.ROOT)) {
            case "awaiting", "awaiting_transfer" -> "status-processing";
            case "paid" -> "status-paid";
            case "deleted" -> "status-cancelled";
            default -> "status-processing";
        };
    }

    public String deliveryStatusClass(String deliveryStatus) {
        if (deliveryStatus == null || deliveryStatus.isBlank()) return "status-processing";
        return switch (deliveryStatus.toLowerCase(Locale.ROOT)) {
            case "shipping" -> "status-shipping";
            case "delivered" -> "status-completed";
            case "deleted" -> "status-cancelled";
            default -> "status-processing";
        };
    }

    public boolean requiresManualTransfer(String paymentMethod) {
        return "momo".equalsIgnoreCase(paymentMethod) || "bank".equalsIgnoreCase(paymentMethod);
    }

    public boolean shouldShowManualTransferBox(OrderEntity order) {
        if (order == null || !requiresManualTransfer(order.getPaymentMethod())) return false;
        String paymentStatus = order.getPaymentStatus();
        if (paymentStatus == null) return true;
        String normalized = paymentStatus.trim().toLowerCase(Locale.ROOT);
        return !"paid".equals(normalized) && !"deleted".equals(normalized);
    }

    public String transferContentFor(OrderEntity order) {
        if (order == null || order.getId() == null) return bankTransferPrefix + "TEMP";
        String digits = order.getCustomerPhone() == null ? "" : order.getCustomerPhone().replaceAll("\\D", "");
        String phoneSuffix = digits.length() <= 4 ? digits : digits.substring(digits.length() - 4);
        return (bankTransferPrefix == null || bankTransferPrefix.isBlank() ? "DH" : bankTransferPrefix.trim())
                + order.getId()
                + (phoneSuffix.isBlank() ? "" : "_" + phoneSuffix);
    }

    private double calculateDistanceKm(Double customerLat, Double customerLon) {
        if (customerLat == null || customerLon == null) return 0D;
        Double routedKm = fetchRouteDistanceKm(customerLat, customerLon);
        if (routedKm != null && routedKm > 0D) {
            return Math.round(routedKm * 100.0D) / 100.0D;
        }
        double earthRadiusKm = 6371.0D;
        double latDistance = Math.toRadians(customerLat - storeLat);
        double lonDistance = Math.toRadians(customerLon - storeLon);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(storeLat)) * Math.cos(Math.toRadians(customerLat))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(earthRadiusKm * c * 100.0D) / 100.0D;
    }

    private long calculateShippingFee(double distanceKm) {
        if (distanceKm <= 0D) return 0L;
        return Math.round(distanceKm * shippingPricePerKm);
    }

    private Double fetchRouteDistanceKm(Double customerLat, Double customerLon) {
        try {
            String url = String.format(java.util.Locale.US,
                    "https://router.project-osrm.org/route/v1/driving/%f,%f;%f,%f?overview=false&alternatives=false&steps=false",
                    storeLon, storeLat, customerLon, customerLat);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .header("User-Agent", "KingsportCheckout/1.0")
                    .timeout(Duration.ofSeconds(12))
                    .GET()
                    .build();
            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) return null;
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode routes = root.path("routes");
            if (!routes.isArray() || routes.isEmpty()) return null;
            double meters = routes.get(0).path("distance").asDouble(0D);
            if (meters <= 0D) return null;
            return meters / 1000.0D;
        } catch (Exception e) {
            return null;
        }
    }

    private List<OrderEntity> paidOrders() {
        return findAll().stream()
                .filter(Objects::nonNull)
                .filter(o -> o.getStatus() != null)
                .filter(o -> o.getStatus() == OrderStatus.PAID
                        || o.getStatus() == OrderStatus.COMPLETED
                        || o.getStatus() == OrderStatus.SHIPPING)
                .toList();
    }

    private boolean isDeleted(OrderEntity order) {
        return order == null || (order.getCustomerName() != null && order.getCustomerName().startsWith("__deleted__"));
    }

    private long axisMax(Collection<Long> values, long minStep) {
        long max = values.stream().mapToLong(Long::longValue).max().orElse(0L);
        if (max <= 0) return minStep;
        long rounded = ((max + minStep - 1) / minStep) * minStep;
        return Math.max(minStep, rounded);
    }

    private int percentForChart(long total, long axisMax) {
        if (axisMax <= 0) return 0;
        return (int) Math.max(6, Math.min(100, Math.round((total * 100.0) / axisMax)));
    }

    private String formatCompactMoney(long value) {
        if (value >= 1_000_000L) {
            long tr = Math.round(value / 1_000_000.0);
            return tr + "tr";
        }
        if (value >= 1_000L) {
            long k = Math.round(value / 1_000.0);
            return k + "k";
        }
        return value + "đ";
    }
}
