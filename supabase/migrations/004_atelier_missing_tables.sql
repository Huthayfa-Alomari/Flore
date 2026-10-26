-- ═══════════════════════════════════════════════════════════════
-- 004: جداول الأتيليه الناقصة — الخُضرة، أحجام الباقات، سجل توليد الصور
-- + إنشاء bucket معاينات الأتيليه (atelier-previews)
-- هذه الجداول كانت تستخدمها صفحة /atelier وواجهة generate-preview
-- دون أن تكون معرّفة في أي نسخة من الـ schema — ما كان يكسر الصفحة بالكامل.
-- ═══════════════════════════════════════════════════════════════

-- 1) الأخضريات (تُستخدم بخطوة "الأخضريات" في تصميم الباقة)
CREATE TABLE IF NOT EXISTS greenery_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    image TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE greenery_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Greenery readable by everyone" ON greenery_options
    FOR SELECT USING (true);
CREATE POLICY "Greenery insertable by admin only" ON greenery_options
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "Greenery updatable by admin only" ON greenery_options
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "Greenery deletable by admin only" ON greenery_options
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 2) أحجام الباقات (تُستخدم بخطوة "الحجم")
CREATE TABLE IF NOT EXISTS bouquet_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    label_ar TEXT NOT NULL,
    desc_ar TEXT,
    stem_count INTEGER NOT NULL,
    price_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bouquet_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bouquet sizes readable by everyone" ON bouquet_sizes
    FOR SELECT USING (true);
CREATE POLICY "Bouquet sizes manageable by admin only" ON bouquet_sizes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 3) سجل توليد صور المعاينة (الحد اليومي الفعلي لمسار generate-preview)
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- user id أو IP
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- هذا الجدول يُكتب ويُقرأ فقط عبر service role من مسارات السيرفر
CREATE POLICY "No client access to ai_generation_logs" ON ai_generation_logs
    FOR SELECT USING (false);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_identifier
    ON ai_generation_logs (identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_greenery_in_stock
    ON greenery_options (in_stock, price);

-- 4) bucket معاينات الأتيليه (عام — الصور المولدة تُعرض للمستلم عبر رابط عام)
INSERT INTO storage.buckets (id, name, public)
VALUES ('atelier-previews', 'atelier-previews', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Atelier previews are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'atelier-previews');

-- الرفع يتم فقط عبر service role من مسار السيرفر الآمن

-- ═══════════════════════════════════════════════════════════════
-- بيانات أولية
-- ═══════════════════════════════════════════════════════════════

INSERT INTO greenery_options (name, name_ar, price, in_stock) VALUES
    ('Eucalyptus', 'أوكاليبتوس (اليوكالبتوس)', 2.00, true),
    ('Ruscus', 'روكسس (أسل إيطالي)', 2.50, true),
    ('Baby''s Breath (Gypsophila)', 'خمسينة (نفلة)', 1.50, true),
    ('Leatherleaf Fern', 'سرخس الجلد', 1.00, true),
    ('Italian Ruscus', 'روكسس إيطالي فاخر', 3.00, true),
    ('Pittosporum', 'بيتوسبورم (خروع الجبل)', 1.50, true)
ON CONFLICT DO NOTHING;

INSERT INTO bouquet_sizes (key, label_ar, desc_ar, stem_count, price_multiplier, sort_order) VALUES
    ('petite', 'صغيرة', 'لمسة لطيفة تناسب أي مساحة', 10, 1.00, 1),
    ('classic', 'كلاسيكية', 'الخيار الأمثل لمعظم المناسبات', 20, 1.50, 2),
    ('grand', 'كبيرة', 'حضور فاخر يلفت الأنظار', 35, 2.20, 3),
    ('luxury', 'فاخرة', 'تجربة فلوري الكاملة بلا حدود', 50, 3.00, 4)
ON CONFLICT (key) DO NOTHING;
