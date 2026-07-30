'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Download, Copy, Check } from 'lucide-react'

export function GiftQRCode({ giftUrl }: { giftUrl: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(giftUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        const svg = document.getElementById('gift-qr-svg')
        if (!svg) return

        const svgData = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()

        img.onload = () => {
            canvas.width = 400
            canvas.height = 400
            ctx?.drawImage(img, 0, 0, 400, 400)
            const pngUrl = canvas.toDataURL('image/png')
            const a = document.createElement('a')
            a.href = pngUrl
            a.download = 'floré-gift-qr.png'
            a.click()
        }
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    }

    return (
        <div className="bg-flore-card rounded-2xl border border-flore-border p-6 text-center">
            <p className="font-bold text-flore-text-primary mb-1">رمز رسالة الإهداء 🌸</p>
            <p className="text-xs text-flore-text-secondary mb-4">
                اطبع هذا الرمز على بطاقة الهدية — المُستقبل يمسحه ليستمع لرسالتك
            </p>

            <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeSVG id="gift-qr-svg" value={giftUrl} size={200} level="M" includeMargin />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-flore-primary text-white py-2.5 rounded-xl font-bold text-sm"
                >
                    <Download className="h-4 w-4" /> تحميل الصورة
                </button>
                <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-flore-bg border border-flore-border text-flore-text-primary py-2.5 rounded-xl font-bold text-sm"
                >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'تم النسخ' : 'نسخ الرابط'}
                </button>
            </div>
        </div>
    )
}