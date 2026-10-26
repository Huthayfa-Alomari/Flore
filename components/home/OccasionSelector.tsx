'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

const OCCASIONS = [
    {
        id: 'birthday',
        label: 'عيد ميلاد',
        subtitle: 'احتفل بلحظة تستحق أن تُذكر',
        image: '/images/occasions/birthday.webp',
    },
    {
        id: 'love',
        label: 'حب',
        subtitle: 'قلها دون كلمات',
        image: '/images/occasions/love.webp',
    },
    {
        id: 'congrats',
        label: 'تهنئة',
        subtitle: 'شاركهم فرحتهم',
        image: '/images/occasions/congrats.webp',
    },
    {
        id: 'thanks',
        label: 'شكراً',
        subtitle: 'امتنان يزهر',
        image: '/images/occasions/thanks.webp',
    },
    {
        id: 'sorry',
        label: 'اعتذار',
        subtitle: 'بعض الكلمات تُقال بالورد',
        image: '/images/occasions/sorry.webp',
    },
    {
        id: 'just-because',
        label: 'بلا مناسبة',
        subtitle: 'لأنك أردت فقط أن تُسعده',
        image: '/images/occasions/just-because.webp',
    },
]

export function OccasionSelector() {
    return (
        <section
            dir="rtl"
            aria-labelledby="occasion-heading"
            className="relative overflow-hidden bg-flore-bg-alt py-20 sm:py-24 lg:py-32"
        >
            {/* عناصر خلفية محيطة */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-32 top-20 h-72 w-72 rounded-full bg-flore-blush/20 blur-3xl"
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-32 bottom-10 h-80 w-80 rounded-full bg-flore-gold/10 blur-3xl"
            />

            <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{
                        duration: 0.7,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                    className="mx-auto mb-12 max-w-2xl text-center sm:mb-16"
                >
                    <p className="flore-eyebrow mb-4">FLORÉ ATELIER</p>

                    <h2
                        id="occasion-heading"
                        className="font-amiri text-3xl font-bold tracking-tight text-flore-text-primary sm:text-4xl lg:text-5xl"
                    >
                        لكل شعور، زهرة.
                    </h2>

                    <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-flore-text-secondary sm:text-base">
                        اختر اللحظة التي تريد أن تهديها، ودعنا نساعدك في صنع شيء
                        يستحق أن يُذكر.
                    </p>
                </motion.div>

                {/* Occasion grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                    {OCCASIONS.map((occasion, index) => (
                        <motion.div
                            key={occasion.id}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{
                                once: true,
                                margin: '-50px',
                            }}
                            transition={{
                                duration: 0.65,
                                delay: index * 0.07,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        >
                            <Link
                                href={`/catalog?occasion=${occasion.id}`}
                                aria-label={`استكشف هدايا ${occasion.label}`}
                                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-flore-subtle outline-none focus-visible:ring-2 focus-visible:ring-flore-gold-dark focus-visible:ring-offset-4 focus-visible:ring-offset-flore-bg-alt cursor-pointer"
                            >
                                {/* Image */}
                                <motion.div
                                    className="absolute inset-0"
                                    whileHover={{ scale: 1.045 }}
                                    transition={{
                                        duration: 0.8,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                >
                                    <Image
                                        src={occasion.image}
                                        alt={occasion.label}
                                        fill
                                        priority={index < 3}
                                        sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 33vw"
                                        className="object-cover"
                                    />
                                </motion.div>

                                {/* Cinematic overlay */}
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-95"
                                />

                                {/* Top brand label */}
                                <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
                                    <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/75">
                                        FLORÉ
                                    </span>
                                </div>

                                {/* Bottom content */}
                                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                                    <motion.div
                                        className="transition-transform duration-500 group-hover:-translate-y-1"
                                    >
                                        <h3 className="font-amiri text-xl font-bold sm:text-2xl lg:text-3xl">
                                            {occasion.label}
                                        </h3>

                                        <p className="mt-1.5 max-w-[220px] text-[11px] leading-5 text-white/75 sm:text-xs sm:leading-6">
                                            {occasion.subtitle}
                                        </p>

                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-medium tracking-[0.08em] text-white/90 opacity-80 transition-all duration-500 group-hover:gap-3 group-hover:opacity-100">
                                            <span>اكتشف الهدايا</span>

                                            <span
                                                aria-hidden="true"
                                                className="text-sm leading-none"
                                            >
                                                ←
                                            </span>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Elegant hover border */}
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 border border-white/0 transition-colors duration-500 group-hover:border-white/25"
                                />
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Atelier CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                        duration: 0.7,
                        delay: 0.2,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                    className="mt-12 text-center sm:mt-16"
                >
                    <p className="mb-4 text-xs text-flore-text-secondary">
                        لم تجد المناسبة المناسبة؟
                    </p>

                    <Link
                        href="/atelier"
                        className="group inline-flex items-center gap-3 border-b border-flore-text-primary/30 pb-2 text-sm font-medium text-flore-text-primary transition-colors duration-300 hover:border-flore-gold-dark hover:text-flore-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flore-gold-dark focus-visible:ring-offset-4 cursor-pointer"
                    >
                        <span>صمّم هديتك بنفسك</span>

                        <span
                            aria-hidden="true"
                            className="transition-transform duration-300 group-hover:-translate-x-1"
                        >
                            ←
                        </span>
                    </Link>
                </motion.div>
            </div>
        </section>
    )
}