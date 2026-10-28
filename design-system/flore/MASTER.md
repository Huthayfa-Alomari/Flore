# FLORÉ — Master Design System

## Product intent
A premium Jordanian gifting atelier: intimate, editorial, precise, and calm. FLORÉ should feel like a luxury house, not a discount marketplace. The experience emphasizes thoughtful gifting, curated discovery, and a guided bouquet-building studio.

## Art direction
- Concept: **The Art of Giving** — "بعض المشاعر، لا تُقال. بل تُهدى."
- Visual style: editorial luxury with tactile paper-like surfaces, restrained composition, botanical imagery, asymmetry, generous whitespace, and fine rules.
- Avoid loud gradients, excessive rounded pills, noisy badges, dense grids, generic SaaS cards, aggressive animations, fake ratings/social proof, and decoration that competes with product photography.
- Use high-quality floral/product photography, stable aspect ratios, meaningful alt text, and reserved image space to avoid layout shift.

## Color tokens
Use existing CSS variables as the source of truth:
- Warm ivory: `--flore-bg: #FAF9F5`
- Secondary ivory: `--flore-bg-alt: #F2F0E9`
- Deep sage: `--flore-primary: #5E7261`
- Sage hover: `--flore-primary-dark: #4B5D4D`
- Champagne: `--flore-gold: #CBB47F`
- Deep champagne: `--flore-gold-dark: #AB915D`
- Ink: `--flore-text-primary: #2B2B27`
- Secondary text: `--flore-text-secondary: #6E6E66`
- Hairline: `--flore-border: #E8E5DD`
- Card: `--flore-card: #FFFFFF`
Dark mode must continue using existing `[data-theme="dark"]` tokens; avoid light-only hard-coded surfaces.

## Typography
- Arabic display/headlines: Amiri, weights 400/700.
- Arabic UI/body: Noto Sans Arabic, weights 300/400/500/700.
- Latin editorial accent: Cormorant, including italic.
- Body target: 16px with comfortable line-height. Helper text should remain readable and not fall below 12px except decorative micro-labels.

## Shape, spacing, and motion
- Prefer 3–5px corner radii for primary surfaces; pill shapes only for deliberate chips or status indicators.
- Use thin borders and soft shadows rather than elevated card stacks.
- Interactive targets should be at least 44×44px where practical.
- Motion: restrained 200–300ms transitions, meaningful state changes, and `prefers-reduced-motion` support.
- Mobile-first layouts, no horizontal page overflow, and safe-area spacing around bottom navigation.

## Screen patterns
- Home: one strong editorial message, hero photography, one primary CTA ("اصنع هديتك"), and one secondary discovery action.
- Catalog: clear title, search/filter controls, product-first gallery, simple category/sort affordances, calm empty/loading states.
- Atelier: guided steps, understandable selections, transparent price impact, and a mobile-safe preview/summary.
- Cart: obvious item edits, quantity controls, total, and one dominant checkout action.
- Checkout: labelled fields, inline errors, transparent total/delivery/payment expectations, loading feedback, no surprise steps.
- Profile/auth: concise account actions, visible validation/success states, privacy-conscious wording.
- Admin: legible tables, distinct statuses, keyboard/touch accessibility, and responsive overflow containers.

## Accessibility and QA gate
- Keyboard-accessible controls and visible focus states.
- Accessible names for icon-only actions and meaningful image alt text.
- WCAG AA contrast target (4.5:1 for normal text).
- Inputs require visible labels; validation feedback belongs near the relevant field.
- No hover-only functionality; touch targets at least 44px where practical.
- Test light/dark themes, mobile widths (360px/390px), tablet, and desktop.
- Before merge run `npm ci`, `npm run typecheck`, `npm test -- --run`, and `npm run build`.
- Verify Supabase loading, add-to-cart, quantity edits, checkout submission, auth, admin actions, and reduced-motion behavior. Never report these as verified until actually run.
