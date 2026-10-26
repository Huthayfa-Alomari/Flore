'use client'

import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  children: React.ReactNode
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  isLoading = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 rounded-full font-medium
    transition-all duration-200 ease-flore
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flore-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-flore-bg
    active:scale-[0.97]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
    cursor-pointer select-none
  `

  const variants = {
    // السيج العميق — الزر الأساسي
    primary: `
      bg-flore-primary text-white
      hover:bg-flore-primary-dark hover:shadow-luxury-soft
    `,
    // شامبين — للـ CTA الثانوية الفاخرة
    gold: `
      bg-flore-gold text-[#2B2B27]
      hover:bg-flore-gold-dark hover:shadow-luxury-soft
    `,
    // إطار رفيع — محايد وأنيق
    outline: `
      border border-flore-border bg-transparent text-flore-text-primary
      hover:border-flore-primary/50 hover:bg-flore-subtle/50
    `,
    // تعبئة ناعمة — بديل هادئ
    secondary: `
      bg-flore-subtle text-flore-text-primary
      hover:bg-flore-subtle/70
    `,
    // شفاف — للأدوات الخفيفة
    ghost: `
      text-flore-text-secondary
      hover:bg-flore-subtle/60 hover:text-flore-text-primary
    `,
  }

  const sizes = {
    sm: 'px-4 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
    icon: 'h-9 w-9',
  }

  return (
    <button
      type={type}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  )
}
