'use client'

import styles from './FlowerAddButton.module.css'

type Variant = 'primary' | 'gold' | 'botanical'

const VARIANT_COLORS: Record<Variant, React.CSSProperties> = {
    // صفحة المنتج — الأخضر الفاخر الأساسي
    primary: {
        '--petal-from': 'var(--flore-primary)',
        '--petal-to': 'var(--flore-primary-dark)',
        '--petal-border': 'var(--flore-primary-dark)',
        '--petal-from-hover': 'var(--flore-primary-dark)',
        '--petal-to-hover': 'var(--flore-primary)',
        '--petal-border-hover': 'var(--flore-primary-dark)',
    } as React.CSSProperties,
    // الأتيليه — ذهبي دافئ (يتماشى مع طابع "التصميم الفاخر")
    gold: {
        '--petal-from': 'var(--flore-gold-dark)',
        '--petal-to': 'var(--flore-gold)',
        '--petal-border': 'var(--flore-gold-dark)',
        '--petal-from-hover': 'var(--flore-primary)',
        '--petal-to-hover': 'var(--flore-gold)',
        '--petal-border-hover': 'var(--flore-primary-dark)',
    } as React.CSSProperties,
    // السلة — لمسة نباتية مميزة
    botanical: {
        '--petal-from': '#67B26F',
        '--petal-to': 'var(--flore-primary)',
        '--petal-border': 'var(--flore-primary-dark)',
        '--petal-from-hover': 'var(--flore-primary-dark)',
        '--petal-to-hover': '#67B26F',
        '--petal-border-hover': 'var(--flore-primary-dark)',
    } as React.CSSProperties,
}

export function FlowerAddButton({
    children,
    onClick,
    disabled,
    variant = 'primary',
    type = 'button',
}: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: Variant
    type?: 'button' | 'submit'
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={styles.btn}
            style={VARIANT_COLORS[variant]}
        >
            <div className={styles.wrapper}>
                <p className={styles.text}>{children}</p>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className={`${styles.flower} ${styles[`flower${n}`]}`}>
                        <div className={`${styles.petal} ${styles.one}`} />
                        <div className={`${styles.petal} ${styles.two}`} />
                        <div className={`${styles.petal} ${styles.three}`} />
                        <div className={`${styles.petal} ${styles.four}`} />
                    </div>
                ))}
            </div>
        </button>
    )
}