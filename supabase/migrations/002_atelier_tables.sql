-- ========================================================
-- Migration: جداول الأتيليه ثلاثي الأبعاد (Atelier)
-- تُستخدم في app/atelier/page.tsx ولم تكن موجودة إطلاقًا بالـ schema الأصلي
-- ========================================================

-- 1. أنواع الزهور المتاحة للتنسيق المخصص
CREATE TABLE IF NOT EXISTS flower_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    color TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. خيارات التغليف
CREATE TABLE IF NOT EXISTS wrap_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    color TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. خيارات المزهريات
CREATE TABLE IF NOT EXISTS vase_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- RLS: قراءة عامة، كتابة للأدمن فقط (نفس نمط جدول products)
-- ========================================================

ALTER TABLE flower_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrap_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE vase_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Flower types are viewable by everyone" ON flower_types;
CREATE POLICY "Flower types are viewable by everyone" ON flower_types
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Flower types are writable by admin only" ON flower_types;
CREATE POLICY "Flower types are writable by admin only" ON flower_types
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Wrap options are viewable by everyone" ON wrap_options;
CREATE POLICY "Wrap options are viewable by everyone" ON wrap_options
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Wrap options are writable by admin only" ON wrap_options;
CREATE POLICY "Wrap options are writable by admin only" ON wrap_options
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Vase options are viewable by everyone" ON vase_options;
CREATE POLICY "Vase options are viewable by everyone" ON vase_options
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Vase options are writable by admin only" ON vase_options;
CREATE POLICY "Vase options are writable by admin only" ON vase_options
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ========================================================
-- بيانات تجريبية حتى تظهر صفحة الأتيليه فورًا
-- ========================================================

INSERT INTO flower_types (name, name_ar, price, color, in_stock) VALUES
('Red Rose', 'وردة حمراء', 2.50, '#C41E3A', true),
('White Rose', 'وردة بيضاء', 2.50, '#FFFFFF', true),
('Pink Peony', 'فاوانيا وردية', 4.00, '#F7C6D9', true),
('Sunflower', 'دوار الشمس', 3.00, '#FFC72C', true),
('Lavender', 'خزامى', 2.00, '#B497D6', true);

INSERT INTO wrap_options (name, name_ar, price, color, in_stock) VALUES
('Kraft Paper', 'ورق كرافت', 3.00, '#C19A6B', true),
('Silk Ribbon Wrap', 'تغليف حرير', 6.00, '#0D5C63', true),
('Luxury Box', 'صندوق فاخر', 10.00, '#E7D8B9', true);

INSERT INTO vase_options (name, name_ar, price, image, in_stock) VALUES
('Classic Glass Vase', 'مزهرية زجاجية كلاسيكية', 8.00, '', true),
('Ceramic Vase', 'مزهرية سيراميك', 12.00, '', true),
('No Vase', 'بدون مزهرية', 0.00, '', true);