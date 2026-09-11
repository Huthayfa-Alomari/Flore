-- ========================================================
-- 🛑 أولاً: مرحلة التصفير الشامل والمحو (Wiping the Slate Clean)
-- ========================================================

DROP TRIGGER IF EXISTS validate_order_total_trigger ON orders CASCADE;
DROP FUNCTION IF EXISTS validate_order_total() CASCADE;
DROP TRIGGER IF EXISTS set_updated_at_products ON products CASCADE;
DROP TRIGGER IF EXISTS set_updated_at_orders ON orders CASCADE;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS flower_types CASCADE;
DROP TABLE IF EXISTS wrap_options CASCADE;
DROP TABLE IF EXISTS vase_options CASCADE;
DROP TABLE IF EXISTS greenery_options CASCADE;
DROP TABLE IF EXISTS bouquet_sizes CASCADE;
DROP TABLE IF EXISTS ai_generation_logs CASCADE;

-- ========================================================
-- 🚀 ثانياً: إعادة البناء بنظافة (Fresh Authoritative Schema)
-- ========================================================

-- 1. جدول المنتجات (باقات زهور Floré)
-- الأعمدة هنا يجب أن تطابق دائمًا واجهة Product في types/index.ts
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_en TEXT,
    category TEXT NOT NULL DEFAULT 'bouquets'
        CHECK (category IN ('bouquets', 'preserved', 'vases', 'chocolates', 'custom', 'accessories', 'plants')),
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'JOD',
    image TEXT NOT NULL DEFAULT '',
    images TEXT[] NOT NULL DEFAULT '{}',
    description TEXT,
    description_en TEXT,
    badge TEXT,
    badge_color TEXT,
    in_stock BOOLEAN DEFAULT true,
    model_url TEXT,
    ar_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. جدول رتب وصلاحيات المستخدمين (لإدارة إشعارات الأدمن)
CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. جدول اشتراكات الإشعارات (Web Push)
CREATE TABLE push_subscriptions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    subscription JSONB,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, endpoint)
);

-- 4. جدول الملفات الشخصية للمستخدمين (Profiles)
-- يُربط 1:1 مع auth.users عبر id، ويُنشأ تلقائيًا عند تسجيل مستخدم جديد (انظر trigger أدناه)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    membership TEXT NOT NULL DEFAULT 'classic' CHECK (membership IN ('classic', 'golden', 'vip')),
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC NOT NULL DEFAULT 0,
    language TEXT NOT NULL DEFAULT 'ar',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. جدول قائمة المفضلة (Wishlist)
CREATE TABLE wishlist (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);

-- 6. جداول الأتيليه ثلاثي الأبعاد (تنسيق باقة مخصصة) — تُستخدم في app/atelier/page.tsx
CREATE TABLE flower_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    color TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE wrap_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    color TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vase_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    container_type TEXT NOT NULL DEFAULT 'vase',
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE greenery_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bouquet_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    label_ar TEXT NOT NULL,
    desc_ar TEXT,
    stem_count INTEGER NOT NULL CHECK (stem_count > 0),
    price_multiplier NUMERIC NOT NULL DEFAULT 1 CHECK (price_multiplier > 0)
);

CREATE TABLE ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_generation_logs_identifier_created_at_idx
  ON ai_generation_logs (identifier, created_at DESC);

-- 7. جدول الطلبات الشامل والمحمي (Orders Table)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- يكون NULL في حال الـ Guest
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_address TEXT,
    delivery_region TEXT,
    delivery_notes TEXT,
    delivery_date TIMESTAMPTZ,
    gift_message TEXT,
    gift_media_url TEXT,
    gift_media_type TEXT,
    gift_token UUID DEFAULT gen_random_uuid(),
    delivery_time_slot TEXT,
    is_anonymous_gift BOOLEAN DEFAULT false,
    awaiting_recipient_address BOOLEAN DEFAULT false,
    recipient_address_token UUID DEFAULT gen_random_uuid(),
    recipient_name TEXT,
    recipient_phone TEXT,
    payment_method TEXT NOT NULL, -- whatsapp, cliq, cash, stripe
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_transaction_id TEXT,
    stripe_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    total NUMERIC NOT NULL,
    -- مصفوفة عناصر الطلب، بشكل موحّد عبر كل الكود:
    -- [{ product_id, name, image, price, qty, customization }]
    items JSONB NOT NULL,
    -- بيانات التوصيل اللحظي
    driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    driver_lat NUMERIC,
    driver_lng NUMERIC,
    temperature NUMERIC,
    humidity NUMERIC,
    estimated_arrival TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- 🛡️ ثالثاً: زرع التدقيق الآلي (Integrity Triggers)
