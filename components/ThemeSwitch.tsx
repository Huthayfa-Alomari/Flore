'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

/**
 * مبدّل الوضع الفاتح/الليلي — تصميم أنيق مبسّط يناسب هوية Light Luxury.
 * دائرة واحدة بحافة رفيعة، تتبدل أيقونتها بنعومة 250ms.
 */
export function ThemeSwitch() {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    if (!mounted) {
        // هيكل ثابت بنفس الأبعاد لمنع الوميض وقت التحميل
        return (
            <button
                type="button"
                aria-label="تبديل الوضع الداكن"
                className="h-9 w-9 rounded-full border border-flore-border bg-flore-card"
            />
        )
    }

    const isDark = resolvedTheme === 'dark'

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
            className="
                relative h-9 w-9 rounded-full
                flex items-center justify-center
                border border-flore-border bg-flore-card
                text-flore-text-secondary
                transition-all duration-200 ease-flore
                hover:border-flore-primary/40 hover:text-flore-primary
                active:scale-95
                cursor-pointer
            "
        >
            <Sun
                className={`
                    absolute h-[17px] w-[17px] transition-all duration-250 ease-flore
                    ${isDark ? 'opacity-0 rotate-45 scale-75' : 'opacity-100 rotate-0 scale-100'}
                `}
            />
            <Moon
                className={`
                    absolute h-[16px] w-[16px] transition-all duration-250 ease-flore
                    ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-45 scale-75'}
                `}
            />
        </button>
    )
}
