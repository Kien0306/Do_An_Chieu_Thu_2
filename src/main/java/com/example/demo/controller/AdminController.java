package com.example.demo.controller;

import com.example.demo.model.Category;
import com.example.demo.model.Coupon;
import com.example.demo.model.OrderStatus;
import com.example.demo.service.*;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.security.Principal;

@Controller
public class AdminController {
    private final ProductService productService;
    private final OrderService orderService;
    private final UserAdminService userAdminService;
    private final CategoryService categoryService;
    private final LoyaltyService loyaltyService;
    private final CouponService couponService;
    private final InventoryService inventoryService;

    public AdminController(ProductService productService, OrderService orderService, UserAdminService userAdminService,
                           CategoryService categoryService, LoyaltyService loyaltyService, CouponService couponService,
                           InventoryService inventoryService) {
        this.productService = productService;
        this.orderService = orderService;
        this.userAdminService = userAdminService;
        this.categoryService = categoryService;
        this.loyaltyService = loyaltyService;
        this.couponService = couponService;
        this.inventoryService = inventoryService;
    }

    @GetMapping("/admin")
    public String admin(Model model) {
        model.addAttribute("products", productService.findAll());
        model.addAttribute("orders", orderService.findAll());
        model.addAttribute("users", userAdminService.findAll());
        model.addAttribute("categories", categoryService.findAll());
        model.addAttribute("revenueTotal", orderService.totalRevenue());
        model.addAttribute("topSellingProducts", orderService.topSellingProducts());
        model.addAttribute("statusCounts", orderService.statusCounts());
        return "admin/dashboard";
    }

    @GetMapping("/admin/orders")
    public String adminOrders(Model model) {
        model.addAttribute("orders", orderService.findAll());
        model.addAttribute("statuses", OrderStatus.values());
        return "admin/orders";
    }

    @PostMapping("/admin/orders/{id}/status")
    public String updateOrderStatus(@PathVariable Long id, @RequestParam OrderStatus status, RedirectAttributes ra) {
        orderService.updateStatus(id, status);
        ra.addFlashAttribute("success", "Đã cập nhật trạng thái đơn hàng.");
        return "redirect:/admin/orders";
    }

    @PostMapping("/admin/orders/{id}/payment-status")
    public String updatePaymentStatus(@PathVariable Long id, @RequestParam String paymentStatus, RedirectAttributes ra) {
        orderService.updatePaymentStatus(id, paymentStatus);
        ra.addFlashAttribute("success", "Đã cập nhật trạng thái thanh toán.");
        return "redirect:/admin/orders";
    }

    @PostMapping("/admin/orders/{id}/delivery-status")
    public String updateDeliveryStatus(@PathVariable Long id, @RequestParam String deliveryStatus, RedirectAttributes ra) {
        orderService.updateDeliveryStatus(id, deliveryStatus);
        ra.addFlashAttribute("success", "Đã cập nhật trạng thái giao hàng.");
        return "redirect:/admin/orders";
    }

    @RequestMapping(value = "/admin/orders/{id}/delete", method = {RequestMethod.POST, RequestMethod.GET})
    public String deleteOrder(@PathVariable Long id, RedirectAttributes ra) {
        orderService.delete(id);
        ra.addFlashAttribute("success", "Đã xóa đơn hàng.");
        return "redirect:/admin/orders";
    }

    @GetMapping("/admin/users")
    public String adminUsers(Model model) {
        model.addAttribute("users", userAdminService.findAll());
        return "admin/users";
    }

    @PostMapping("/admin/users/{id}/lock")
    public String lockUser(@PathVariable Long id, RedirectAttributes ra) {
        userAdminService.lock(id);
        ra.addFlashAttribute("success", "Đã khóa tài khoản.");
        return "redirect:/admin/users";
    }

    @PostMapping("/admin/users/{id}/unlock")
    public String unlockUser(@PathVariable Long id, RedirectAttributes ra) {
        userAdminService.unlock(id);
        ra.addFlashAttribute("success", "Đã mở khóa tài khoản.");
        return "redirect:/admin/users";
    }

