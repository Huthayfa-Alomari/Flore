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
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6-ب. جدول الأخضريات — تستخدمه صفحة الأتيليه بخطوة "الأخضريات"
CREATE TABLE greenery_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    image TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6-ج. جدول أحجام الباقات — تستخدمه صفحة الأتيليه بخطوة "الحجم"
CREATE TABLE bouquet_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    label_ar TEXT NOT NULL,
    desc_ar TEXT,
    stem_count INTEGER NOT NULL,
    price_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6-د. سجل توليد صور الأتيليه — الحد اليومي الفعلي لمسار generate-preview
CREATE TABLE ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_generation_logs_identifier
    ON ai_generation_logs (identifier, created_at DESC);

-- 7. جدول الطلبات الشامل والمحمي (Orders Table)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- يكون NULL في حال الـ Guest
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_address TEXT NOT NULL,
    delivery_region TEXT,
    delivery_notes TEXT,
    delivery_date TIMESTAMPTZ,
    gift_message TEXT,
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
  FROM jsonb_to_recordset(NEW.items) AS x(product_id UUID, price NUMERIC, qty INT);

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

-- الكتالوج الفاخر الكامل (24 منتجًا) — نفس بيانات seed_luxury_products.sql
INSERT INTO products
  (name, name_en, category, price, currency, image, images, description, description_en, badge, badge_color, in_stock, ar_enabled, created_at) VALUES
-- === الواجهة الرئيسية (أحدث 8 تظهر في الصفحة الأولى) ===
('باقة فلوريه التوقيع', 'Floré Signature Bouquet', 'bouquets', 110.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d0b00e2422bf.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d0b00e2422bf.jpg','https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/cd6d2f13c644.jpg'],
 'تحفة فلوريه الأكثر تميزًا؛ مجموعة انتقائية من الورد والقرنفل والهورتنشيا بتدرجات الخوخ الدافئة، منسّقة بلمسة المصمم الشخصية وتغليف حريري فاخر. باقة تُهدي لمن يستحق الاستثناء بلا تردد، وتصل ملفوفة يدويًا من مشغلنا في عمّان.',
 'Our signature masterpiece; a curated blend of roses, carnations and hydrangeas in warm peach tones, hand-tied with designer silk wrapping. For the one who deserves the exceptional.',
 'توقيع المصمم', '#C9A961', true, false, now() - interval '0 hours'),

('باقة العشق الملكية', 'Royal Amour Roses', 'bouquets', 89.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8a57692f45dd.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8a57692f45dd.jpg','https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d6b2a10f1c5c.jpg','https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/95e7116acec2.jpg'],
 'خمسون وردة حمراء دانية كاملة التفتح، تُلف بعناية بورق حريري أسود وشريط مخملي أنيق. إعلان حب لا يُنسى في عيد ميلاد أو ذكرى سنوية أو خطوبة؛ الباقة التي تجعل اللحظة تُروى لاحقًا كقصة.',
 'Fifty lush red roses hand-wrapped in black silk paper with a velvet ribbon — an unforgettable declaration of love for birthdays, anniversaries and proposals.',
 'الأكثر مبيعًا', '#C9A961', true, false, now() - interval '1 hours'),

('قلب فلوريه', 'Cœur de Floré', 'preserved', 120.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/48031f066a37.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/48031f066a37.jpg'],
 'قلب أسود مخملي يضم وردًا محفوظًا حقيقيًا يدوم عامًا كاملًا دون ماء، بتنسيق يدوي من مشغلنا في عمّان. هدية تتجاوز الموسم وتبقى شاهدة على اللحظة؛ الأكثر طلبًا في اليوم العالمي للحب.',
 'A velvet black heart box of real preserved roses lasting a full year without water, hand-arranged in our Amman atelier. A gift that outlives the season.',
 'إصدار محدود', '#C9A961', true, false, now() - interval '2 hours'),

