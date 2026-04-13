package com.example.demo.controller;

import com.example.demo.model.Product;
import com.example.demo.service.CategoryService;
import com.example.demo.service.InventoryService;
import com.example.demo.service.ProductService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Controller
public class ProductController {
    private final ProductService productService;
    private final CategoryService categoryService;
    private final InventoryService inventoryService;
    public ProductController(ProductService productService, CategoryService categoryService, InventoryService inventoryService) {
        this.productService = productService; this.categoryService = categoryService; this.inventoryService = inventoryService; }

    @GetMapping("/products")
    public String products(@RequestParam(required = false) String keyword,
                           @RequestParam(required = false) Long category,
                           @RequestParam(required = false) String gender,
                           @RequestParam(required = false, name = "size") List<String> sizes,
                           @RequestParam(required = false, name = "color") List<String> colors,
                           @RequestParam(required = false) String sort,
                           @RequestParam(required = false) String mode,
                           @RequestParam(defaultValue = "1") int page,
                           Model model) {
        List<String> safeSizes = sizes == null ? Collections.emptyList() : sizes;
        List<String> safeColors = colors == null ? Collections.emptyList() : colors;
        List<Product> matchedProducts = productService.search(keyword, category, gender, safeSizes, safeColors, sort, mode);
        int pageSize = 9;
        int totalPages = Math.max(1, (int) Math.ceil(matchedProducts.size() / (double) pageSize));
        int currentPage = Math.min(Math.max(page, 1), totalPages);
        int fromIndex = Math.min((currentPage - 1) * pageSize, matchedProducts.size());
        int toIndex = Math.min(fromIndex + pageSize, matchedProducts.size());
        List<Product> products = matchedProducts.subList(fromIndex, toIndex);

        model.addAttribute("products", products);
        model.addAttribute("totalProducts", matchedProducts.size());
        model.addAttribute("categories", categoryService.findAll());
        model.addAttribute("genders", productService.allGenders());
        model.addAttribute("sizes", productService.allSizes());
        model.addAttribute("colors", productService.allColors());
        Map<String,String> colorHexMap = new LinkedHashMap<>();
        for (String c : productService.allColors()) colorHexMap.put(c, productService.resolveColorHex(c));
        model.addAttribute("colorHexMap", colorHexMap);
        model.addAttribute("keyword", keyword == null ? "" : keyword);
        model.addAttribute("selectedCategory", category);
        model.addAttribute("selectedGender", gender == null ? "" : gender);
        model.addAttribute("selectedSizes", safeSizes);
        model.addAttribute("selectedColors", safeColors);
        model.addAttribute("sort", sort == null ? "" : sort);
        model.addAttribute("mode", mode == null ? "" : mode);
        model.addAttribute("currentPage", currentPage);
        model.addAttribute("totalPages", totalPages);
        return "product/products";
    }

    @GetMapping({"/product/{id}", "/products/{id}"})
    public String detail(@PathVariable Long id, Model model) {
        Product product = productService.findById(id);
        if (product == null) return "redirect:/products";
        Map<String, Integer> sizeStocks = inventoryService.sizeStocksForProduct(product);
        Map<String, String> colorMap = new LinkedHashMap<>();
        if (product.getColorsCsv() != null && !product.getColorsCsv().isBlank()) {
            for (String rawColor : product.getColorsCsv().split(",")) {
                if (rawColor == null || rawColor.isBlank()) continue;
                String label = rawColor.contains("|") ? rawColor.substring(0, rawColor.indexOf('|')).trim() : rawColor.trim();
                if (!label.isBlank()) colorMap.put(label, productService.resolveColorHex(rawColor));
            }
        }
        String defaultSize = sizeStocks.keySet().stream().findFirst().orElse("");
        Integer defaultStock = defaultSize.isBlank() ? 0 : sizeStocks.getOrDefault(defaultSize, 0);
        String defaultColor = colorMap.keySet().stream().findFirst().orElse("");
        model.addAttribute("product", product);
        model.addAttribute("sizeStocks", sizeStocks);
        model.addAttribute("colorMap", colorMap);
        model.addAttribute("defaultSelectedSize", defaultSize);
        model.addAttribute("defaultSelectedStock", defaultStock);
        model.addAttribute("defaultSelectedColor", defaultColor);
        model.addAttribute("relatedProducts", productService.findAll().stream()
                .filter(p -> p.getId() != null && !p.getId().equals(id))
                .filter(p -> product.getCategory() == null || (p.getCategory() != null && p.getCategory().getId().equals(product.getCategory().getId())))
                .limit(4)
                .toList());
        return "product/product-detail";
    }

    @GetMapping("/products/new")
    public String newProduct(Model model) {
        model.addAttribute("product", new Product());
        model.addAttribute("existingSizeStocks", java.util.Map.of());
        model.addAttribute("categories", categoryService.findAll());
        model.addAttribute("pageTitle", "Thêm sản phẩm");
        return "admin/product-form";
    }

    @GetMapping("/products/edit/{id}")
    public String editProduct(@PathVariable Long id, Model model) {
        Product product = productService.findById(id);
        model.addAttribute("product", product);
        model.addAttribute("existingSizeStocks", inventoryService.sizeStocksForProduct(product));
        model.addAttribute("categories", categoryService.findAll());
        model.addAttribute("pageTitle", "Sửa sản phẩm");
        return "admin/product-form";
    }

    @PostMapping("/products/save")
    public String saveProduct(@ModelAttribute Product product,
                              @RequestParam(required = false) Long categoryId,
                              @RequestParam(required = false) String sizeStocksJson,
                              @RequestParam(name = "localImage", required = false) MultipartFile localImage,
                              RedirectAttributes ra) {
        try {
            product.setCategory(categoryId != null ? categoryService.findById(categoryId) : null);
            if (localImage != null && !localImage.isEmpty()) {
                product.setImageUrl(productService.storeUploadedImage(localImage));
            }
            Product saved = productService.save(product);
            inventoryService.applySizeStocks(saved, sizeStocksJson);
            ra.addFlashAttribute("success", "Đã lưu sản phẩm thành công.");
            return "redirect:/products";
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage() == null ? "Không thể lưu sản phẩm." : e.getMessage());
            return "redirect:" + (product.getId() != null ? "/products/edit/" + product.getId() : "/products/new");
        }
    }

    @RequestMapping(value = "/products/delete/{id}", method = {RequestMethod.POST, RequestMethod.GET})
    public String deleteProduct(@PathVariable Long id, RedirectAttributes ra) {
        productService.deleteById(id);
        ra.addFlashAttribute("success", "Đã xóa sản phẩm.");
        return "redirect:/products";
    }
}
