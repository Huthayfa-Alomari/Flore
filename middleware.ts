import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// مسارات الـ Webhooks تُستدعى من خوادم خارجية (Stripe، CliQ) وليس من متصفح المستخدم،
// فلا يوجد لديها Origin header مطابق أصلاً — وهي محمية بالفعل عبر التحقق من التوقيع/السر الخاص بها
const WEBHOOK_PATHS = ['/api/payment/stripe/webhook', '/api/payment/cliq/callback']
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

function isCsrfSafe(request: NextRequest): boolean {
  if (!UNSAFE_METHODS.includes(request.method)) return true
  if (!request.nextUrl.pathname.startsWith('/api/')) return true
  if (WEBHOOK_PATHS.some((p) => request.nextUrl.pathname.startsWith(p))) return true

  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  // لا يوجد Origin على الإطلاق (بعض عملاء API/سكربتات لا ترسله) — نرفض بحذر لمسارات الحالة الحساسة
  if (!origin || !host) return false

  try {
    const originHost = new URL(origin).host
    return originHost === host
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  // حماية CSRF: رفض أي طلب POST/PUT/PATCH/DELETE على /api/* من أصل (Origin) مختلف عن التطبيق نفسه
  if (!isCsrfSafe(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  // Guard: إذا لم تكن env vars موجودة (مثلاً أثناء next build بدون .env.local)
  // نمرر الطلب مباشرة بدون تحقق من Supabase لتجنب إسقاط prerendering
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // حماية مسارات الأدمن
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (!role || (role as { role: string }).role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // إعادة توجيه المستخدمين المسجلين من صفحة الدخول
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/profile', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