    @RequestMapping(value = "/admin/users/{id}/delete", method = {RequestMethod.POST, RequestMethod.GET})
    public String deleteUser(@PathVariable Long id, RedirectAttributes ra) {
        userAdminService.delete(id);
        ra.addFlashAttribute("success", "Đã xóa vĩnh viễn người dùng.");
        return "redirect:/admin/users";
    }

    @GetMapping("/admin/inventory")
    public String adminInventory(Model model) {
        model.addAttribute("rows", inventoryService.rows());
        model.addAttribute("historyRows", inventoryService.historyRows());
        return "admin/inventory";
    }

    @PostMapping("/admin/inventory/{productId}/{sizeLabel}/in")
    public String importStock(@PathVariable Long productId, @PathVariable String sizeLabel, @RequestParam(defaultValue = "1") int quantity, RedirectAttributes ra) {
        inventoryService.importStock(productId, sizeLabel, quantity);
        ra.addFlashAttribute("success", "Đã nhập kho size " + sizeLabel + ".");
        return "redirect:/admin/inventory";
    }

    @PostMapping("/admin/inventory/{productId}/{sizeLabel}/out")
    public String exportStock(@PathVariable Long productId, @PathVariable String sizeLabel, @RequestParam(defaultValue = "1") int quantity, RedirectAttributes ra) {
        try {
            inventoryService.exportStock(productId, sizeLabel, quantity);
            ra.addFlashAttribute("success", "Đã xuất kho size " + sizeLabel + ".");
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin/inventory";
    }

    @GetMapping("/admin/coupons/payment")
    public String paymentCoupons(Model model) {
        model.addAttribute("coupons", couponService.paymentCouponsAdmin());
        return "admin/payment-coupons";
    }

    @GetMapping("/admin/coupons/payment/new")
    public String newPaymentCoupon(Model model) {
        Coupon coupon = new Coupon();
        coupon.setCouponType("fixed");
        coupon.setActive(true);
        model.addAttribute("coupon", coupon);
        model.addAttribute("pageTitle", "Thêm mã giảm giá");
        return "admin/payment-coupon-form";
    }

    @GetMapping("/admin/coupons/payment/{id}/edit")
    public String editPaymentCoupon(@PathVariable Long id, Model model) {
        model.addAttribute("coupon", couponService.findById(id));
        model.addAttribute("pageTitle", "Sửa mã giảm giá");
        return "admin/payment-coupon-form";
    }

    @PostMapping("/admin/coupons/payment/save")
    public String savePaymentCoupon(@ModelAttribute Coupon coupon, RedirectAttributes ra) {
        couponService.savePaymentCoupon(coupon);
        ra.addFlashAttribute("success", "Đã lưu mã giảm giá.");
        return "redirect:/admin/coupons/payment";
    }

    @PostMapping("/admin/coupons/payment/{id}/delete")
    public String deletePaymentCoupon(@PathVariable Long id, RedirectAttributes ra) {
        couponService.deleteById(id);
        ra.addFlashAttribute("success", "Đã xóa mã giảm giá.");
        return "redirect:/admin/coupons/payment";
    }

    @GetMapping("/admin/coupons/points")
    public String pointCoupons(Model model) {
        model.addAttribute("coupons", couponService.pointCouponsAdmin());
        return "admin/point-coupons";
    }

    @GetMapping("/admin/coupons/points/new")
    public String newPointCoupon(Model model) {
        Coupon coupon = new Coupon();
        coupon.setCouponType("fixed");
        coupon.setPointCoupon(true);
        coupon.setActive(true);
        model.addAttribute("coupon", coupon);
        model.addAttribute("pageTitle", "Thêm mã đổi điểm");
        return "admin/point-coupon-form";
    }

    @GetMapping("/admin/coupons/points/{id}/edit")
    public String editPointCoupon(@PathVariable Long id, Model model) {
        model.addAttribute("coupon", couponService.findById(id));
        model.addAttribute("pageTitle", "Sửa mã đổi điểm");
        return "admin/point-coupon-form";
    }

    @PostMapping("/admin/coupons/points/save")
    public String savePointCoupon(@ModelAttribute Coupon coupon, RedirectAttributes ra) {
        couponService.savePointCoupon(coupon);
        ra.addFlashAttribute("success", "Đã lưu mã đổi điểm.");
        return "redirect:/admin/coupons/points";
    }

    @PostMapping("/admin/coupons/points/{id}/delete")
    public String deletePointCoupon(@PathVariable Long id, RedirectAttributes ra) {
        couponService.deleteById(id);
        ra.addFlashAttribute("success", "Đã xóa mã đổi điểm.");
        return "redirect:/admin/coupons/points";
    }


    @GetMapping("/admin/coupons")
    public String adminCouponsRedirect() {
        return "redirect:/admin/coupons/payment";
    }

    @GetMapping("/admin/revenue")
    public String adminRevenue(Model model) {
        model.addAttribute("orders", orderService.findAll());
        model.addAttribute("revenueTotal", orderService.totalRevenue());
        model.addAttribute("dailyRevenue", orderService.revenueLast7Days());
        model.addAttribute("dailyScale", orderService.revenueLast7DaysScale());
        model.addAttribute("monthlyRevenue", orderService.revenueByMonth());
        model.addAttribute("monthlyScale", orderService.revenueByMonthScale());
        model.addAttribute("topSellingProducts", orderService.topSellingProducts());
        model.addAttribute("statusCounts", orderService.statusCounts());
        return "admin/revenue";
    }

    @GetMapping("/admin/categories")
    public String categories(Model model) {
        model.addAttribute("categories", categoryService.findAll());
        return "admin/categories";
    }

    @GetMapping("/admin/categories/new")
    public String newCategory(Model model) {
        model.addAttribute("category", new Category());
        model.addAttribute("pageTitle", "Thêm danh mục");
        model.addAttribute("pageSubtitle", "Tạo danh mục mới trong hệ thống.");
        return "admin/category-form";
    }

    @GetMapping("/admin/categories/{id}/edit")
    public String editCategory(@PathVariable Long id, Model model) {
        model.addAttribute("category", categoryService.findById(id));
        model.addAttribute("pageTitle", "Sửa danh mục");
        model.addAttribute("pageSubtitle", "Cập nhật thông tin danh mục trong hệ thống.");
        return "admin/category-form";
    }

    @PostMapping("/admin/categories/save")
    public String saveCategory(@ModelAttribute Category category, RedirectAttributes ra) {
        try {
            category.setDescription(null);
            categoryService.save(category);
            ra.addFlashAttribute("success", "Đã lưu danh mục.");
            return "redirect:/admin";
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
            return "redirect:" + (category.getId() == null ? "/admin/categories/new" : "/admin/categories/" + category.getId() + "/edit");
        }
    }

    @RequestMapping(value = "/admin/categories/{id}/delete", method = {RequestMethod.POST, RequestMethod.GET})
    public String deleteCategory(@PathVariable Long id, RedirectAttributes ra) {
        try {
            categoryService.deleteById(id);
            ra.addFlashAttribute("success", "Đã xóa danh mục.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin";
    }

    @GetMapping("/rewards")
    public String rewards(Model model, Principal principal) {
        model.addAttribute("rewardPoints", loyaltyService.pointsOf(principal.getName()));
        model.addAttribute("transactions", loyaltyService.history(principal.getName()));
        model.addAttribute("myCoupons", couponService.myCoupons(principal.getName()));
        model.addAttribute("rewardOptions", couponService.pointCouponsAdmin());
        return "cart/rewards";
    }

    @PostMapping("/rewards/redeem")
    public String redeem(@RequestParam int pointsCost, @RequestParam String title, @RequestParam String couponType,
                         @RequestParam long couponValue, @RequestParam(defaultValue = "0") long maxDiscount,
                         Principal principal, RedirectAttributes ra) {
        try {
            var coupon = loyaltyService.redeem(principal.getName(), pointsCost, title, couponType, couponValue, maxDiscount);
            ra.addFlashAttribute("success", "Đổi quà thành công. Mã của bạn: " + coupon.getCode());
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/rewards";
    }
}
