'use client'

import { useState, useEffect, useRef } from 'react'

declare global {
    interface Window {
        CollectJS: {
            configure: (config: Record<string, unknown>) => void
        }
    }
}

export function NmiCardForm({
    onToken,
    disabled,
}: {
    onToken: (token: string) => void
    disabled?: boolean
}) {
    const [scriptLoaded, setScriptLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const configuredRef = useRef(false)

    useEffect(() => {
        if (document.getElementById('nmi-collectjs')) {
            setScriptLoaded(true)
            return
        }
        const script = document.createElement('script')
        script.id = 'nmi-collectjs'
        script.src = 'https://secure.nmi.com/token/Collect.js'
        script.setAttribute('data-tokenization-key', process.env.NEXT_PUBLIC_NMI_CLIENT_KEY || '')
        script.onload = () => setScriptLoaded(true)
        script.onerror = () => setError('تعذر تحميل بوابة الدفع، حاول لاحقاً')
        document.body.appendChild(script)
    }, [])

    useEffect(() => {
        if (!scriptLoaded || configuredRef.current || typeof window.CollectJS === 'undefined') return
        configuredRef.current = true

        window.CollectJS.configure({
            variant: 'inline',
            styleSniffer: true,
            fields: {
                ccnumber: { selector: '#nmi-ccnumber', placeholder: 'رقم البطاقة' },
                ccexp: { selector: '#nmi-ccexp', placeholder: 'MM/YY' },
                cvv: { selector: '#nmi-cvv', placeholder: 'CVV' },
            },
            callback: (response: { token?: string; error?: string }) => {
                if (response.token) {
                    onToken(response.token)
                } else {
                    setError(response.error || 'فشل التحقق من بيانات البطاقة')
                }
            },
        })
    }, [scriptLoaded, onToken])

    return (
        <div className="space-y-3">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div id="nmi-ccnumber" className="rounded-xl border-2 border-flore-border bg-flore-bg p-3 h-12" />
            <div className="flex gap-3">
                <div id="nmi-ccexp" className="flex-1 rounded-xl border-2 border-flore-border bg-flore-bg p-3 h-12" />
                <div id="nmi-cvv" className="w-24 rounded-xl border-2 border-flore-border bg-flore-bg p-3 h-12" />
            </div>
            {!scriptLoaded && <p className="text-xs text-flore-text-secondary">جاري تحميل نموذج الدفع الآمن...</p>}
            {disabled && <p className="text-xs text-flore-text-secondary">أكمل بياناتك أعلاه أولاً</p>}
        </div>
    )
}