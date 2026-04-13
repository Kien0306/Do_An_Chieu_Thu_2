CREATE DATABASE IF NOT EXISTS Do_An CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE Do_An;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS point_transactions;
DROP TABLE IF EXISTS coupon_usages;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS inventory_size_stocks;
DROP TABLE IF EXISTS inventories;
DROP TABLE IF EXISTS payment_items;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS shipments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS banners;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT '',
  is_deleted BIT NOT NULL DEFAULT b'0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(1000) DEFAULT 'https://i.sstatic.net/l60Hf.png',
  status BIT NOT NULL DEFAULT b'1',
  role_id BIGINT NOT NULL,
  login_count INT NOT NULL DEFAULT 0,
  loyalty_points INT NOT NULL DEFAULT 0,
  is_deleted BIT NOT NULL DEFAULT b'0',
  lock_time DATETIME NULL,
  forgot_password_token VARCHAR(255) NULL,
  forgot_password_token_exp DATETIME NULL,
  enabled BIT NOT NULL DEFAULT b'1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  image VARCHAR(1000) DEFAULT 'https://placeimg.com/640/480/any',
  description VARCHAR(255) DEFAULT '',
  is_deleted BIT NOT NULL DEFAULT b'0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  price BIGINT NOT NULL DEFAULT 0,
  image_url LONGTEXT,
  images_json JSON NULL,
  stock INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  sold_count INT NOT NULL DEFAULT 0,
  gender VARCHAR(30) DEFAULT 'unisex',
  sizes_csv VARCHAR(500),
  size_prices_json JSON NULL,
  colors_csv VARCHAR(500),
  colors_json JSON NULL,
  is_featured BIT NOT NULL DEFAULT b'0',
  is_deleted BIT NOT NULL DEFAULT b'0',
  category_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE inventories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL UNIQUE,
  stock INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  sold_count INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventories_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE inventory_size_stocks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  inventory_id BIGINT NOT NULL,
  size_label VARCHAR(50) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  sold_count INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_inventory_sizes_inventory FOREIGN KEY (inventory_id) REFERENCES inventories(id)
);

CREATE TABLE stock_movements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  movement_type VARCHAR(20) NOT NULL,
  quantity INT NOT NULL,
  stock_before INT NOT NULL DEFAULT 0,
  stock_after INT NOT NULL DEFAULT 0,
  note VARCHAR(500) DEFAULT '',
  created_by BIGINT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_stock_movements_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE carts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE cart_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  cart_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  selected_size VARCHAR(50) DEFAULT '',
  color_name VARCHAR(100) DEFAULT '',
  color_hex VARCHAR(20) DEFAULT '',
  unit_price BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id),
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE coupons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  coupon_type VARCHAR(20) NOT NULL DEFAULT 'percent',
  coupon_value BIGINT NOT NULL DEFAULT 0,
  min_order_amount BIGINT NOT NULL DEFAULT 0,
  max_discount BIGINT NOT NULL DEFAULT 0,
  used_count INT NOT NULL DEFAULT 0,
  is_point_coupon BIT NOT NULL DEFAULT b'0',
  points_cost INT NOT NULL DEFAULT 0,
  reward_stock INT NOT NULL DEFAULT 0,
  owner_user_id BIGINT NULL,
  is_used_once BIT NOT NULL DEFAULT b'0',
  expires_at DATETIME NULL,
  is_active BIT NOT NULL DEFAULT b'1',
  is_deleted BIT NOT NULL DEFAULT b'0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_coupons_owner_user FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE coupon_usages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  coupon_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_coupon_usage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  CONSTRAINT fk_coupon_usage_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE addresses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  full_name VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  address VARCHAR(500) DEFAULT '',
  label_name VARCHAR(100) DEFAULT 'Mặc định',
  is_default BIT NOT NULL DEFAULT b'1',
  is_deleted BIT NOT NULL DEFAULT b'0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  order_number BIGINT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_address VARCHAR(500) NOT NULL,
  customer_email VARCHAR(255) DEFAULT '',
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cod',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  original_amount BIGINT NOT NULL DEFAULT 0,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  shipping_distance_km DOUBLE NULL DEFAULT 0,
  shipping_fee BIGINT NULL DEFAULT 0,
  coupon_code VARCHAR(50) DEFAULT '',
  total_amount BIGINT NOT NULL DEFAULT 0,
  note VARCHAR(500) DEFAULT '',
  payment_id BIGINT NULL,
  shipment_id BIGINT NULL,
  is_deleted BIT NOT NULL DEFAULT b'0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  price BIGINT NOT NULL,
  subtotal BIGINT NOT NULL,
  selected_size VARCHAR(50) DEFAULT '',
  color_name VARCHAR(100) DEFAULT '',
  color_hex VARCHAR(20) DEFAULT '',
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address VARCHAR(500) NOT NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cod',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  original_amount BIGINT NOT NULL DEFAULT 0,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  shipping_distance_km DOUBLE NULL DEFAULT 0,
  shipping_fee BIGINT NULL DEFAULT 0,
  coupon_code VARCHAR(50) DEFAULT '',
  amount BIGINT NOT NULL DEFAULT 0,
  bank_name VARCHAR(255) DEFAULT 'MB Bank',
  account_number VARCHAR(100) DEFAULT '1900202608888',
  account_name VARCHAR(255) DEFAULT 'PHAN MINH SANG',
  note VARCHAR(500) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE payment_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  price BIGINT NOT NULL,
  subtotal BIGINT NOT NULL,
  CONSTRAINT fk_payment_items_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
  CONSTRAINT fk_payment_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE shipments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address VARCHAR(500) NOT NULL,
  shipment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  carrier VARCHAR(100) DEFAULT 'Nội bộ',
  tracking_code VARCHAR(100) DEFAULT '',
  note VARCHAR(500) DEFAULT '',
  is_deleted BIT NOT NULL DEFAULT b'0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shipments_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_shipments_user FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
  ADD CONSTRAINT fk_orders_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id);

