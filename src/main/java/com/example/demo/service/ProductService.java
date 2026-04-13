package com.example.demo.service;

import com.example.demo.model.Product;
import com.example.demo.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Base64;

@Service
public class ProductService {
    private final ProductRepository productRepository;
    public ProductService(ProductRepository productRepository) { this.productRepository = productRepository; }
    public List<Product> findAll() { return productRepository.findAll().stream().filter(p -> !Boolean.TRUE.equals(p.getDeleted())).sorted(Comparator.comparing(Product::getId, Comparator.nullsLast(Long::compareTo)).reversed()).toList(); }

    private String normalizeBasic(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private String extractColorName(String raw) {
        String value = normalizeBasic(raw);
        int idx = value.indexOf('|');
        return idx >= 0 ? normalizeBasic(value.substring(0, idx)) : value;
    }

    private String extractColorHex(String raw) {
        String value = normalizeBasic(raw);
        int idx = value.indexOf('|');
        if (idx >= 0) {
            String hex = normalizeBasic(value.substring(idx + 1));
            if (hex.matches("(?i)^#[0-9a-f]{6}$")) return hex.toLowerCase(Locale.ROOT);
        }
        if (value.matches("(?i)^#[0-9a-f]{6}$")) return value.toLowerCase(Locale.ROOT);
        return "";
    }

    public List<Product> search(String keyword, Long categoryId, String gender, List<String> sizes, List<String> colors, String sort, String mode) {
        List<Product> products = findAll();
        if (keyword != null && !keyword.isBlank()) {
            String key = keyword.trim().toLowerCase();
            products = products.stream().filter(p -> p.getName() != null && p.getName().toLowerCase().contains(key)).collect(Collectors.toList());
        }
        if (categoryId != null) {
            products = products.stream()
                    .filter(p -> p.getCategory() != null && categoryId.equals(p.getCategory().getId()))
                    .collect(Collectors.toList());
        }
        if (gender != null && !gender.isBlank()) {
            String g = gender.trim().toLowerCase();
            products = products.stream().filter(p -> p.getGender() != null && p.getGender().equalsIgnoreCase(g)).collect(Collectors.toList());
        }
        if (sizes != null && !sizes.isEmpty()) {
            Set<String> wantedSizes = sizes.stream().filter(Objects::nonNull).map(this::normalizeBasic).filter(s -> !s.isEmpty()).map(String::toLowerCase).collect(Collectors.toSet());
            if (!wantedSizes.isEmpty()) {
                products = products.stream()
                        .filter(p -> Arrays.stream(p.getSizes()).map(this::normalizeBasic).map(String::toLowerCase).anyMatch(wantedSizes::contains))
                        .collect(Collectors.toList());
            }
        }
        if (colors != null && !colors.isEmpty()) {
            Set<String> wantedColors = colors.stream().filter(Objects::nonNull).map(this::extractColorName).filter(s -> !s.isEmpty()).map(String::toLowerCase).collect(Collectors.toSet());
            if (!wantedColors.isEmpty()) {
                products = products.stream()
                        .filter(p -> Arrays.stream(p.getColors()).map(this::extractColorName).map(String::toLowerCase).anyMatch(wantedColors::contains))
                        .collect(Collectors.toList());
            }
        }

        if (mode != null && !mode.isBlank()) {
            String normalizedMode = mode.trim().toLowerCase();
            if ("featured".equals(normalizedMode)) {
                products = products.stream().filter(p -> Boolean.TRUE.equals(p.getFeatured())).collect(Collectors.toList());
            } else if ("best-selling".equals(normalizedMode) || "bestselling".equals(normalizedMode)) {
                products = products.stream()
                        .filter(p -> (p.getSoldCount() == null ? 0 : p.getSoldCount()) > 0)
                        .sorted(Comparator.comparingInt((Product p) -> p.getSoldCount() == null ? 0 : p.getSoldCount()).reversed())
                        .collect(Collectors.toList());
            }
        }
        if (sort != null && !sort.isBlank()) {
            Comparator<Product> comparator = switch (sort) {
                case "price_asc" -> Comparator.comparingLong(Product::getPrice);
                case "price_desc" -> Comparator.comparingLong(Product::getPrice).reversed();
                case "name_asc" -> Comparator.comparing(Product::getName, String.CASE_INSENSITIVE_ORDER);
                default -> null;
            };
            if (comparator != null) products = products.stream().sorted(comparator).collect(Collectors.toList());
        }
        return products;
    }



    public String storeUploadedImage(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.startsWith("image/")) throw new IllegalArgumentException("File tải lên phải là ảnh.");
        if (file.getSize() > 10L * 1024L * 1024L) throw new IllegalArgumentException("Ảnh tải lên quá lớn.");
        try {
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            return "data:" + contentType + ";base64," + base64;
        } catch (IOException e) {
            throw new IllegalStateException("Không thể lưu file ảnh.");
        }
    }