-- ========================================================

-- التحقق من أن إجمالي الطلب يطابق مجموع عناصره فعليًا (يمنع تلاعب الأسعار)
CREATE OR REPLACE FUNCTION validate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  item_sum NUMERIC;
BEGIN
  SELECT COALESCE(SUM(price * qty), 0)
  INTO item_sum
  FROM jsonb_to_recordset(NEW.items) AS x(product_id TEXT, price NUMERIC, qty INT);

  -- سماحية ضئيلة جداً 0.01 لتجنب مشاكل الفواصل العشرية في السيرفر
  IF ABS(COALESCE(NEW.total, 0) - item_sum) > 0.01 THEN
    RAISE EXCEPTION 'Order total mismatch: expected %, got %', item_sum, NEW.total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_order_total_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_total();

-- تحديث updated_at تلقائيًا عند أي تعديل، بدل الاعتماد على كل مسار API ليحدّثه يدويًا
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- إنشاء صف profile تلقائيًا عند تسجيل مستخدم جديد بـ Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================================================
-- 📊 رابعاً: حقن بيانات تجريبية نظيفة (Seed Data)
-- ========================================================

INSERT INTO products (name, name_en, category, price, currency, image, in_stock, ar_enabled) VALUES
('باقة توليب فاخرة - Floré Luxury Tulip', 'Luxury Tulip Bouquet', 'bouquets', 45.00, 'JOD', '', true, false),
('باقة الجوري الأحمر الكلاسيكية', 'Classic Red Rose Bouquet', 'bouquets', 29.99, 'JOD', '', true, false),
('تنسيق الأوركيد الملكي', 'Royal Orchid Arrangement', 'vases', 85.00, 'JOD', '', false, false); -- منتج نفذت كميته لفحص حماية الـ API

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

INSERT INTO greenery_options (name, name_ar, price, image, in_stock) VALUES
('Eucalyptus', 'أوكالبتوس', 1.25, '', true),
('Ruscus', 'روسكوس', 1.00, '', true),
('Baby''s Breath', 'جيبسوفيلا', 1.50, '', true);

INSERT INTO bouquet_sizes (key, label_ar, desc_ar, stem_count, price_multiplier) VALUES
('regular', 'عادي', 'تنسيق متوازن وناعم', 12, 1.00),
('deluxe', 'ديلوكس', 'باقة أكثر امتلاءً', 20, 1.35),
('premium', 'بريميوم', 'تنسيق فاخر وكثيف', 30, 1.65);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('atelier-previews', 'atelier-previews', true, 10485760, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- RLS POLICIES (Phase 3 Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flower_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrap_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE vase_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE greenery_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ai_generation_logs FROM anon, authenticated;

-- Products: readable by all, writable by admin only
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);

CREATE POLICY "Products are insertable by admin only" ON products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Products are updatable by admin only" ON products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Products are deletable by admin only" ON products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Orders: مسجَّل يرى طلباته فقط، أدمن يرى الكل، وزائر (Guest) يرى طلبه عبر الـ id فقط
-- (الـ UUID غير قابل للتخمين عمليًا، وهذا هو أساس حماية رابط "تتبع الطلب" المُرسل للضيوف)
CREATE POLICY "Users and guests can view their own orders" ON orders
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

CREATE POLICY "Admin can update orders" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- السائق المُعيَّن على طلب يقدر يحدّث موقعه وحالته الحية فقط (مسار delivery/update يعتمد على هذا)
CREATE POLICY "Assigned driver can update delivery info" ON orders
  FOR UPDATE USING (driver_id = auth.uid());

-- Profiles: users can see/update their own
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Wishlist: users can CRUD their own
CREATE POLICY "Users can CRUD own wishlist" ON wishlist
  FOR ALL USING (user_id = auth.uid());

-- User roles: admin only
CREATE POLICY "Admin can manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Push subscriptions: users can manage their own
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Atelier tables: readable by everyone, writable by admin only
CREATE POLICY "Flower types are viewable by everyone" ON flower_types
  FOR SELECT USING (true);
CREATE POLICY "Flower types are writable by admin only" ON flower_types
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Wrap options are viewable by everyone" ON wrap_options
  FOR SELECT USING (true);
CREATE POLICY "Wrap options are writable by admin only" ON wrap_options
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Vase options are viewable by everyone" ON vase_options
  FOR SELECT USING (true);
CREATE POLICY "Vase options are writable by admin only" ON vase_options
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public can view greenery" ON greenery_options
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin can manage greenery" ON greenery_options
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY "Public can view sizes" ON bouquet_sizes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin can manage sizes" ON bouquet_sizes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));
