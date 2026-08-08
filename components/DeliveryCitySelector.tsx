'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'

const CITIES = [
    { value: 'amman', label: 'عمّان' },
    { value: 'zarqa', label: 'الزرقاء' },
    { value: 'irbid', label: 'إربد' },
    { value: 'other', label: 'أخرى' },
]

export function DeliveryCitySelector() {
    const [city, setCity] = useState('amman')
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('flore_delivery_city')
        if (saved) setCity(saved)
    }, [])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (value: string) => {
        setCity(value)
        localStorage.setItem('flore_delivery_city', value)
        setOpen(false)
    }

    if (!mounted) return null

    const currentLabel = CITIES.find((c) => c.value === city)?.label || 'عمّان'

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs md:text-sm text-flore-text-secondary hover:text-flore-primary transition-colors"
            >
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">التوصيل إلى</span>
                <span className="font-bold text-flore-text-primary">{currentLabel}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full mt-2 right-0 bg-flore-card border border-flore-border rounded-xl shadow-luxury py-2 min-w-[140px] z-50">
                    {CITIES.map((c) => (
                        <button
                            key={c.value}
                            onClick={() => handleSelect(c.value)}
                            className={`w-full text-right px-4 py-2 text-sm transition-colors ${city === c.value
                                    ? 'text-flore-primary font-bold bg-flore-primary/5'
                                    : 'text-flore-text-secondary hover:bg-flore-bg'
                                }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}