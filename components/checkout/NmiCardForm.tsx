'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

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

    // نفس لغة حقول الإدخال في النظام — إطار رفيع وزوايا ناعمة
    const fieldClass =
        'h-12 rounded-2xl border border-flore-border bg-flore-card p-3 transition-colors duration-200 ease-flore hover:border-flore-sage'

    return (
        <div className="space-y-3">
            {error && (
                <p className="flex items-center gap-2 rounded-2xl border border-flore-error/20 bg-flore-error/5 px-4 py-3 text-sm text-flore-error">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </p>
            )}
            <div id="nmi-ccnumber" className={fieldClass} />
            <div className="flex gap-3">
                <div id="nmi-ccexp" className={`flex-1 ${fieldClass}`} />
                <div id="nmi-cvv" className={`w-24 ${fieldClass}`} />
            </div>
            {!scriptLoaded && (
                <p className="flex items-center gap-2 text-xs text-flore-text-secondary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    جاري تحميل نموذج الدفع الآمن...
                </p>
            )}
            {disabled && <p className="text-xs text-flore-text-secondary">أكمل بياناتك أعلاه أولاً</p>}
        </div>
    )
}
