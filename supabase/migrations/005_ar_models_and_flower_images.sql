-- FLORÉ migration 005: connect 3D product models and AI reference images.
-- Safe to run repeatedly on an existing database.
ALTER TABLE products ADD COLUMN IF NOT EXISTS model_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ar_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE flower_types ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT '';

UPDATE products SET model_url = '/models/rose-bouquet-red.glb', ar_enabled = true WHERE name = 'باقة العشق الملكية';
UPDATE products SET model_url = '/models/rose-bouquet-white.glb', ar_enabled = true WHERE name = 'باقة الأميرة';
UPDATE products SET model_url = '/models/peony-bouquet-pink.glb', ar_enabled = true WHERE name = 'باقة الفاوانيا الملكية';
UPDATE products SET model_url = '/models/tulip-bouquet.glb', ar_enabled = true WHERE name = 'باقة التوليب الهولندي';
UPDATE products SET model_url = '/models/preserved-box-noir.glb', ar_enabled = true WHERE name = 'صندوق الأبدية الأسود';

UPDATE flower_types SET image = 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8a57692f45dd.jpg' WHERE name = 'Red Rose' AND COALESCE(image, '') = '';
UPDATE flower_types SET image = 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a8795fe719f7.jpg' WHERE name = 'White Rose' AND COALESCE(image, '') = '';
UPDATE flower_types SET image = 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d984c3a3ebbe.jpg' WHERE name = 'Pink Peony' AND COALESCE(image, '') = '';
UPDATE flower_types SET image = 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5f655c377915.jpg' WHERE name = 'Sunflower' AND COALESCE(image, '') = '';
UPDATE flower_types SET image = 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/76be536faab0.jpg' WHERE name = 'Lavender' AND COALESCE(image, '') = '';
