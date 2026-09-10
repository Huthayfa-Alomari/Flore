# 🌹 FLORÉ Luxury - فلوري

Premium Arabic-first luxury flower e-commerce web application built with Next.js 14, Supabase, and Three.js.

## 🎯 Features

- **Premium Design**: Light Luxury Minimal aesthetic with RTL Arabic support
- **Full E-commerce**: Product catalog, cart, checkout (WhatsApp, CliQ, Cash)
- **3D Atelier**: Build custom bouquets with Three.js
- **Photorealistic AI Atelier**: Generate a realistic preview of the selected flowers, colors, size, and container
- **AR Experience**: WebXR product preview with Google Model Viewer
- **Live Tracking**: Real-time order tracking with Supabase Realtime
- **AI Concierge**: Smart assistant for flower recommendations
- **Admin Dashboard**: Manage orders and products

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v3 + CSS Variables
- **UI**: Radix UI + Custom Components
- **Animations**: Framer Motion
- **3D**: Three.js + React Three Fiber
- **AR**: Google Model Viewer
- **Backend**: Supabase (Auth, Database, Realtime)
- **State**: Zustand (Cart + Wishlist)
- **Testing**: Vitest + React Testing Library

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- (Optional) OpenAI API key for AI Concierge
- (Optional) Google Maps API key for tracking

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/flore-luxury.git
cd flore-luxury
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials and other API keys.

4. Set up Supabase database:
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql`
   - Run the seed data

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Database Setup

Run the following SQL in your Supabase SQL Editor:

1. Enable UUID extension
2. Create tables (products, profiles, orders, wishlist, etc.)
3. Set up RLS policies
4. Create triggers
5. Enable Realtime
6. Insert seed data

See the full schema in the project documentation.

## 📁 Project Structure

```
flore-luxury/
├── app/                 # Next.js App Router pages
├── components/          # Shared & feature components
├── lib/                 # Utilities, stores, API clients
├── hooks/               # Custom React hooks
├── types/               # TypeScript interfaces
├── public/              # Static assets
├── __tests__/           # Test files
└── ...
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui
```

## 📝 Environment Variables

| Variable                          | Description                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon key                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase service role key                                          |
| `OPENAI_API_KEY`                  | OpenAI API key (optional)                                          |
| `CLOUDFLARE_ACCOUNT_ID`           | Cloudflare account ID for Workers AI image previews (recommended)  |
| `CLOUDFLARE_API_TOKEN`            | Server-only Workers AI token (recommended)                         |
| `ATELIER_AI_DAILY_LIMIT`          | Successful previews allowed per user/IP in 24 hours (default: `5`) |
| `AI_RATE_LIMIT_SECRET`            | Long server-only secret used to anonymize usage identifiers        |
| `ATELIER_AI_PUBLIC_FALLBACK`      | Keep the no-key Pollinations fallback enabled (`true` by default)  |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (optional)                                     |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`    | Web Push VAPID public key                                          |
| `VAPID_PRIVATE_KEY`               | Web Push VAPID private key                                         |

### Photorealistic Atelier setup

The Atelier uses Cloudflare Workers AI with `FLUX.2 Klein 4B` as its primary image model and automatically falls back to the existing no-key Pollinations provider. Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to the server or Vercel environment for the highest-quality path; never expose the token with a `NEXT_PUBLIC_` prefix.

Generated previews are normalized to JPEG and saved in the public Supabase Storage bucket `atelier-previews`. Successful usage is counted in `ai_generation_logs` using an anonymized user/IP identifier, so the existing bucket, table, and `SUPABASE_SERVICE_ROLE_KEY` must be available.

## 🎨 Design System

- **Primary**: Deep Teal (#A8813C)
- **Gold**: Soft Gold (#E7D8B9)
- **Background**: Ivory White (#FAF9F6)
- **Typography**: Amiri (Arabic headings), Noto Sans Arabic (body)

## 📱 Responsive

- Mobile-first design
- Bottom navigation on mobile
- Top navigation on desktop
- Full RTL support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

---

Built with ❤️ in Amman, Jordan
