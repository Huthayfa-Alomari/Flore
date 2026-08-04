'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, Flower2, Check } from 'lucide-react'

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
            <div className="min-h-screen flex items-center justify-center bg-flore-bg px-4" dir="rtl">
                <div className="max-w-md w-full bg-flore-card rounded-3xl border border-flore-border shadow-luxury p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">تم استلام عنوانك 🌸</h1>
                    <p className="text-flore-text-secondary">شكراً! سيتم البدء بتجهيز هديتك وتوصيلها قريباً.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-flore-bg px-4 py-12" dir="rtl">
            <div className="max-w-md w-full bg-flore-card rounded-3xl border border-flore-border shadow-luxury p-8">
                <div className="text-center mb-6">
                    <Flower2 className="h-10 w-10 text-flore-primary mx-auto mb-3" />
                    <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">لديك هدية بانتظارك! 🎁</h1>
                    <p className="text-flore-text-secondary text-sm">أدخل عنوانك لنتمكن من توصيل هديتك من Floré</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-flore-text-secondary mb-1">المنطقة</label>
                        <select
                            value={region}
                            onChange={e => setRegion(e.target.value)}
                            className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none"
                        >
                            <option value="amman">عمّان</option>
                            <option value="zarqa">الزرقاء</option>
                            <option value="irbid">إربد</option>
                            <option value="other">أخرى</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-flore-text-secondary mb-1">العنوان بالتفصيل</label>
                        <textarea
                            required
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            rows={3}
                            placeholder="الشارع، رقم البناء، المعالم القريبة"
                            className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none resize-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-flore-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        <MapPin className="h-5 w-5" />
                        {loading ? 'جاري الحفظ...' : 'تأكيد العنوان'}
                    </button>
                </form>
            </div>
        </div>
    )
}