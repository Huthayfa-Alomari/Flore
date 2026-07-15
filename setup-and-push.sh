#!/bin/bash
# ============================================================
# Floré Luxury v2 — Setup & Push Script
# Run this on your local machine after downloading the project
# ============================================================

set -e  # Exit on error

echo "🌹 Floré Luxury v2 Setup"
echo "========================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the flore-luxury folder"
    exit 1
fi

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Verify build
echo "🔧 Verifying build..."
npm run typecheck

# 3. Run tests
echo "🧪 Running tests..."
npm run test -- --run

# 4. Build
echo "🏗️ Building..."
npm run build

echo ""
echo "✅ Build successful!"
echo ""

# 5. Setup git remote (if not already set)
if ! git remote get-url origin &>/dev/null; then
    echo "🔗 Adding remote origin..."
    git remote add origin https://github.com/Huthayfa-Alomari/Flore.git
fi

# 6. Push to GitHub
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo ""
echo "========================"
echo "✅ Done! Repository pushed to:"
echo "   https://github.com/Huthayfa-Alomari/Flore"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Go to GitHub repo → Settings → Secrets → Actions"
echo "   2. Add all environment variables (see .env.example)"
echo "   3. Regenerate ALL Supabase keys (old ones were exposed!)"
echo "   4. Apply supabase/schema.sql in Supabase SQL Editor"
echo "   5. Generate new VAPID keys: npx web-push generate-vapid-keys"
echo "========================"