CREATE TABLE point_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  points INT NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  order_id BIGINT NULL,
  coupon_id BIGINT NULL,
  description VARCHAR(500) DEFAULT '',
  is_deleted BIT NOT NULL DEFAULT b'0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_point_transactions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_point_transactions_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_point_transactions_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id)
);

CREATE TABLE banners (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) DEFAULT '',
  image_url VARCHAR(1000) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BIT NOT NULL DEFAULT b'1',
  is_deleted BIT NOT NULL DEFAULT b'0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO roles(name, description) VALUES
('ROLE_ADMIN', 'Quản trị hệ thống'),
('ROLE_USER', 'Khách hàng mua sắm');

INSERT INTO users(username, password, email, full_name, avatar_url, status, role_id, login_count, loyalty_points, enabled) VALUES
('admin', '$2a$10$0Wj4c8vQ1c5MEnYJfj5fRud0F4cV7vJ9P0x7M1Lqk2Q3qToSPSG3u', 'admin@doan.local', 'Quản trị viên', 'https://i.sstatic.net/l60Hf.png', b'1', 1, 0, 1200, b'1'),
('khachhang', '$2a$10$wY8Tj7v9d3uJ4Y0Pz7g4r.hoP7N8gC8b9yX2VQNgVv1r3o4nY8e9W', 'khachhang@doan.local', 'Khách hàng mẫu', 'https://i.sstatic.net/l60Hf.png', b'1', 2, 0, 550, b'1');

