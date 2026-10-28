# FLORÉ AI, Catalog, and AR integration

## Concierge
- Product recommendations now receive the live in-stock product catalog from Supabase on each request.
- The system prompt no longer invents static prices or claims order actions that it cannot perform.
- Chat calls have a timeout and support `OPENROUTER_CHAT_MODEL`.
- In production, the endpoint fails closed when Upstash distributed rate limiting is not configured.

## Atelier image previews
- Image generation first tries OpenRouter with up to three reference images from the selected flower records.
- Pollinations is a fallback only; outputs are normalized to JPEG, resized, and size-limited before upload.
- Inputs are schema-validated and limited.
- The daily quota uses the atomic `claim_ai_generation` RPC from migration 006 to prevent parallel requests from bypassing the daily cap.
- Failed image generation still consumes a quota reservation to avoid repeated billable attempts.

## Product catalog
- `supabase/seed_luxury_products.sql` contains 24 curated products.
- The seed is non-destructive: it inserts products whose Arabic/primary name is not already present and does not delete existing rows.
- Verify product image URLs, seasonal availability, pricing, and stock before launch. Catalog seed values are initial sample data, not proof of current inventory.

## 3D AR
- The archive contains five GLB models and PBR texture assets.
- Copy those binary files into `public/models/` and commit them before enabling AR on the corresponding products.
- Migration 005 deliberately leaves AR disabled so the UI does not link to missing model files.
