'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ChevronDown, Check } from 'lucide-react'

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
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-flore-border/70 bg-flore-card/60 px-3.5 py-1.5 text-xs text-flore-text-secondary transition-all duration-200 ease-flore hover:border-flore-primary/40 hover:text-flore-primary active:scale-[0.97] md:text-sm"
            >
                <MapPin className="h-3.5 w-3.5 text-flore-primary" />
                <span className="hidden sm:inline">التوصيل إلى</span>
                <span className="font-medium text-flore-text-primary">{currentLabel}</span>
                <ChevronDown
                    className={`h-3 w-3 text-flore-text-secondary/70 transition-transform duration-200 ease-flore ${open ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
                        role="listbox"
                        className="absolute right-0 top-full z-50 mt-2.5 min-w-[190px] rounded-2xl border border-flore-border/70 bg-flore-card p-1.5 shadow-luxury"
                    >
                        <p
                            className="px-3 pb-1.5 pt-1 font-display text-[10px] uppercase tracking-[0.25em] text-flore-text-secondary/70"
                            dir="ltr"
                        >
                            Delivery City
                        </p>
                        {CITIES.map((c) => (
                            <button
                                key={c.value}
                                role="option"
                                aria-selected={city === c.value}
                                onClick={() => handleSelect(c.value)}
                                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 ease-flore ${city === c.value
                                        ? 'bg-flore-subtle font-medium text-flore-primary'
                                        : 'text-flore-text-secondary hover:bg-flore-subtle/60 hover:text-flore-text-primary'
                                    }`}
                            >
                                {c.label}
                                {city === c.value && (
                                    <Check className="h-3.5 w-3.5 text-flore-gold-dark" />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
