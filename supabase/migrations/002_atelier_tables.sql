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
    container_type TEXT NOT NULL DEFAULT 'vase',
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- قواعد الإنتاج القديمة أنشأت الجدول قبل إضافة نوع الحاوية.
ALTER TABLE vase_options
  ADD COLUMN IF NOT EXISTS container_type TEXT NOT NULL DEFAULT 'vase';

-- 4. الخضار والإضافات النباتية
CREATE TABLE IF NOT EXISTS greenery_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. أحجام الباقة
CREATE TABLE IF NOT EXISTS bouquet_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    label_ar TEXT NOT NULL,
    desc_ar TEXT,
    stem_count INTEGER NOT NULL CHECK (stem_count > 0),
    price_multiplier NUMERIC NOT NULL DEFAULT 1 CHECK (price_multiplier > 0)
);

-- 6. سجل خاص بالسيرفر لاحتساب استخدام توليد الصور
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_generation_logs_identifier_created_at_idx
  ON ai_generation_logs (identifier, created_at DESC);

-- صور المعاينة عامة للعرض في السلة والطلب، والرفع يتم حصراً بمفتاح السيرفر.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('atelier-previews', 'atelier-previews', true, 10485760, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================================
-- RLS: قراءة عامة، كتابة للأدمن فقط (نفس نمط جدول products)
-- ========================================================

ALTER TABLE flower_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrap_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE vase_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE greenery_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ai_generation_logs FROM anon, authenticated;

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

DROP POLICY IF EXISTS "Public can view greenery" ON greenery_options;
CREATE POLICY "Public can view greenery" ON greenery_options
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin can manage greenery" ON greenery_options;
CREATE POLICY "Admin can manage greenery" ON greenery_options
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS "Public can view sizes" ON bouquet_sizes;
CREATE POLICY "Public can view sizes" ON bouquet_sizes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin can manage sizes" ON bouquet_sizes;
CREATE POLICY "Admin can manage sizes" ON bouquet_sizes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

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
('Silk Ribbon Wrap', 'تغليف حرير', 6.00, '#A8813C', true),
('Luxury Box', 'صندوق فاخر', 10.00, '#E7D8B9', true);

INSERT INTO vase_options (name, name_ar, price, image, in_stock) VALUES
('Classic Glass Vase', 'مزهرية زجاجية كلاسيكية', 8.00, '', true),
('Ceramic Vase', 'مزهرية سيراميك', 12.00, '', true),
('No Vase', 'بدون مزهرية', 0.00, '', true);

INSERT INTO greenery_options (name, name_ar, price, image, in_stock) VALUES
('Eucalyptus', 'أوكالبتوس', 1.25, '', true),
('Ruscus', 'روسكوس', 1.00, '', true),
('Baby''s Breath', 'جيبسوفيلا', 1.50, '', true);

INSERT INTO bouquet_sizes (key, label_ar, desc_ar, stem_count, price_multiplier) VALUES
('regular', 'عادي', 'تنسيق متوازن وناعم', 12, 1.00),
('deluxe', 'ديلوكس', 'باقة أكثر امتلاءً', 20, 1.35),
('premium', 'بريميوم', 'تنسيق فاخر وكثيف', 30, 1.65)
ON CONFLICT (key) DO NOTHING;
