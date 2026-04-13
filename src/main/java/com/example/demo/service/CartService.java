package com.example.demo.service;

import com.example.demo.model.Product;
import org.springframework.stereotype.Service;
import org.springframework.web.context.annotation.SessionScope;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.List;
import java.util.ArrayList;

@Service
@SessionScope
public class CartService {
    public static class CartLine {
        private final String lineKey;
        private final Product product;
        private String selectedSize;
        private String selectedColor;
        private int quantity;

        public CartLine(String lineKey, Product product, String selectedSize, String selectedColor, int quantity) {
            this.lineKey = lineKey;
            this.product = product;
            this.selectedSize = selectedSize;
            this.selectedColor = selectedColor;
            this.quantity = quantity;
        }
        public String getLineKey() { return lineKey; }
        public Product getProduct() { return product; }
        public String getSelectedSize() { return selectedSize; }
        public String getSelectedColor() { return selectedColor; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
        public void setSelectedSize(String selectedSize) { this.selectedSize = selectedSize; }
        public void setSelectedColor(String selectedColor) { this.selectedColor = selectedColor; }
        public long getSubtotal() { return product.getPrice() * quantity; }
    }

    private final Map<String, CartLine> items = new LinkedHashMap<>();
    private final ProductService productService;
    public CartService(ProductService productService) { this.productService = productService; }

    private String lineKey(Long productId, String selectedSize, String selectedColor) {
        return productId + "|" + Objects.toString(selectedSize, "") + "|" + Objects.toString(selectedColor, "");
    }

    public void add(Long productId, String selectedSize, String selectedColor) {
        Product p = productService.findById(productId);
        if (p == null) return;
        String size = selectedSize == null ? "" : selectedSize.trim();
        String color = selectedColor == null ? "" : selectedColor.trim();
        String key = lineKey(productId, size, color);
        items.compute(key, (k, v) -> v == null ? new CartLine(key, p, size, color, 1) : new CartLine(key, p, size, color, v.getQuantity() + 1));
    }
    public void update(String lineKey, int quantity) {
        if (!items.containsKey(lineKey)) return;
        if (quantity <= 0) { items.remove(lineKey); return; }
        items.get(lineKey).setQuantity(quantity);
    }
    public void remove(String lineKey) { items.remove(lineKey); }

    public void changeOptions(String oldLineKey, String newSize, String newColor) {
        CartLine line = items.remove(oldLineKey);
        if (line == null) return;
        String size = newSize == null ? "" : newSize.trim();
        String color = newColor == null ? "" : newColor.trim();
        String newKey = lineKey(line.getProduct().getId(), size, color);
        CartLine existing = items.get(newKey);
        if (existing != null) {
            existing.setQuantity(existing.getQuantity() + line.getQuantity());
            return;
        }
        line.setSelectedSize(size);
        line.setSelectedColor(color);
        items.put(newKey, new CartLine(newKey, line.getProduct(), size, color, line.getQuantity()));
    }
    public List<CartLine> getItems() { return new ArrayList<>(items.values()); }
    public int getCount() { return items.values().stream().mapToInt(CartLine::getQuantity).sum(); }
    public long getTotal() { return items.values().stream().mapToLong(CartLine::getSubtotal).sum(); }
    public void clear() { items.clear(); }
    public boolean isEmpty() { return items.isEmpty(); }
}
