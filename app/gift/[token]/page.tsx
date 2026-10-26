import Link from 'next/link'
import { Flower2, Music, Sparkles } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export default async function GiftPage({ params }: { params: { token: string } }) {
    const supabase = createServiceClient()

    const { data: order } = await supabase
        .from('orders')
        .select('gift_message, gift_media_url, gift_media_type, customer_name')
        .eq('gift_token', params.token)
        .single()

    if (!order || (!order.gift_message && !order.gift_media_url)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-flore-bg px-4" dir="rtl">
                <div className="max-w-sm text-center animate-fade-up">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-flore-subtle">
                        <Flower2 className="h-9 w-9 text-flore-primary" />
                    </div>
                    <p className="flore-eyebrow mb-3">A GIFT FOR YOU</p>
                    <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
                        لا توجد رسالة إهداء
                    </h1>
                    <p className="mb-8 text-sm leading-relaxed text-flore-text-secondary">
                        لا توجد رسالة إهداء لهذا الرابط
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-flore-border bg-flore-card px-6 py-3 text-sm font-medium text-flore-text-primary transition-all duration-200 ease-flore hover:border-flore-primary/40 hover:bg-flore-subtle/50 active:scale-[0.97] cursor-pointer"
                    >
                        العودة للرئيسية
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-flore-bg px-4 py-16"
            dir="rtl"
        >
            {/* هالات ناعمة تحاكي فتح صندوق هدية */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-flore-blush/40 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-flore-subtle/60 blur-3xl"
            />

            <div className="relative w-full max-w-lg animate-fade-up">
                <div className="relative overflow-hidden rounded-[2rem] border border-flore-border/70 bg-flore-card px-8 py-12 text-center shadow-luxury md:px-12">
                    {/* الختم النباتي */}
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-flore-subtle">
                        <Flower2 className="h-9 w-9 text-flore-primary" />
                    </div>

                    <p className="flore-eyebrow mb-3">A GIFT FOR YOU</p>
                    <h1 className="font-amiri text-3xl font-bold text-flore-text-primary">
                        لك هذه اللحظة
                    </h1>

                    {/* الوسائط — فيديو أو صوت */}
                    {order.gift_media_url && order.gift_media_type === 'video' && (
                        <div className="mt-8 overflow-hidden rounded-2xl border border-flore-border/70 shadow-luxury-soft">
                            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                            <video src={order.gift_media_url} controls className="w-full" />
                        </div>
                    )}
                    {order.gift_media_url && order.gift_media_type === 'audio' && (
                        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-flore-border/70 bg-flore-subtle/60 p-5 text-right">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-flore-border/60 bg-flore-card">
                                <Music className="h-5 w-5 text-flore-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="mb-1.5 text-xs font-medium text-flore-text-secondary">
                                    رسالة صوتية خاصة
                                </p>
                                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                <audio src={order.gift_media_url} controls className="w-full" />
                            </div>
                        </div>
                    )}

                    {/* رسالة الإهداء بخط أميري وعلامة تنصيص ذهبية */}
                    {order.gift_message && (
                        <>
                            <div className="flore-divider mb-7">
                                <span className="h-1.5 w-1.5 rotate-45 bg-flore-gold" />
                            </div>
                            <blockquote className="relative">
                                <span
                                    aria-hidden
                                    className="pointer-events-none absolute -top-5 right-0 select-none font-display text-6xl leading-none text-flore-gold/50"
                                >
                                    &ldquo;
                                </span>
                                <p className="font-amiri text-xl leading-loose text-flore-text-primary">
                                    {order.gift_message}
                                </p>
                            </blockquote>
                        </>
                    )}

                    {order.customer_name && (
                        <p className="mt-7 text-xs text-flore-text-secondary">
                            مُهداة من {order.customer_name}
                        </p>
                    )}

                    {/* توقيع فلوري */}
                    <div className="mt-8 flex items-center justify-center gap-2 text-flore-gold-dark">
                        <Sparkles className="h-3 w-3" />
                        <span className="h-px w-10 rounded-full bg-flore-gold/50" />
                        <Sparkles className="h-3 w-3" />
                    </div>
                    <p className="mt-3 font-display text-sm italic tracking-wide text-flore-text-secondary" dir="ltr">
                        Floré — with love
                    </p>
                </div>
            </div>
        </div>
    )
}