('صندوق الأبدية الأسود', 'Eternal Noir Box', 'preserved', 75.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0ddada61585a.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0ddada61585a.jpg','https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/c0fb9c9e78b1.jpg'],
 'صندوق أسود فاخر تتوسطه وردات حمراء محفوظة ببتروبوتانيم خاص يحافظ على نضارتها اثني عشر شهرًا كاملة. لا يحتاج ماءً ولا عناية؛ جمال ثابت يليق بمكتبها أو طاولتها، وهدية تُروى ولا تُنسى.',
 'A luxury black box of red preserved roses requiring no water for twelve months — enduring beauty for her desk or bedside.',
 'يدوم سنة كاملة', '#5E7261', true, false, now() - interval '3 hours'),

('باقة الفاوانيا الملكية', 'Royal Peony Bouquet', 'bouquets', 79.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d984c3a3ebbe.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d984c3a3ebbe.jpg','https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/aaa4a79cb9ee.jpg'],
 'فاوانيا وردية مقطوفة في ذروة تفتحها ببتلاتها الحريرية المتراكبة، مع لمسة فضية من الأوراق. موسمها قصير وما يجعلها أثمن؛ اطلبها الآن قبل نهاية الموسم، فهي الزهرة التي تسبقها سمعتها.',
 'Blush peonies cut at peak bloom with silvery foliage — a short season that makes them all the more precious.',
 'موسمي', '#5E7261', true, false, now() - interval '4 hours'),

('تنسيق الأوركيد الملكي', 'Royal Orchid Arrangement', 'vases', 95.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/02f6238a8da8.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/02f6238a8da8.jpg','https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/b9e56468e724.jpg'],
 'أوركيد أبيض ملكي منسّق في وعاء حجري منحوت يليق بالفنادق والردهات الفاخرة. تنسيق معماري هادئ يمنح أي مساحة حضورًا استثنائيًا، ويبقى متفتحًا شهورًا بأقل عناية.',
 'White phalaenopsis orchids in a sculpted stone vessel — an architectural statement for lobbies and luxe interiors, blooming for months.',
 'حصري', '#2A2A2A', true, false, now() - interval '5 hours'),

('باقة التوليب الهولندي', 'Dutch Tulip Bouquet', 'bouquets', 45.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/494be96d89a7.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/494be96d89a7.jpg','https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/79662fae2fc1.png'],
 'توليب هولندي طازج يصل أسبوعيًا من مزادات أمستردام، بتدرجات الأبيض والوردي الباستيل وتغليف أبيض ناصع. أناقة الربيع الهولندي بين يديك، وهدية مثالية للمعلمات والصديقات.',
 'Fresh Dutch tulips flown weekly from Amsterdam auctions in pastel blush tones with crisp white wrapping.',
 NULL, NULL, true, false, now() - interval '6 hours'),

('التنسيق الاستثنائي', 'Bleu Extraordinaire', 'vases', 125.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d506209454bb.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d506209454bb.jpg'],
 'قطعة فنية نادرة بأنتوريوم مرسوم يدويًا بتدرجات الأزرق والأبيض مع توليب مختار بعناية؛ لمن يبحث عن حديث مختلف تمامًا في عالم الزهور. عدد محدود جدًا من هذه التحفة كل موسم.',
 'A rare art piece of hand-painted blue anthuriums with select tulips — strictly limited quantities each season.',
 'إصدار محدود', '#C9A961', true, false, now() - interval '7 hours'),
-- === بقية الكتالوج ===
('باقة الأميرة', 'La Princesse', 'bouquets', 59.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a8795fe719f7.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a8795fe719f7.jpg','https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/19c408608520.jpg'],
 'ورد أبيض عاجي بلمسات وردية خجولة، ملفوف بورق كريمي ناعم وشريط ساتان حريري. رقة تكفي لتقول كل ما تعجز عنه الكلمات؛ الباقة المفضلة لعرس التخرج وعشاء العائلة.',
 'Ivory and blush roses in soft cream paper with satin ribbon — tenderness that speaks when words fail.',
 NULL, NULL, true, false, now() - interval '8 hours'),

