package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "products")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    private String slug;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(nullable = false)
    private long price;
    @Lob
    @Column(name = "image_url", columnDefinition = "LONGTEXT")
    private String imageUrl;
    private Integer stock = 0;
    @Column(length = 30)
    private String gender;
    @Column(name = "sizes_csv", length = 500)
    private String sizesCsv;
    @Lob
    @Column(name = "size_prices_json", columnDefinition = "LONGTEXT")
    private String sizePricesJson;
    @Column(name = "colors_csv", length = 500)
    private String colorsCsv;
    @Column(name = "is_featured")
    private Boolean featured = false;
    @Column(name = "sold_count")
    private Integer soldCount = 0;
    @Column(name = "is_deleted")
    private Boolean deleted = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public long getPrice() { return price; }
    public void setPrice(long price) { this.price = price; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getSizesCsv() { return sizesCsv; }
    public void setSizesCsv(String sizesCsv) { this.sizesCsv = sizesCsv; }
    public String getSizePricesJson() { return sizePricesJson; }
    public void setSizePricesJson(String sizePricesJson) { this.sizePricesJson = sizePricesJson; }
    public String getColorsCsv() { return colorsCsv; }
    public void setColorsCsv(String colorsCsv) { this.colorsCsv = colorsCsv; }
    public Boolean getFeatured() { return featured; }
    public void setFeatured(Boolean featured) { this.featured = featured; }
    public Integer getSoldCount() { return soldCount; }
    public void setSoldCount(Integer soldCount) { this.soldCount = soldCount; }
    public Boolean getDeleted() { return deleted; }
    public void setDeleted(Boolean deleted) { this.deleted = deleted; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    @Transient
    public String[] getSizes() {
        return sizesCsv == null || sizesCsv.isBlank() ? new String[0] : sizesCsv.split(",");
    }

    @Transient
    public String[] getColors() {
        if (colorsCsv == null || colorsCsv.isBlank()) return new String[0];
        return java.util.Arrays.stream(colorsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(value -> {
                    int idx = value.indexOf("|");
                    return idx >= 0 ? value.substring(0, idx).trim() : value;
                })
                .filter(s -> !s.isBlank())
                .toArray(String[]::new);
    }
}

