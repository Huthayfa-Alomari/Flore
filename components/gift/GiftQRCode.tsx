'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Download, Copy, Check, QrCode } from 'lucide-react'

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
        <div className="rounded-3xl border border-flore-border/70 bg-flore-card p-6 text-center shadow-luxury-soft">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-flore-subtle">
                <QrCode className="h-6 w-6 text-flore-primary" />
            </div>
            <p className="font-amiri text-lg font-bold text-flore-text-primary mb-1">رمز رسالة الإهداء</p>
            <p className="mb-5 text-xs leading-relaxed text-flore-text-secondary">
                اطبع هذا الرمز على بطاقة الهدية — المُستقبل يمسحه ليستمع لرسالتك
            </p>

            <div className="mb-5 inline-block rounded-2xl border border-flore-border/60 bg-white p-5 shadow-luxury-soft">
                <QRCodeSVG id="gift-qr-svg" value={giftUrl} size={200} level="M" includeMargin />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleDownload}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-flore-primary py-2.5 text-sm font-medium text-white transition-all duration-200 ease-flore hover:bg-flore-primary-dark hover:shadow-luxury-soft active:scale-[0.97]"
                >
                    <Download className="h-4 w-4" /> تحميل الصورة
                </button>
                <button
                    onClick={handleCopy}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-flore-border bg-flore-card py-2.5 text-sm font-medium text-flore-text-primary transition-all duration-200 ease-flore hover:border-flore-primary/40 hover:bg-flore-subtle/50 active:scale-[0.97]"
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-flore-success" />
                    ) : (
                        <Copy className="h-4 w-4" />
                    )}
                    <span className={copied ? 'text-flore-success' : ''}>
                        {copied ? 'تم النسخ' : 'نسخ الرابط'}
                    </span>
                </button>
            </div>
        </div>
    )
}
