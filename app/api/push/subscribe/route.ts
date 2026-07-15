import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()

  // 1. التحقق من هوية المستخدم الحالية من السيرفر
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const subscription = await request.json()

    // التحقق من أن البيانات القادمة تحتوي على المفاتيح المطلوبة لمنع الـ Runtime Errors
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
    }

    // 2. تخزين أو تحديث بيانات الاشتراك بأمان
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString() // لتوثيق وقت التحديث المباشر
      }, {
        // نمرر الحقول كمصفوفة مدعومة أو نترك الـ Supabase يتعامل مع الـ Primary/Unique Key تلقائياً
        onConflict: 'endpoint'
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}