('قلب الأكريك الوردي', 'Pink Acrylic Heart', 'preserved', 95.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/270a21ec29de.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/270a21ec29de.jpg'],
 'قلب أكريليك شفاف يكشف وردًا محفوظًا ورديًا في قلبه؛ تصميم عصري يحمل رومانسية كلاسيكية. الهدية المثالية للخطوبات وحفلات التخرج، وتدوم بسنتها كاملة بلا ماء أو ضوء خاص.',
 'A clear acrylic heart revealing blush preserved roses — modern design, timeless romance that lasts a full year.',
 NULL, NULL, true, false, now() - interval '9 hours'),

('الوردة الأبدية', 'The Eternal Rose', 'preserved', 49.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/2183d097597e.png',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/2183d097597e.png'],
 'وردة حمراء واحدة عملاقة محفوظة داخل صندوق أسود دائري مفتوح؛ بساطة مطلقة تليق باعتراف واحد مهم. تدوم سنة كاملة بلا ماء، وتصل في علبة هدايا مخملية جاهزة للإهداء.',
 'A single grand red preserved rose in an open black round box — pure simplicity for one important confession.',
 NULL, NULL, true, false, now() - interval '10 hours'),

('الصندوق الأسود المخملي', 'Velvet Noir', 'preserved', 85.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/cc978a728030.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/cc978a728030.jpg'],
 'باقة ورد أحمر كاملة النضارة داخل صندوق أسود مخملي مع خضرة إيطالية فاخرة؛ منتجنا الأكثر طلبًا في المناسبات الرسمية وتكريم الضيوف. يصل بشريط ساتان وبطاقة إهداء بخط اليد.',
 'Fresh red roses nested in a black velvet box with Italian greenery — our top formal-occasion choice, delivered with a satin ribbon and handwritten card.',
 NULL, NULL, true, false, now() - interval '11 hours'),

('مزهرية الزنبق والورد', 'Lily & Rose Vase', 'vases', 69.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/730f1657912d.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/730f1657912d.jpg','https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/4b071b532e6e.jpg'],
 'زنابق شرقية بيضاء عطرة تتفتح تدريجيًا على مدى أيام، مع ورد كريمي في مزهرية خضراء أنيقة. عطرها يملأ المكان وأثرها يبقى أسبوعًا كاملًا؛ هدية الدعوات والعزاء الراقي.',
 'Fragrant oriental lilies blooming in stages with cream roses in an elegant green vase — a full week of presence.',
 NULL, NULL, true, false, now() - interval '12 hours'),

('مزهرية الحديقة المزدهرة', 'Blooming Garden Vase', 'vases', 55.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/62311ef1eb14.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/62311ef1eb14.jpg'],
 'تنسيق حيوي بورد وأقحوان وزنابق في مزهرية زجاجية شفافة؛ روح حديقة ريفية تدخل البيت بلا عناء. مثالية لدعوات العشاء وهدايا الشكر.',
 'A lively mix of roses, daisies and lilies in clear glass — countryside charm for dinners and thank-yous.',
 NULL, NULL, true, false, now() - interval '13 hours'),

('باقة البنفسج الملكية', 'Royal Violet Bouquet', 'bouquets', 65.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/669f85df30a3.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/669f85df30a3.jpg'],
 'تنسيق بنفسجي ملكي بورد بنفسجي وشوك أزرق؛ لمن تفضل الجرأة الأنيقة على التقليد. تُلف بعناية بورق كحلي داكن وشريط فضي، وتصل بحضورها المميز الذي لا يشبه غيرها.',
 'A regal purple composition of violet roses and blue thistles wrapped in deep navy with silver ribbon.',
 NULL, NULL, true, false, now() - interval '14 hours'),