    public Product findById(Long id) {
        Product product = productRepository.findById(id).orElse(null);
        return product != null && !Boolean.TRUE.equals(product.getDeleted()) ? product : null;
    }
    public Product save(Product product) {
        if (product == null) throw new IllegalArgumentException("Dữ liệu sản phẩm không hợp lệ.");
        if (product.getDeleted() == null) product.setDeleted(false);
        if (product.getName() != null) product.setName(product.getName().trim());
        if (product.getName() == null || product.getName().isBlank()) throw new IllegalArgumentException("Vui lòng nhập tên sản phẩm.");
        if (product.getSizesCsv() == null) product.setSizesCsv("");
        if (product.getColorsCsv() == null) product.setColorsCsv("");
        product.setSizesCsv(Arrays.stream(product.getSizes())
                .map(this::normalizeBasic)
                .filter(s -> !s.isBlank())
                .distinct()
                .collect(Collectors.joining(",")));
        product.setColorsCsv(Arrays.stream(product.getColorsCsv().split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(entry -> {
                    String name = extractColorName(entry);
                    String hex = extractColorHex(entry);
                    if (name.isBlank()) return "";
                    return hex.isBlank() ? name : name + "|" + hex;
                })
                .filter(s -> !s.isBlank())
                .distinct()
                .collect(Collectors.joining(",")));
        if (product.getSizePricesJson() == null || product.getSizePricesJson().isBlank()) product.setSizePricesJson("{}");
        if (product.getSlug() == null || product.getSlug().isBlank()) product.setSlug(toSlug(product.getName()));
        if (product.getImageUrl() == null || product.getImageUrl().isBlank()) product.setImageUrl("https://placehold.co/900x900/png");
        if (product.getCategory() == null) throw new IllegalArgumentException("Vui lòng chọn danh mục.");
        if (product.getGender() == null || product.getGender().isBlank()) product.setGender("unisex");
        String base = product.getSlug();
        int i = 2;
        while (productRepository.existsBySlugAndIdNot(base, product.getId() == null ? -1L : product.getId())) {
            base = product.getSlug() + "-" + i++;
        }
        product.setSlug(base);
        return productRepository.save(product);
    }
    public void deleteById(Long id) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return;
        product.setDeleted(true);
        productRepository.save(product);
    }

    public List<Product> featuredProducts() {
        return findAll().stream().filter(p -> Boolean.TRUE.equals(p.getFeatured())).limit(6).toList();
    }

    public List<Product> bestSellingProducts() {
        return findAll().stream()
                .sorted(Comparator.comparingInt((Product p) -> p.getSoldCount() == null ? 0 : p.getSoldCount()).reversed())
                .limit(6)
                .toList();
    }

    public List<String> allGenders() {
        return findAll().stream().map(Product::getGender).filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty()).map(String::toLowerCase).distinct().sorted().toList();
    }
    public List<String> allSizes() {
        return findAll().stream().flatMap(p -> Arrays.stream(p.getSizes())).map(String::trim).filter(s -> !s.isEmpty()).distinct().sorted().toList();
    }
    public List<String> allColors() {
        return findAll().stream()
                .flatMap(p -> Arrays.stream(p.getColors()))
                .map(this::extractColorName)
                .filter(s -> !s.isEmpty())
                .distinct()
                .sorted()
                .toList();
    }


    public String resolveColorHex(String colorName) {
        String extractedHex = extractColorHex(colorName);
        if (!extractedHex.isBlank()) return extractedHex;
        String raw = extractColorName(colorName);
        String value = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "")
                .trim();
        return switch (value) {
            case "trang", "white" -> "#ffffff";
            case "den", "black" -> "#111111";
            case "do", "red" -> "#ef4444";
            case "xanh", "xanhduong", "xanhlam", "blue" -> "#2563eb";
            case "xanhla", "xanhluc", "green" -> "#22c55e";
            case "vang", "yellow" -> "#eab308";
            case "cam", "orange" -> "#f97316";
            case "hong", "pink" -> "#ec4899";
            case "tim", "purple" -> "#8b5cf6";
            case "xam", "ghi", "gray", "grey" -> "#98a2b3";
            case "nau", "brown" -> "#92400e";
            case "be", "beige" -> "#d6b588";
            default -> "#d9dee8";
        };
    }

    private String toSlug(String value) {
        if (value == null || value.isBlank()) return "san-pham";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return normalized.isBlank() ? "san-pham" : normalized;
    }
}
