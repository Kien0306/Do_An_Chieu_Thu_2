package com.example.demo.repository;

import com.example.demo.model.Inventory;
import com.example.demo.model.InventorySizeStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InventorySizeStockRepository extends JpaRepository<InventorySizeStock, Long> {
    List<InventorySizeStock> findByInventoryOrderByIdAsc(Inventory inventory);
    Optional<InventorySizeStock> findByInventoryAndSizeLabelIgnoreCase(Inventory inventory, String sizeLabel);
}
