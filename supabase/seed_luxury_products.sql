-- ============================================================
-- 🌸 Floré Luxury — كتالوج المنتجات الفاخر (24 منتجًا)
-- شغّله بعد تطبيق schema.sql والمigrations في Supabase SQL Editor.
-- آمن لإعادة التشغيل: يضيف المنتجات الناقصة فقط ولا يمسح أو يغيّر منتجات المتجر الحالية.
-- الصور مستضافة على CDN عام ومربوطة في next.config.js
-- ============================================================

-- مسح أي منتجات سابقة (الطلبات تحفظ نسخة من البيانات فلا تتأثر)
-- لا نحذف المنتجات الموجودة؛ هذا الملف يضيف المنتجات الناقصة فقط.
INSERT INTO products (name, name_en, category, price, currency, image, images, description, description_en, badge, badge_color, in_stock, ar_enabled, created_at)
SELECT seed.* FROM (VALUES
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
 NULL, NULL, true, false, now() - interval '23 hours'
) AS seed(name, name_en, category, price, currency, image, images, description, description_en, badge, badge_color, in_stock, ar_enabled, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM products existing WHERE lower(existing.name) = lower(seed.name)
);
