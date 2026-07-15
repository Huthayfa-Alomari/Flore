import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // تعيين نوع صريح مصفوفي (Explicit Array Type) لمنع خطأ Implicit Any
        setAll(
          cookiesToSet: Array<{
            name: string
            value: string
            options: Record<string, any>
          }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                '[Supabase SSR] setAll cookies skipped. This is expected behavior within read-only Server Components.'
              )
            }
          }
        },
      },
    }
  )
}
