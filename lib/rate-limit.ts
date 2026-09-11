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

function numberInRange(value: unknown, min: number, max: number, fallback: number) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(max, Math.max(min, Math.round(parsed)))
}

const atelierDailyLimit = numberInRange(
    process.env.ATELIER_AI_DAILY_LIMIT,
    1,
    20,
    5
)

const atelierDailyLimiter = redis
    ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(atelierDailyLimit, '24 h'),
          prefix: 'rl:atelier-ai:daily:v1',
          timeout: 3_000,
      })
    : null

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

export type AtelierDailyQuota = {
    success: boolean
    limit: number
    remaining: number
    reset: number
}

/**
 * Reads the daily Atelier quota without consuming a generation attempt.
 * Returns null when Upstash is not configured or temporarily unavailable so
 * the route can use its backwards-compatible Supabase fallback.
 */
export async function getAtelierDailyQuota(
    identifier: string
): Promise<Omit<AtelierDailyQuota, 'success'> | null> {
    if (!atelierDailyLimiter) return null

    try {
        const result = await atelierDailyLimiter.getRemaining(identifier)
        return {
            limit: result.limit,
            remaining: Math.max(0, Math.min(result.limit, result.remaining)),
            reset: result.reset,
        }
    } catch (error) {
        console.warn('[rate-limit] failed to read Atelier daily quota', error)
        return null
    }
}

/**
 * Atomically reserves one expensive image generation attempt in Upstash.
 * Provider failures still consume the attempt because they can consume the
 * free provider allocation too. Cached previews never call this function.
 */
export async function consumeAtelierDailyQuota(
    identifier: string
): Promise<AtelierDailyQuota | null> {
    if (!atelierDailyLimiter) return null

    try {
        const result = await atelierDailyLimiter.limit(identifier)

        if (result.reason === 'timeout') return null

        return {
            success: result.success,
            limit: result.limit,
            remaining: Math.max(0, Math.min(result.limit, result.remaining)),
            reset: result.reset,
        }
    } catch (error) {
        console.warn('[rate-limit] failed to reserve Atelier daily quota', error)
        return null
    }
}

/** استخراج عنوان IP الحقيقي للعميل خلف بروكسي Vercel */
export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) return forwardedFor.split(',')[0].trim()
    return request.headers.get('x-real-ip') || 'unknown'
}
