import { NextResponse } from 'next/server'

// DEPRECATED: Use /auth/callback instead
// This route redirects to the secure callback route
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    return NextResponse.redirect(`${origin}/auth/callback?code=${code}&next=${encodeURIComponent(next)}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
