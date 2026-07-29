import { createServiceClient } from '@/lib/supabase/service'
import { Flower2 } from 'lucide-react'

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
            <div className="min-h-screen flex items-center justify-center bg-flore-bg px-4" dir="rtl">
                <div className="text-center">
                    <Flower2 className="h-12 w-12 text-flore-primary mx-auto mb-3" />
                    <p className="text-flore-text-secondary">لا توجد رسالة إهداء لهذا الرابط</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-flore-bg px-4 py-12" dir="rtl">
            <div className="max-w-md w-full bg-flore-card rounded-3xl border border-flore-border shadow-luxury p-8 text-center">
                <Flower2 className="h-10 w-10 text-flore-primary mx-auto mb-4" />
                <p className="text-xs text-flore-text-secondary uppercase tracking-widest mb-2">رسالة إهداء من Floré</p>
                <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-6">لك هذه اللحظة 🌸</h1>

                {order.gift_media_url && order.gift_media_type === 'video' && (
                    <video src={order.gift_media_url} controls className="w-full rounded-2xl mb-6" />
                )}
                {order.gift_media_url && order.gift_media_type === 'audio' && (
                    <audio src={order.gift_media_url} controls className="w-full mb-6" />
                )}

                {order.gift_message && (
                    <p className="font-amiri text-lg text-flore-text-primary italic leading-relaxed">
                        &quot;{order.gift_message}&quot;
                    </p>
                )}
            </div>
        </div>
    )
}