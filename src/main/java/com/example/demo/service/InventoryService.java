package com.example.demo.service;

import com.example.demo.model.Inventory;
import com.example.demo.model.InventorySizeStock;
import com.example.demo.model.Product;
import com.example.demo.repository.InventoryRepository;
import com.example.demo.repository.InventorySizeStockRepository;
import com.example.demo.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class InventoryService {
    public record SizeRow(String sizeLabel, int stock) {}
    public record InventoryRow(Long productId, String productName, String categoryName, int stock, int soldCount, List<SizeRow> sizes) {}

    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final InventorySizeStockRepository inventorySizeStockRepository;
    private final InventoryHistoryService inventoryHistoryService;

    public InventoryService(ProductRepository productRepository, InventoryRepository inventoryRepository, InventorySizeStockRepository inventorySizeStockRepository, InventoryHistoryService inventoryHistoryService) {
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.inventorySizeStockRepository = inventorySizeStockRepository;
        this.inventoryHistoryService = inventoryHistoryService;
    }

    @Transactional
    public List<InventoryRow> rows() {
        List<InventoryRow> result = new ArrayList<>();
        for (Product product : productRepository.findAll().stream().filter(p -> !Boolean.TRUE.equals(p.getDeleted())).sorted(java.util.Comparator.comparing(Product::getId)).toList()) {
            Inventory inventory = ensureInventory(product);
            syncSizes(inventory, product);
            List<InventorySizeStock> sizes = inventorySizeStockRepository.findByInventoryOrderByIdAsc(inventory);
            result.add(new InventoryRow(
                    product.getId(),
                    product.getName(),
                    product.getCategory() != null ? product.getCategory().getName() : "Khác",
                    nz(inventory.getStock()),
                    nz(inventory.getSoldCount()),
                    sizes.stream().map(s -> new SizeRow(s.getSizeLabel(), nz(s.getStock()))).toList()
            ));
        }
        return result;
    }

    @Transactional
    public void applySizeStocks(Product product, String sizeStocksJson) {
        if (product == null) return;
        Inventory inventory = ensureInventory(product);
        syncSizes(inventory, product);
        Map<String, Integer> sizeStocks = parseSimpleJsonMap(sizeStocksJson);
        int totalStock = 0;
        for (String size : product.getSizes()) {
            String label = size.trim();
            if (label.isBlank()) continue;
            int stock = Math.max(0, sizeStocks.getOrDefault(label, 0));
            InventorySizeStock row = inventorySizeStockRepository.findByInventoryAndSizeLabelIgnoreCase(inventory, label).orElseGet(() -> {
                InventorySizeStock created = new InventorySizeStock();
                created.setInventory(inventory);
                created.setSizeLabel(label);
                created.setStock(0);
                created.setSoldCount(0);
                return created;
            });
            row.setStock(stock);
            inventorySizeStockRepository.save(row);
            totalStock += stock;
        }
        inventory.setStock(totalStock);
        product.setStock(totalStock);
        inventoryRepository.save(inventory);
        productRepository.save(product);
    }

    @Transactional
    public void importStock(Long productId, String sizeLabel, int quantity) {
        changeStock(productId, sizeLabel, Math.max(1, quantity), true);
    }

    @Transactional
    public void exportStock(Long productId, String sizeLabel, int quantity) {
        changeStock(productId, sizeLabel, Math.max(1, quantity), false);
    }

    @Transactional
    protected void changeStock(Long productId, String sizeLabel, int quantity, boolean increase) {
        Product product = productRepository.findById(productId).orElseThrow();
        Inventory inventory = ensureInventory(product);
        syncSizes(inventory, product);
        InventorySizeStock sizeStock = inventorySizeStockRepository.findByInventoryAndSizeLabelIgnoreCase(inventory, sizeLabel)
                .orElseGet(() -> {
                    InventorySizeStock created = new InventorySizeStock();
                    created.setInventory(inventory);
                    created.setSizeLabel(sizeLabel);
                    created.setStock(0);
                    created.setSoldCount(0);
                    return inventorySizeStockRepository.save(created);
                });

        int delta = Math.max(1, quantity);
        int stockBefore = nz(sizeStock.getStock());
        if (increase) {
            sizeStock.setStock(nz(sizeStock.getStock()) + delta);
            inventory.setStock(nz(inventory.getStock()) + delta);
            product.setStock(nz(product.getStock()) + delta);
        } else {
            if (nz(sizeStock.getStock()) < delta) {
                throw new IllegalArgumentException("Tồn kho size " + sizeLabel + " không đủ để xuất.");
            }
            sizeStock.setStock(nz(sizeStock.getStock()) - delta);
            sizeStock.setSoldCount(nz(sizeStock.getSoldCount()) + delta);
            inventory.setStock(Math.max(0, nz(inventory.getStock()) - delta));
            inventory.setSoldCount(nz(inventory.getSoldCount()) + delta);
            product.setStock(Math.max(0, nz(product.getStock()) - delta));
            product.setSoldCount(nz(product.getSoldCount()) + delta);
        }
        inventorySizeStockRepository.save(sizeStock);
        inventoryRepository.save(inventory);
        productRepository.save(product);
        inventoryHistoryService.append(product.getName(), sizeLabel, increase ? "Nhập kho" : "Xuất kho", delta, stockBefore, nz(sizeStock.getStock()));
    }

    @Transactional
    public Inventory ensureInventory(Product product) {
        Inventory inventory = inventoryRepository.findByProduct(product).orElseGet(() -> {
            Inventory created = new Inventory();
            created.setProduct(product);
            created.setStock(nz(product.getStock()));
            created.setReserved(0);
            created.setSoldCount(nz(product.getSoldCount()));
            return inventoryRepository.save(created);
        });
        if (inventory.getStock() == null) inventory.setStock(nz(product.getStock()));
        if (inventory.getSoldCount() == null) inventory.setSoldCount(nz(product.getSoldCount()));
        return inventoryRepository.save(inventory);
    }

    @Transactional
    protected void syncSizes(Inventory inventory, Product product) {
        List<String> desiredSizes = Arrays.stream(product.getSizes())
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
        List<InventorySizeStock> existing = inventorySizeStockRepository.findByInventoryOrderByIdAsc(inventory);
        for (String size : desiredSizes) {
            boolean exists = existing.stream().anyMatch(s -> s.getSizeLabel().equalsIgnoreCase(size));
            if (!exists) {
                InventorySizeStock created = new InventorySizeStock();
                created.setInventory(inventory);
                created.setSizeLabel(size);
                created.setStock(0);
                created.setSoldCount(0);
                inventorySizeStockRepository.save(created);
            }
        }
    }


    @Transactional
    public Map<String, Integer> sizeStocksForProduct(Product product) {
        if (product == null) return Map.of();
        Inventory inventory = ensureInventory(product);
        syncSizes(inventory, product);
        Map<String, Integer> map = new LinkedHashMap<>();
        for (InventorySizeStock row : inventorySizeStockRepository.findByInventoryOrderByIdAsc(inventory)) {
            map.put(row.getSizeLabel(), nz(row.getStock()));
        }
        return map;
    }

    private Map<String, Integer> parseSimpleJsonMap(String json) {
        Map<String, Integer> result = new LinkedHashMap<>();
        if (json == null || json.isBlank()) return result;
        Matcher matcher = Pattern.compile("\"([^\"]+)\"\\s*:\\s*(\\d+)").matcher(json);
        while (matcher.find()) {
            result.put(matcher.group(1), Integer.parseInt(matcher.group(2)));
        }
        return result;
    }

    public java.util.List<InventoryHistoryService.HistoryRow> historyRows() { return inventoryHistoryService.findAll(); }

    private int nz(Integer value) { return value == null ? 0 : value; }
}
