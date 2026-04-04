-- Initialize Al-Baik Database with sample data

-- Insert Categories
INSERT INTO categories (id, name, name_ar, description_ar, icon, color, is_active, sort_order) VALUES
('cat_electronics', 'Electronics', 'كهربائيات', 'أجهزة كهربائية ومنزلية', '⚡', '#D32F2F', 1, 1),
('cat_phone_acc', 'Phone Accessories', 'إكسسوارات الهواتف', 'إكسسوارات وملحقات الهواتف الذكية', '📱', '#9E9E9E', 0, 2),
('cat_laptop_acc', 'Laptop Accessories', 'إكسسوارات اللابتوب', 'إكسسوارات وملحقات أجهزة الكمبيوتر المحمولة', '💻', '#9E9E9E', 0, 3),
('cat_home_tools', 'Home Tools', 'أدوات منزلية', 'أدوات ومعدات منزلية متنوعة', '🏠', '#9E9E9E', 0, 4),
('cat_games', 'Games', 'العاب', 'ألعاب وترفيه', '🎮', '#9E9E9E', 0, 5),
('cat_cables', 'Cables & Chargers', 'الكابلات والشواحن', 'كابلات وشواحن متنوعة', '🔌', '#9E9E9E', 0, 6);

-- Insert Kitchen Products (matching the Flutter app)
INSERT INTO products (
  id, name, name_ar, description_ar, price, currency, category_id, 
  main_image, images, video_url, is_active, in_stock, stock_quantity,
  rating, review_count, sales_count
) VALUES
(
  'prod_mixer_1',
  'Multi-Function Electric Mixer',
  'خلاط كهربائي متعدد الوظائف',
  'خلاط كهربائي متعدد الوظائف يتميز بقوة أداء عالية وتصميم عملي مع مجموعة ملحقات متنوعة لتلبية جميع احتياجات المطبخ. مثالي لتحضير العصائر، طحن القهوة والتوابل، وخفق المكونات بسهولة وسرعة، ليمنحك نتائج احترافية يوميًا بكل راحة.',
  299.99,
  'د.أ',
  'cat_electronics',
  'https://your-r2-domain.r2.dev/products/mixer-main.jpg',
  '["https://your-r2-domain.r2.dev/products/mixer-1.jpg", "https://your-r2-domain.r2.dev/products/mixer-2.jpg"]',
  'https://your-r2-domain.r2.dev/videos/mixer-demo.mp4',
  1, 1, 25,
  4.5, 127, 250
),
(
  'prod_kettle_glass',
  'Glass Electric Kettle',
  'غلاية كهربائية زجاج',
  'غلاية ماء كهربائية زجاجية 1.8 لتر تتميز بتصميم أنيق وعصري مع سعة كبيرة تناسب الاستخدام اليومي. توفر غليانًا سريعًا وآمنًا بفضل قاعدة التسخين القوية، مع مؤشر مستوى الماء لسهولة الاستخدام. مثالية لتحضير الشاي، القهوة، والمشروبات الساخنة بكل راحة وسرعة.',
  159.99,
  'د.أ',
  'cat_electronics',
  'https://your-r2-domain.r2.dev/products/kettle-glass-main.jpg',
  '["https://your-r2-domain.r2.dev/products/kettle-glass-1.jpg", "https://your-r2-domain.r2.dev/products/kettle-glass-2.jpg"]',
  'https://your-r2-domain.r2.dev/videos/kettle-glass-demo.mp4',
  1, 1, 18,
  4.3, 89, 180
),
(
  'prod_kettle_modern',
  'Modern Electric Kettle',
  'غلاية كهربائية عصرية',
  'غلاية كهربائية بتصميم حديث وأنيق تجمع بين الأداء العالي والشكل الجذاب، مزودة بهيكل متين وسعة مناسبة للاستخدام اليومي. توفر غليانًا سريعًا وآمنًا مع سهولة في الاستخدام، مما يجعلها مثالية لتحضير القهوة، الشاي، والمشروبات الساخنة بكل راحة وأناقة.',
  189.99,
  'د.أ',
  'cat_electronics',
  'https://your-r2-domain.r2.dev/products/kettle-modern-main.jpg',
  '["https://your-r2-domain.r2.dev/products/kettle-modern-1.jpg"]',
  'https://your-r2-domain.r2.dev/videos/kettle-modern-demo.mp4',
  1, 1, 12,
  4.4, 76, 145
),
(
  'prod_cooktop',
  'Ceramic Electric Cooktop',
  'موقد كهربائي مسطح (سيراميك)',
  'موقد كهربائي بتصميم عصري وأنيق يوفر أداءً عاليًا لتسخين وطهي مختلف الأطعمة بسهولة وسرعة. يتميز بسطح سيراميك متين سهل التنظيف مع لوحة تحكم رقمية وخيارات متعددة للطهي، مما يجعله مثاليًا للاستخدام اليومي في المطبخ أو أثناء السفر، مع أمان وكفاءة عالية في استهلاك الطاقة.',
  449.99,
  'د.أ',
  'cat_electronics',
  'https://your-r2-domain.r2.dev/products/cooktop-main.jpg',
  '["https://your-r2-domain.r2.dev/products/cooktop-1.jpg"]',
  'https://your-r2-domain.r2.dev/videos/cooktop-demo.mp4',
  1, 1, 8,
  4.6, 54, 95
),
(
  'prod_pressure_cooker',
  'Multi-Function Electric Pressure Cooker',
  'قدر ضغط كهربائي متعدد الوظائف',
  'قدر ضغط كهربائي عملي يجمع بين السرعة والكفاءة لتحضير مختلف الأطباق بسهولة. يتميز ببرامج طهي متعددة ولوحة تحكم رقمية ذكية تتيح لك طهي الأرز، اللحوم، الشوربات وغيرها بلمسة واحدة، مع نظام أمان عالي يحافظ على سلامتك ويمنحك نتائج لذيذة في وقت أقل.',
  599.99,
  'د.أ',
  'cat_electronics',
  'https://your-r2-domain.r2.dev/products/pressure-cooker-main.jpg',
  '["https://your-r2-domain.r2.dev/products/pressure-cooker-1.jpg"]',
  'https://your-r2-domain.r2.dev/videos/pressure-cooker-demo.mp4',
  1, 1, 15,
  4.7, 92, 120
),
(
  'prod_stand_mixer',
  'Electric Stand Mixer',
  'عجّانة كهربائية',
  'عجّانة كهربائية قوية بتصميم أنيق مزودة بوعاء ستانلس ستيل عالي الجودة، مثالية للعجن، الخفق، وخلط المكونات بسهولة. تتميز بسرعات متعددة لتناسب جميع الوصفات، مما يجعلها الخيار الأمثل لتحضير الخبز، الكيك، والمعجنات بنتائج احترافية في المنزل.',
  799.99,
  'د.أ',
  'cat_electronics',
  'https://your-r2-domain.r2.dev/products/stand-mixer-main.jpg',
  '[]',
  'https://your-r2-domain.r2.dev/videos/stand-mixer-demo.mp4',
  1, 1, 6,
  4.8, 38, 75
);

