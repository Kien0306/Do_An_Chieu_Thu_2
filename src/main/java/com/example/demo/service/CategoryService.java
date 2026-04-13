package com.example.demo.service;

import com.example.demo.model.Category;
import com.example.demo.repository.CategoryRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class CategoryService {
    private static final String DEFAULT_IMAGE = "https://placehold.co/640x480/png";
    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> findAll() {
        return categoryRepository.findAll().stream()
                .filter(c -> !Boolean.TRUE.equals(c.getDeleted()))
                .sorted(Comparator.comparing(Category::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    public Category findById(Long id) {
        Category category = categoryRepository.findById(id).orElse(null);
        return category != null && Boolean.TRUE.equals(category.getDeleted()) ? null : category;
    }

    public Category save(Category category) {
        if (category == null) throw new IllegalArgumentException("Danh mục không hợp lệ.");
        if (category.getName() != null) category.setName(category.getName().trim());
        if (category.getName() == null || category.getName().isBlank()) throw new IllegalArgumentException("Vui lòng nhập tên danh mục.");

        Long currentId = category.getId() == null ? -1L : category.getId();
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(category.getName(), currentId)) {
            throw new IllegalArgumentException("Tên danh mục đã tồn tại.");
        }

        if (category.getSlug() == null || category.getSlug().isBlank()) category.setSlug(toSlug(category.getName()));
        if (category.getImage() == null || category.getImage().isBlank()) category.setImage(DEFAULT_IMAGE);
        if (category.getDescription() == null) category.setDescription("");
        if (category.getDeleted() == null) category.setDeleted(false);

        String baseSlug = category.getSlug();
        String slug = baseSlug;
        int i = 2;
        while (categoryRepository.existsBySlugAndIdNot(slug, currentId)) {
            slug = baseSlug + "-" + i++;
        }
        category.setSlug(slug);

        try {
            return categoryRepository.save(category);
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalArgumentException("Tên hoặc slug danh mục đã tồn tại.");
        }
    }

    public void deleteById(Long id) {
        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null) return;
        String marker = "deleted-" + id + "-" + System.currentTimeMillis();
        category.setDeleted(true);
        category.setName(marker);
        category.setSlug(marker);
        categoryRepository.save(category);
    }

    private String toSlug(String value) {
        if (value == null || value.isBlank()) return "danh-muc";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return normalized.isBlank() ? "danh-muc" : normalized;
    }
}
