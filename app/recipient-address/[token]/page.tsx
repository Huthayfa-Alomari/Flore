'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, Gift, Check, ChevronDown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function RecipientAddressPage() {
    const params = useParams()
    const token = params.token as string

    const [address, setAddress] = useState('')
    const [region, setRegion] = useState('amman')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/orders/recipient-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, address, region }),
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'حدث خطأ، حاول مجدداً')
            }
            setDone(true)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'حدث خطأ')
        } finally {
            setLoading(false)
        }
    }

    if (done) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-flore-bg px-4 py-12" dir="rtl">
                <div className="w-full max-w-md animate-fade-up rounded-3xl border border-flore-border/70 bg-flore-card p-8 text-center shadow-luxury-soft md:p-10">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-flore-subtle">
                        <Check className="h-10 w-10 text-flore-success" strokeWidth={2.5} />
                    </div>
                    <p className="flore-eyebrow mb-3">ALL SET</p>
                    <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
                        تم استلام عنوانك
                    </h1>
                    <p className="text-sm leading-relaxed text-flore-text-secondary">
                        شكراً! سيتم البدء بتجهيز هديتك وتوصيلها قريباً.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-flore-bg px-4 py-12" dir="rtl">
            <div className="w-full max-w-md animate-fade-up rounded-3xl border border-flore-border/70 bg-flore-card p-8 shadow-luxury-soft md:p-10">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-flore-subtle">
                        <Gift className="h-8 w-8 text-flore-primary" />
                    </div>
                    <p className="flore-eyebrow mb-3">DELIVERY ADDRESS</p>
                    <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
                        لديك هدية بانتظارك
                    </h1>
                    <p className="text-sm leading-relaxed text-flore-text-secondary">
                        أدخل عنوانك لنتمكن من توصيل هديتك من Floré
                    </p>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-5 flex items-center gap-2.5 rounded-2xl border border-flore-error/20 bg-flore-error/5 px-4 py-3 text-sm text-flore-error"
                    >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="region"
                            className="mb-2 block text-sm font-medium text-flore-text-primary"
                        >
                            المنطقة
                        </label>
                        <div className="relative">
                            <MapPin className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-flore-text-secondary/60" />
                            <select
                                id="region"
                                value={region}
                                onChange={e => setRegion(e.target.value)}
                                className="w-full cursor-pointer appearance-none rounded-2xl border border-flore-border bg-flore-card py-3 pl-11 pr-11 text-sm text-flore-text-primary transition-all duration-200 ease-flore hover:border-flore-sage focus:border-flore-primary/50 focus:outline-none focus:ring-4 focus:ring-flore-primary/10"
                            >
                                <option value="amman">عمّان</option>
                                <option value="zarqa">الزرقاء</option>
                                <option value="irbid">إربد</option>
                                <option value="other">أخرى</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-flore-text-secondary/60" />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="address"
                            className="mb-2 block text-sm font-medium text-flore-text-primary"
                        >
                            العنوان بالتفصيل
                        </label>
                        <textarea
                            id="address"
                            required
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            rows={3}
                            placeholder="الشارع، رقم البناء، المعالم القريبة"
                            className="w-full resize-none rounded-2xl border border-flore-border bg-flore-card px-4 py-3 text-sm text-flore-text-primary transition-all duration-200 ease-flore placeholder:text-flore-text-secondary/50 hover:border-flore-sage focus:border-flore-primary/50 focus:outline-none focus:ring-4 focus:ring-flore-primary/10"
                        />
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="w-full"
                    >
                        <MapPin className="h-4 w-4" />
                        {loading ? 'جاري الحفظ...' : 'تأكيد العنوان'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