-- Insert Demo Users
INSERT INTO users (id, email, password, first_name, last_name, role, is_active, email_verified) VALUES
('user_admin', 'admin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'المدير', 'العام', 'admin', 1, 1),
('user_staff', 'staff@al-baik.com', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'الموظف', 'الأول', 'staff', 1, 1),
('user_customer', 'customer@al-baik.com', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'العميل', 'المميز', 'customer', 1, 1);

-- Insert Sample Reviews
INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified, is_visible) VALUES
('prod_mixer_1', 'user_customer', 5, 'منتج ممتاز', 'خلاط رائع وقوي، أنصح به بشدة', 1, 1),
('prod_kettle_glass', 'user_customer', 4, 'جودة عالية', 'غلاية جميلة وعملية، تسخن الماء بسرعة', 1, 1),
('prod_pressure_cooker', 'user_customer', 5, 'يستحق الشراء', 'قدر الضغط هذا وفر علي وقت كثير في الطبخ', 1, 1);

-- Insert App Settings
INSERT INTO settings (key, value, type, description, is_public) VALUES
('app_name', 'Al-Baik', 'string', 'اسم التطبيق', 1),
('app_name_ar', 'الباك', 'string', 'اسم التطبيق بالعربية', 1),
('currency', 'JOD', 'string', 'العملة الافتراضية', 1),
('currency_symbol', 'د.أ', 'string', 'رمز العملة', 1),
('tax_rate', '0.16', 'number', 'معدل الضريبة', 0),
('shipping_cost', '5.00', 'number', 'تكلفة الشحن', 1),
('free_shipping_threshold', '100.00', 'number', 'الحد الأدنى للشحن المجاني', 1),
('contact_phone', '+962 6 123 4567', 'string', 'رقم الهاتف', 1),
('contact_email', 'info@al-baik.com', 'string', 'البريد الإلكتروني', 1),
('contact_address', 'عمان، الأردن', 'string', 'العنوان', 1);