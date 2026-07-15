import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

// يعمل فقط إذا توفّرت بيانات اعتماد Upstash. في التطوير المحلي بدون هذه المتغيرات،
// نتجاوز الحد بأمان (fail-open) مع تحذير بدل تعطيل التطبيق بالكامل.
const redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
              url: process.env.UPSTASH_REDIS_REST_URL,
              token: process.env.UPSTASH_REDIS_REST_TOKEN,
          })
        : null

if (!redis && process.env.NODE_ENV === 'production') {
    console.warn(
        '[rate-limit] ⚠️ UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN غير مضبوطة — تحديد معدل الطلبات معطّل بالإنتاج!'
    )
}

// حدود مختلفة حسب حساسية المسار
const limiters = {
    // مسارات كتابة حساسة (طلبات، دفع): صارمة
    strict: redis
        ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:strict' })
        : null,
    // مسارات إدارية: معتدلة (المستخدم موثّق أصلاً كأدمن، لكن لمنع سكربتات آلية عبثية)
    admin: redis
        ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:admin' })
        : null,
    // الذكاء الاصطناعي: للحد من استهلاك تكلفة OpenRouter
    ai: redis
        ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'rl:ai' })
        : null,
}

export type RateLimitTier = keyof typeof limiters

/**
 * يتحقق من حد الطلبات لمعرّف معيّن (IP أو user id) ضمن فئة معينة.
 * يرجع null إذا كان الطلب مسموحًا، أو NextResponse بحالة 429 إذا تم تجاوز الحد.
 */
export async function checkRateLimit(
    identifier: string,
    tier: RateLimitTier
): Promise<NextResponse | null> {
    const limiter = limiters[tier]

    // Fail-open إذا Redis غير مُهيأ (بيئة تطوير محلي بدون مفاتيح Upstash)
    if (!limiter) return null

    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                },
            }
        )
    }

    return null
}

/** استخراج عنوان IP الحقيقي للعميل خلف بروكسي Vercel */
export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) return forwardedFor.split(',')[0].trim()
    return request.headers.get('x-real-ip') || 'unknown'
}
