# FLORÉ — Supabase database setup

## Existing project (recommended)

Do **not** run `supabase/schema.sql` against a database that already contains customer orders or products. That file is a fresh-install schema and contains destructive `DROP TABLE ... CASCADE` statements.

For an existing Supabase project, run the migrations in order from the SQL Editor:

1. `migrations/002_atelier_tables.sql`
2. `migrations/003_add_accessories_and_plants_categories.sql`
3. `migrations/004_atelier_missing_tables.sql`
4. `migrations/005_ar_models_and_flower_images.sql`
5. `migrations/006_atomic_ai_generation_quota.sql`

Then run `seed_luxury_products.sql`. The seed adds the 24 catalog products that are missing by name. It does not delete existing products or overwrite existing product details. Review the proposed catalog and product image CDN URLs before production use.

## New, empty database

Only for a genuinely empty project, review `schema.sql` and run it first, then run the migrations and product seed above. Never use the fresh-install schema as an upgrade script.

## AI configuration

Set `OPENROUTER_API_KEY`, `OPENROUTER_CHAT_MODEL`, and `OPENROUTER_IMAGE_MODEL` in the deployment environment. Configure both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for distributed rate limiting. In production, the chat and image-preview endpoints intentionally return 503 when rate limiting is not configured rather than allowing unbounded billable requests.

The Atelier daily quota uses the `claim_ai_generation` RPC from migration 006 to reserve quota atomically. The service-role key must remain server-side and must never use a `NEXT_PUBLIC_` prefix.

## 3D model assets

The handoff archive includes five GLB files and PBR textures under `public/models/`. Copy those binary assets into the same paths and commit them before enabling AR. Keep `ar_enabled` false in production while the referenced files return 404.