('باقة الخزامى البروفانسية', 'Provence Lavender', 'bouquets', 35.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/76be536faab0.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/76be536faab0.jpg'],
 'خزامى مجفف عطري من حقول بروفانس مع نفلة بيضاء ناعمة؛ عطرها الهادئ يبقى شهورًا بعد جفافها. الهدية الذكية لمن يحب التفاصيل الهامسة وتفاصيل البيوت الدافئة.',
 'Aromatic dried Provence lavender with soft baby breath — a whispering scent that lingers for months.',
 NULL, NULL, true, false, now() - interval '15 hours'),

('باقة الحديقة الفنية', 'Artisan Garden Bouquet', 'bouquets', 49.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8d2f460f049d.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8d2f460f049d.jpg'],
 'تركيبة فنية من اللوفيز والتوليب والورد الأحمر بألوان دافئة متدرجة؛ تنسيق حرفي غير مكرر يعبّر عن ذوق مختلف. لمن يريد باقة يشبهها أحد؛ كل نسخة منها وحيدة.',
 'An artistic medley of sweet peas, tulips and red roses in graduated warm tones — never repeated, each one unique.',
 NULL, NULL, true, false, now() - interval '16 hours'),

('باقة الشمس المشرقة', 'Soleil Bouquet', 'bouquets', 39.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5f655c377915.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5f655c377915.jpg'],
 'عباد شمس أصفر كامل التفتح يلخص فرحة النهار في باقة واحدة؛ لتدخل الدفء والابتسامة إلى أي بيت. الهدية المثالية لليوم العادي الذي تريد جعله استثنائيًا.',
 'Full-bloom golden sunflowers that bottle a whole day of joy — for ordinary days made extraordinary.',
 NULL, NULL, true, false, now() - interval '17 hours'),

('قلب الشوكولاتة والورد', 'Chocolate & Roses Heart', 'chocolates', 49.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/7e0889ed85e3.png',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/7e0889ed85e3.png'],
 'قلب من الشوكولاتة الفاخرة تعلوه وردة حمراء حقيقية؛ الجمع بين أكثر ما يحب قلبٌ واحد. يصل بتغليف هدايا مخملي وبطاقة إهداء، جاهز للتسليم فورًا.',
 'A heart of premium chocolates crowned with a real red rose — instantly giftable in velvet packaging.',
 'هدية مثالية', '#2A2A2A', true, false, now() - interval '18 hours'),

('شوكولاتة المخمل بالورد', 'Velvet Rose Chocolates', 'chocolates', 39.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0a4102e06301.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0a4102e06301.jpg'],
 'تشكيلة شوكولاتة بلجيكية فاخرة مصفوفة بعناية مع وردة تزيين حقيقية؛ مرافقة مثالية لأي باقة تختارها من الكتالوج. تجمع بين حلاوة الشوكولاتة وعبق الزهور في هدية واحدة.',
 'Fine Belgian chocolates artfully arranged with a real accent rose — the perfect companion to any bouquet.',
 NULL, NULL, true, false, now() - interval '19 hours'),

('شمعة العنبر الفاخرة', 'Ambre Luxe Candle', 'accessories', 22.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3641d28372bd.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3641d28372bd.jpg'],
 'شمعة صويا عطرية برائحة العنبر الدافئ في وعاء زجاجي ذهبي مشغول؛ تدوم أكثر من خمسين ساعة وتلهب حواس المساء. توقيع فلوريه على الليالي الهادئة وهدية المضيفات الراقية.',
 'A warm amber soy candle in gilded glass — over fifty hours of evening indulgence, our hostess gift of choice.',
 NULL, NULL, true, false, now() - interval '20 hours'),

