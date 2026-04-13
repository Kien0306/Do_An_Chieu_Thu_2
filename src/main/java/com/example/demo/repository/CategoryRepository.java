package com.example.demo.repository;

import com.example.demo.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    boolean existsBySlugAndIdNot(String slug, Long id);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    Optional<Category> findByNameIgnoreCase(String name);
    List<Category> findByDeletedFalseOrderByNameAsc();
}
