import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// External payment callbacks authenticate requests with their own signatures/secrets.
const WEBHOOK_PATHS = ['/api/payment/stripe/webhook', '/api/payment/cliq/callback']
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

function isCsrfSafe(request: NextRequest): boolean {
  if (!UNSAFE_METHODS.includes(request.method)) return true
  if (!request.nextUrl.pathname.startsWith('/api/')) return true
  if (WEBHOOK_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) return true

  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  // Keep CSRF protection on unsafe API requests, including public API routes.
  if (!isCsrfSafe(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginRoute = pathname === '/login'

  // Public pages and APIs do not need a Supabase network round-trip here.
  // Auth checks are performed only on routes whose behavior depends on the session.
  if (!isAdminRoute && !isLoginRoute) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    // Do not allow protected admin pages to proceed when auth is misconfigured.
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Fail closed for protected admin pages if Supabase auth cannot be verified.
  if (isAdminRoute) {
    if (error || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (roleError || !role || role.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (isLoginRoute && user && !error) {
    return NextResponse.redirect(new URL('/profile', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
