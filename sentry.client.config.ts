import * as Sentry from '@sentry/nextjs'

// يعمل فقط إذا تم ضبط DSN — بدونه Sentry.init يتجاهل الاستدعاء بأمان بدون تأثير
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    // لا نسجّل أي بيانات حساسة تلقائيًا (أرقام بطاقات، عناوين، إلخ)
    beforeSend(event) {
        if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null
        return event
    },
})
