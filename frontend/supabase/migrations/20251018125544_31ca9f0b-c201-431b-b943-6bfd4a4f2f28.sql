-- Update categories to match the new structure
DELETE FROM categories;

INSERT INTO categories (name, slug, icon_name, display_order) VALUES
('Fashion', 'fashion', 'Shirt', 1),
('Food & Beverage', 'food-beverage', 'Utensils', 2),
('Entertainment', 'entertainment', 'Film', 3),
('Travel', 'travel', 'Plane', 4),
('Electronics', 'electronics', 'Laptop', 5),
('Health & Wellness', 'health-wellness', 'Heart', 6),
('Home & Living', 'home-living', 'Home', 7),
('Books & Education', 'books-education', 'BookOpen', 8);