('شمعة الليل المخملية', 'Velvet Night Candle', 'accessories', 18.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/10f82b3f80b6.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/10f82b3f80b6.jpg'],
 'شمعة بخلاصة الياسمين الليلي والفانيلا داخل زجاج محبب بغطاء أسود أنيق؛ رفيقة الأمسيات الهادئة والحمّامات الطويلة. تعمل بضوء واحد يكفي لتغيير مزاج الغرفة.',
 'Night jasmine and vanilla in textured glass with a sleek black lid — one flame, a whole new mood.',
 NULL, NULL, true, false, now() - interval '21 hours'),

('شجرة الزيتون الصغيرة', 'Petite Olive Tree', 'plants', 45.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/ec644fc0ff0b.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/ec644fc0ff0b.jpg'],
 'شجرة زيتون حقيقية في أصيص سيراميك بيج؛ رمز السلام والخصب الذي يكبر مع صاحبه عامًا بعد عام. تروى مرة كل أسبوعين فقط، وتناسب الشرفات والإضاءة الطبيعية غير المباشرة.',
 'A live olive tree in a beige ceramic pot — a symbol of peace that grows year after year, watered just twice a month.',
 NULL, NULL, true, false, now() - interval '22 hours'),

('حديقة الصبار المصغرة', 'Mini Succulent Garden', 'plants', 28.00, 'JOD',
 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d4bfd0d42921.jpg',
 ARRAY['https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d4bfd0d42921.jpg'],
 'تشكيلة عصاريات ملونة في وعاء أبيض أنيق؛ زينة مكتب لا تذبل مع النسيان. هدية عملية أنيقة للزملاء والمعلمين، وتروى مرة كل أسبوعين بملعقة ماء واحدة.',
 'Colourful succulents in a sleek white bowl — desk greenery that forgives neglect, watered just weekly.',
 NULL, NULL, true, false, now() - interval '23 hours');


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

-- بيانات الأخضريات الأولية
INSERT INTO greenery_options (name, name_ar, price, in_stock) VALUES
('Eucalyptus', 'أوكاليبتوس (اليوكالبتوس)', 2.00, true),
('Ruscus', 'روكسس (أسل إيطالي)', 2.50, true),
('Baby''s Breath (Gypsophila)', 'خمسينة (نفلة)', 1.50, true),
('Leatherleaf Fern', 'سرخس الجلد', 1.00, true),
('Italian Ruscus', 'روكسس إيطالي فاخر', 3.00, true),
('Pittosporum', 'بيتوسبورم (خروع الجبل)', 1.50, true);

-- بيانات أحجام الباقات الأولية
INSERT INTO bouquet_sizes (key, label_ar, desc_ar, stem_count, price_multiplier, sort_order) VALUES
('petite', 'صغيرة', 'لمسة لطيفة تناسب أي مساحة', 10, 1.00, 1),
('classic', 'كلاسيكية', 'الخيار الأمثل لمعظم المناسبات', 20, 1.50, 2),
('grand', 'كبيرة', 'حضور فاخر يلفت الأنظار', 35, 2.20, 3),
('luxury', 'فاخرة', 'تجربة فلوري الكاملة بلا حدود', 50, 3.00, 4);

-- bucket معاينات الأتيليه (عام)
INSERT INTO storage.buckets (id, name, public)
VALUES ('atelier-previews', 'atelier-previews', true)
ON CONFLICT (id) DO NOTHING;

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
ALTER TABLE greenery_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vase_options ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Greenery options are viewable by everyone" ON greenery_options
  FOR SELECT USING (true);
CREATE POLICY "Greenery options are writable by admin only" ON greenery_options
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Bouquet sizes are viewable by everyone" ON bouquet_sizes
  FOR SELECT USING (true);
CREATE POLICY "Bouquet sizes are writable by admin only" ON bouquet_sizes
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- سجل توليد الصور: يُدار حصراً عبر service role من مسارات السيرفر
CREATE POLICY "No client access to ai_generation_logs" ON ai_generation_logs
  FOR SELECT USING (false);

-- معاينات الأتيليه: قراءة عامة، رفع عبر السيرفر فقط
CREATE POLICY "Atelier previews are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'atelier-previews');