INSERT INTO categories(name, slug, image, description) VALUES
('Nam', 'nam', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80', 'Thời trang thể thao nam'),
('Nữ', 'nu', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80', 'Thời trang thể thao nữ'),
('Thể thao', 'the-thao', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80', 'Danh mục thể thao tổng hợp'),
('Phụ kiện', 'phu-kien', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8b?auto=format&fit=crop&w=800&q=80', 'Phụ kiện thể thao');

INSERT INTO products(name, slug, description, price, image_url, images_json, stock, reserved, sold_count, gender, sizes_csv, size_prices_json, colors_csv, colors_json, is_featured, category_id) VALUES
('Quần shorts nam Exdry Performance', 'quan-shorts-nam-exdry-performance', 'Quần short thể thao co giãn, phù hợp tập gym và chạy bộ.', 349000, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80', JSON_ARRAY('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80'), 25, 0, 18, 'nam', 'M,L,XL', JSON_ARRAY(JSON_OBJECT('size','M','price',349000), JSON_OBJECT('size','L','price',349000), JSON_OBJECT('size','XL','price',359000)), 'Đen,Xám,Xanh lam', JSON_ARRAY(JSON_OBJECT('name','Đen','hex','#111111'), JSON_OBJECT('name','Xám','hex','#9ca3af'), JSON_OBJECT('name','Xanh lam','hex','#2563eb')), b'0', 3),
('Quần shorts nam phối line', 'quan-shorts-nam-phoi-line', 'Thiết kế phối line trẻ trung, chất vải nhẹ thoáng.', 329000, 'https://images.unsplash.com/photo-1506629905607-bb5a4c99c98e?auto=format&fit=crop&w=1200&q=80', JSON_ARRAY('https://images.unsplash.com/photo-1506629905607-bb5a4c99c98e?auto=format&fit=crop&w=1200&q=80'), 18, 0, 22, 'nam', 'S,M,L,XL', JSON_ARRAY(JSON_OBJECT('size','S','price',319000), JSON_OBJECT('size','M','price',329000), JSON_OBJECT('size','L','price',329000), JSON_OBJECT('size','XL','price',339000)), 'Trắng,Xanh lam,Đen', JSON_ARRAY(JSON_OBJECT('name','Trắng','hex','#f8fafc'), JSON_OBJECT('name','Xanh lam','hex','#2563eb'), JSON_OBJECT('name','Đen','hex','#111111')), b'0', 3),
('Áo thun training nam', 'ao-thun-training-nam', 'Áo tập thể thao thấm hút mồ hôi.', 289000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80', JSON_ARRAY('https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80'), 30, 0, 40, 'nam', 'M,L,XL,2XL', JSON_ARRAY(JSON_OBJECT('size','M','price',289000), JSON_OBJECT('size','L','price',289000), JSON_OBJECT('size','XL','price',299000), JSON_OBJECT('size','2XL','price',309000)), 'Trắng,Đen,Đỏ', JSON_ARRAY(JSON_OBJECT('name','Trắng','hex','#f8fafc'), JSON_OBJECT('name','Đen','hex','#111111'), JSON_OBJECT('name','Đỏ','hex','#dc2626')), b'1', 1),
('Áo bra tập nữ Flex', 'ao-bra-tap-nu-flex', 'Áo bra nữ hỗ trợ vận động cường độ vừa.', 259000, 'https://images.unsplash.com/photo-1506629905607-bb5a4c99c98e?auto=format&fit=crop&w=1200&q=80', JSON_ARRAY('https://images.unsplash.com/photo-1506629905607-bb5a4c99c98e?auto=format&fit=crop&w=1200&q=80'), 22, 0, 31, 'nu', 'S,M,L', JSON_ARRAY(JSON_OBJECT('size','S','price',259000), JSON_OBJECT('size','M','price',259000), JSON_OBJECT('size','L','price',269000)), 'Đỏ,Đen,Xanh lá', JSON_ARRAY(JSON_OBJECT('name','Đỏ','hex','#dc2626'), JSON_OBJECT('name','Đen','hex','#111111'), JSON_OBJECT('name','Xanh lá','hex','#16a34a')), b'1', 2),
('Bình nước thể thao', 'binh-nuoc-the-thao', 'Bình nước 700ml, chất liệu an toàn.', 99000, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8b?auto=format&fit=crop&w=1200&q=80', JSON_ARRAY('https://images.unsplash.com/photo-1602143407151-7111542de6e8b?auto=format&fit=crop&w=1200&q=80'), 40, 0, 16, 'unisex', 'One Size', JSON_ARRAY(JSON_OBJECT('size','One Size','price',99000)), 'Xanh lam,Trắng', JSON_ARRAY(JSON_OBJECT('name','Xanh lam','hex','#2563eb'), JSON_OBJECT('name','Trắng','hex','#f8fafc')), b'0', 4),
('Túi gym basic', 'tui-gym-basic', 'Túi xách gym gọn nhẹ nhiều ngăn.', 399000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80', JSON_ARRAY('https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80'), 14, 0, 28, 'unisex', 'One Size', JSON_ARRAY(JSON_OBJECT('size','One Size','price',399000)), 'Đen,Xám,Xanh lam', JSON_ARRAY(JSON_OBJECT('name','Đen','hex','#111111'), JSON_OBJECT('name','Xám','hex','#9ca3af'), JSON_OBJECT('name','Xanh lam','hex','#2563eb')), b'1', 4),
('Giày chạy bộ Swift Run', 'giay-chay-bo-swift-run', 'Giày chạy bộ đế êm, phù hợp tập luyện hằng ngày.', 849000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80', JSON_ARRAY('https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80'), 16, 0, 45, 'unisex', '39,40,41,42', JSON_ARRAY(JSON_OBJECT('size','39','price',829000), JSON_OBJECT('size','40','price',849000), JSON_OBJECT('size','41','price',849000), JSON_OBJECT('size','42','price',859000)), 'Đỏ,Đen,Trắng', JSON_ARRAY(JSON_OBJECT('name','Đỏ','hex','#dc2626'), JSON_OBJECT('name','Đen','hex','#111111'), JSON_OBJECT('name','Trắng','hex','#f8fafc')), b'1', 3),
('Áo khoác gió nữ', 'ao-khoac-gio-nu', 'Áo khoác mỏng nhẹ chống nắng gió.', 459000, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80', JSON_ARRAY('https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80'), 12, 0, 20, 'nu', 'S,M,L,XL', JSON_ARRAY(JSON_OBJECT('size','S','price',449000), JSON_OBJECT('size','M','price',459000), JSON_OBJECT('size','L','price',459000), JSON_OBJECT('size','XL','price',469000)), 'Xám,Xanh lá,Đen', JSON_ARRAY(JSON_OBJECT('name','Xám','hex','#9ca3af'), JSON_OBJECT('name','Xanh lá','hex','#16a34a'), JSON_OBJECT('name','Đen','hex','#111111')), b'0', 2);

INSERT INTO inventories(product_id, stock, reserved, sold_count)
SELECT id, stock, 0, sold_count FROM products;

INSERT INTO inventory_size_stocks(inventory_id, size_label, stock, sold_count)
SELECT i.id, 'M', 8, 5 FROM inventories i JOIN products p ON p.id = i.product_id WHERE p.slug = 'quan-shorts-nam-exdry-performance'
UNION ALL SELECT i.id, 'L', 9, 7 FROM inventories i JOIN products p ON p.id = i.product_id WHERE p.slug = 'quan-shorts-nam-exdry-performance'
UNION ALL SELECT i.id, 'XL', 8, 6 FROM inventories i JOIN products p ON p.id = i.product_id WHERE p.slug = 'quan-shorts-nam-exdry-performance'
UNION ALL SELECT i.id, '39', 4, 10 FROM inventories i JOIN products p ON p.id = i.product_id WHERE p.slug = 'giay-chay-bo-swift-run'
UNION ALL SELECT i.id, '40', 4, 12 FROM inventories i JOIN products p ON p.id = i.product_id WHERE p.slug = 'giay-chay-bo-swift-run'
UNION ALL SELECT i.id, '41', 4, 11 FROM inventories i JOIN products p ON p.id = i.product_id WHERE p.slug = 'giay-chay-bo-swift-run'
UNION ALL SELECT i.id, '42', 4, 12 FROM inventories i JOIN products p ON p.id = i.product_id WHERE p.slug = 'giay-chay-bo-swift-run';

INSERT INTO stock_movements(product_id, movement_type, quantity, stock_before, stock_after, note, created_by)
SELECT id, 'in', stock, 0, stock, 'Khởi tạo tồn kho', 1 FROM products;

INSERT INTO carts(user_id) VALUES (2);
INSERT INTO cart_items(cart_id, product_id, quantity, selected_size, color_name, color_hex, unit_price)
SELECT c.id, p.id, 1, 'M', 'Đen', '#111111', 289000
FROM carts c CROSS JOIN products p WHERE c.user_id = 2 AND p.slug = 'ao-thun-training-nam';

INSERT INTO coupons(code, title, coupon_type, coupon_value, min_order_amount, max_discount, used_count, is_point_coupon, points_cost, reward_stock, owner_user_id, is_used_once, expires_at, is_active)
VALUES
('GIAM50K', 'Giảm ngay 50K', 'fixed', 50000, 300000, 50000, 1, b'0', 0, 0, NULL, b'0', DATE_ADD(NOW(), INTERVAL 30 DAY), b'1'),
('FIT10', 'Giảm 10 phần trăm', 'percent', 10, 500000, 80000, 0, b'0', 0, 0, NULL, b'0', DATE_ADD(NOW(), INTERVAL 20 DAY), b'1'),
('REWARD200', 'Coupon đổi 200 điểm', 'fixed', 30000, 0, 30000, 0, b'1', 200, 20, NULL, b'0', DATE_ADD(NOW(), INTERVAL 30 DAY), b'1');

INSERT INTO addresses(user_id, full_name, phone, address, label_name, is_default)
VALUES (2, 'Khách hàng mẫu', '0900000001', '12 Nguyễn Trãi, Quận 1, TP.HCM', 'Nhà riêng', b'1');

INSERT INTO orders(user_id, order_number, customer_name, customer_phone, customer_address, customer_email, payment_method, payment_status, delivery_status, status, original_amount, discount_amount, coupon_code, total_amount, note, is_deleted, created_at)
VALUES
(2, 1001, 'Khách hàng mẫu', '0900000001', '12 Nguyễn Trãi, Quận 1, TP.HCM', 'khachhang@doan.local', 'cod', 'pending', 'pending', 'PENDING', 688000, 50000, 'GIAM50K', 638000, 'Giao giờ hành chính', b'0', NOW()),
(2, 1002, 'Khách hàng mẫu', '0900000001', '12 Nguyễn Trãi, Quận 1, TP.HCM', 'khachhang@doan.local', 'bank', 'paid', 'delivered', 'COMPLETED', 1248000, 0, '', 1248000, '', b'0', NOW());

INSERT INTO order_items(order_id, product_id, title, quantity, price, subtotal, selected_size, color_name, color_hex) VALUES
(1, 3, 'Áo thun training nam', 1, 289000, 289000, 'M', 'Đen', '#111111'),
(1, 6, 'Túi gym basic', 1, 399000, 399000, 'One Size', 'Đen', '#111111'),
(2, 7, 'Giày chạy bộ Swift Run', 1, 849000, 849000, '40', 'Trắng', '#f8fafc'),
(2, 4, 'Áo bra tập nữ Flex', 1, 259000, 259000, 'M', 'Đỏ', '#dc2626'),
(2, 5, 'Bình nước thể thao', 1, 140000, 140000, 'One Size', 'Xanh lam', '#2563eb');

INSERT INTO payments(user_id, order_id, full_name, phone, address, payment_method, status, delivery_status, original_amount, discount_amount, coupon_code, amount, bank_name, account_number, account_name, note)
VALUES
(2, 1, 'Khách hàng mẫu', '0900000001', '12 Nguyễn Trãi, Quận 1, TP.HCM', 'cod', 'pending', 'pending', 688000, 50000, 'GIAM50K', 638000, 'MB Bank', '1900202608888', 'PHAN MINH SANG', 'Thanh toán khi nhận hàng'),
(2, 2, 'Khách hàng mẫu', '0900000001', '12 Nguyễn Trãi, Quận 1, TP.HCM', 'bank', 'paid', 'delivered', 1248000, 0, '', 1248000, 'MB Bank', '1900202608888', 'PHAN MINH SANG', 'Đã chuyển khoản');

INSERT INTO payment_items(payment_id, product_id, title, quantity, price, subtotal) VALUES
(1, 3, 'Áo thun training nam', 1, 289000, 289000),
(1, 6, 'Túi gym basic', 1, 399000, 399000),
(2, 7, 'Giày chạy bộ Swift Run', 1, 849000, 849000),
(2, 4, 'Áo bra tập nữ Flex', 1, 259000, 259000),
(2, 5, 'Bình nước thể thao', 1, 140000, 140000);

INSERT INTO shipments(order_id, user_id, full_name, phone, address, shipment_status, carrier, tracking_code, note)
VALUES
(1, 2, 'Khách hàng mẫu', '0900000001', '12 Nguyễn Trãi, Quận 1, TP.HCM', 'pending', 'Nội bộ', 'KS1001', ''),
(2, 2, 'Khách hàng mẫu', '0900000001', '12 Nguyễn Trãi, Quận 1, TP.HCM', 'delivered', 'Nội bộ', 'KS1002', 'Đã giao thành công');

UPDATE orders SET payment_id = 1, shipment_id = 1 WHERE id = 1;
UPDATE orders SET payment_id = 2, shipment_id = 2 WHERE id = 2;

INSERT INTO coupon_usages(coupon_id, user_id, order_id)
VALUES (1, 2, 1);

INSERT INTO point_transactions(user_id, transaction_type, points, source_type, order_id, coupon_id, description)
VALUES
(2, 'earn', 638, 'order', 1, NULL, 'Cộng điểm từ đơn hàng #1001'),
(2, 'earn', 1248, 'order', 2, NULL, 'Cộng điểm từ đơn hàng #1002'),
(2, 'redeem', 200, 'coupon', NULL, 3, 'Đổi coupon REWARD200');

INSERT INTO banners(title, image_url, sort_order, is_active) VALUES
('Banner thể thao 1', '/images/banner-fit-1.jpg', 1, b'1'),
('Banner thể thao 2', '/images/banner-fit-2.jpg', 2, b'1'),
('Banner thể thao 3', '/images/banner-fit-3.jpg', 3, b'1');


ALTER TABLE products MODIFY COLUMN image_url LONGTEXT;
