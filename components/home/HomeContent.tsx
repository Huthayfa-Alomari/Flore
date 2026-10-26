"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Flower2, Sparkles, Eye, ArrowLeft, Quote } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ProductCard } from "@/components/catalog/ProductCard"
import { OccasionSelector } from "./OccasionSelector"
import type { Product } from "@/types"

const categories = [
    {
        id: "bouquets",
        label: "باقات",
        image: "https://i.pinimg.com/736x/be/3e/86/be3e86ae7397e687d7a3a3e102263e17.jpg",
    },
    {
        id: "preserved",
        label: "محفوظة",
        image: "https://i.pinimg.com/1200x/9f/70/1e/9f701e0af1c23c0ec9199e73fdaf7b59.jpg",
    },
    {
        id: "vases",
        label: "مزهريات",
        image: "https://i.pinimg.com/736x/a0/1f/e0/a01fe02e25dc4ba07fdee159e14c4e16.jpg",
    },
    {
        id: "chocolates",
        label: "هدايا",
        image: "https://i.pinimg.com/1200x/3a/f7/37/3af737be180f61c74995b45542ddcb26.jpg",
    },
    {
        id: "accessories",
        label: "إكسسوارات",
        image: "https://i.pinimg.com/1200x/aa/54/9c/aa549ce762e8b2acf64302de1ec1cf7f.jpg",
    },
    {
        id: "plants",
        label: "نباتات",
        image: "https://i.pinimg.com/control1/736x/7c/4f/01/7c4f016dd19aa239f327a33ab3f4a828.jpg",
    },
]

const testimonials = [
    {
        name: "سارة العبدالله",
        text: "أجمل بوكيه وصلني على الإطلاق! التغليف فاخر والزهور طازجة جداً. التوصيل كان سريعاً جداً في عمّان.",
        rating: 5,
    },
    {
        name: "أحمد الخالدي",
        text: "صممت بوكيه مخصص لخطوبتي وكان رائعاً! فريق فلوري محترف جداً ويستحق كل ثناء.",
        rating: 5,
    },
    {
        name: "نور الحسين",
        text: "خدمة VIP حقيقية. الباقة وصلت مع عطر رائع ورسالة مكتوبة بخط اليد. سأطلب دائماً من هنا.",
        rating: 5,
    },
]

const galleryImages = [
    "https://i.pinimg.com/control1/1200x/49/79/2a/49792a35f698e62abd2546f0ba68736d.jpg",
    "https://i.pinimg.com/1200x/de/89/38/de8938e4818671c45928aa4d248e1198.jpg",
    "https://i.pinimg.com/736x/50/5b/99/505b99251b8d8251e64f36653bd92f42.jpg",
    "https://i.pinimg.com/736x/6b/7c/96/6b7c96aac5cc08b279c6477785ffa9a6.jpg",
    "https://i.pinimg.com/control1/1200x/0c/69/9b/0c699b0a8e613373d7e83deb1d05c281.jpg",
    "https://i.pinimg.com/1200x/fb/93/39/fb93399121d11c6b444494f33e5f34d2.jpg",
]

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
}

function GoldDivider() {
    return (
        <div className="flex justify-center" aria-hidden="true">
            <div className="flex items-center gap-3">
                <span className="h-px w-16 bg-gradient-to-l from-transparent to-flore-gold-dark/60" />
                <span className="h-1 w-1 rotate-45 bg-flore-gold-dark" />
                <span className="h-px w-16 bg-gradient-to-r from-transparent to-flore-gold-dark/60" />
            </div>
        </div>
    )
}

interface HomeContentProps {
    featuredProducts: Product[]
}

export default function HomeContent({
    featuredProducts,
}: HomeContentProps) {
    return (
        <div className="space-y-20 md:space-y-28">

            {/* ═══ Hero ═══ */}
            <section
                dir="rtl"
                className="relative flex min-h-[88vh] items-center justify-center overflow-hidden"
            >
                {/* خلفية عاجية هادئة مع هالات ناعمة */}
                <div className="absolute inset-0 bg-flore-bg" />

                <div className="absolute inset-0 opacity-40" aria-hidden="true">
                    <div className="absolute left-[8%] top-[12%] h-80 w-80 rounded-full bg-flore-subtle blur-3xl" />
                    <div className="absolute bottom-[8%] right-[6%] h-[28rem] w-[28rem] rounded-full bg-flore-gold/15 blur-3xl" />
                    <div className="absolute right-[20%] top-[30%] h-56 w-56 rounded-full bg-flore-blush/60 blur-3xl" />
                </div>

                <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                        {/* Eyebrow — توقيع كورمورانت */}
                        <p className="flore-eyebrow mb-7">
                            <span className="font-display italic normal-case tracking-[0.12em] text-flore-gold-dark text-sm">
                                Give Beautifully
                            </span>
                        </p>

                        <h1 className="mb-6 font-amiri text-6xl font-bold leading-[1.1] text-flore-text-primary md:text-8xl">
                            فلوري
                        </h1>

                        <div className="mx-auto mb-8 flex items-center justify-center gap-3" aria-hidden="true">
                            <span className="h-px w-14 bg-flore-gold-dark/50" />
                            <Flower2 className="h-4 w-4 text-flore-gold-dark" />
                            <span className="h-px w-14 bg-flore-gold-dark/50" />
                        </div>

                        <p className="mx-auto mb-12 max-w-xl font-noto text-lg leading-loose text-flore-text-secondary md:text-xl">
                            ما بتشتري باقة، بتصمّم هدية تحمل معنى.
                            <br className="hidden sm:block" />
                            توصيل سريع في عمّان والزرقاء.
                        </p>

                        <div className="flex flex-col justify-center gap-3 sm:flex-row">
                            <Link href="/atelier" className="sm:w-auto w-full">
                                <Button
                                    size="lg"
                                    className="w-full gap-2"
                                >
                                    صمّم هديتك
                                    <Sparkles className="h-4 w-4" />
                                </Button>
                            </Link>

                            <Link href="/catalog" className="sm:w-auto w-full">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full gap-2"
                                >
                                    استكشف فلوري
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>

                {/* مؤشر تمرير رقيق */}
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
                    aria-hidden="true"
                >
                    <div className="h-10 w-px bg-gradient-to-b from-transparent via-flore-gold-dark to-transparent" />
                </motion.div>
            </section>

            {/* ═══ المناسبات ═══ */}
            <OccasionSelector />

            {/* ═══ شريط الكلمات ═══ */}
            <section className="overflow-hidden border-y border-flore-border/60 bg-flore-bg-alt py-5" aria-hidden="true">
                <div className="flex animate-marquee whitespace-nowrap">
                    {[1, 2, 3, 4].map((item) => (
                        <span
                            key={item}
                            className="mx-8 font-display text-base tracking-[0.25em] text-flore-text-secondary/50"
                        >
                            LUXURY · فاخر · PREMIUM · أصيل · EXCLUSIVE · فريد · ELEGANT · أنيق ·
                        </span>
                    ))}
                </div>
            </section>

            {/* ═══ منتجات مميزة ═══ */}
            <section dir="rtl" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-12 text-center">
                    <p className="flore-eyebrow mb-4">CURATED</p>
                    <h2 className="mb-3 font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                        منتجات مميزة
                    </h2>
                    <p className="text-flore-text-secondary">
                        اخترناها لك بعناية
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {featuredProducts.map((product, i) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
                        >
                            <ProductCard product={product} />
                        </motion.div>
                    ))}
                </div>
            </section>

            <GoldDivider />

            {/* ═══ الفئات ═══ */}
            <section dir="rtl" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-12 text-center">
                    <p className="flore-eyebrow mb-4">COLLECTIONS</p>
                    <h2 className="font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                        تصفح حسب الفئة
                    </h2>
                </motion.div>

                <div className="grid grid-cols-2 gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-6">
                    {categories.map((category, i) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.4, delay: (i % 6) * 0.06 }}
                        >
                            <Link
                                href={`/catalog?category=${category.id}`}
                                className="group relative block aspect-square overflow-hidden rounded-3xl cursor-pointer"
                            >
                                <Image
                                    src={category.image}
                                    alt={category.label}
                                    fill
                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                                    className="object-cover transition-transform duration-700 ease-flore group-hover:scale-108"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

                                <div className="absolute bottom-0 right-0 left-0 p-4 text-white">
                                    <h3 className="font-amiri text-lg font-bold leading-snug">
                                        {category.label}
                                    </h3>
                                </div>

                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 rounded-3xl border border-white/0 transition-colors duration-300 group-hover:border-white/30"
                                />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            <GoldDivider />

            {/* ═══ تجربة AR ═══ */}
            <section dir="rtl" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
                    <div className="flore-lift rounded-3xl border border-flore-border/70 bg-flore-card p-8 shadow-luxury-soft md:p-12">
                        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
                            <div>
                                <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-flore-subtle px-4 py-1.5 text-xs font-medium text-flore-primary">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    تجربة تفاعلية
                                </span>

                                <h2 className="mb-4 font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                                    جرّب قبل أن تطلب
                                </h2>

                                <p className="mb-8 leading-loose text-flore-text-secondary">
                                    استخدم تقنية الواقع المعزز لرؤية البوكيه في منزلك
                                    قبل الشراء. حرك هاتفك واستكشف كل التفاصيل.
                                </p>

                                <Link href="/ar">
                                    <Button variant="primary" className="gap-2">
                                        <Eye className="h-4 w-4" />
                                        جرب الآن
                                    </Button>
                                </Link>
                            </div>

                            <div className="relative aspect-square overflow-hidden rounded-2xl bg-flore-bg-alt">
                                <Image
                                    src="https://i.pinimg.com/control1/1200x/23/c4/aa/23c4aa9c0ae3b702a1366178e41228b3.jpg"
                                    alt="معاينة الواقع المعزز"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-cover"
                                />

                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-flore-card/90 shadow-luxury backdrop-blur-sm border border-flore-border/50">
                                        <Eye className="h-8 w-8 text-flore-primary" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            <GoldDivider />

            {/* ═══ الأتيليه ═══ */}
            <section dir="rtl" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
                    <div className="flore-lift relative overflow-hidden rounded-3xl bg-gradient-to-bl from-flore-primary to-flore-primary-dark p-8 text-white shadow-luxury md:p-12">
                        {/* زخرفة ذهبية خفيفة */}
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-flore-gold/15 blur-3xl"
                        />
                        <div className="relative grid items-center gap-10 md:grid-cols-2 md:gap-12">
                            <div className="order-2 md:order-1">
                                <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/15 bg-white/5">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Sparkles className="h-14 w-14 text-flore-gold" strokeWidth={1.25} />
                                    </div>
                                </div>
                            </div>

                            <div className="order-1 md:order-2">
                                <p className="flore-eyebrow mb-5 !text-flore-gold">ATELIER</p>

                                <h2 className="mb-4 font-amiri text-3xl font-bold md:text-4xl">
                                    صمّم باقتك الخاصة
                                </h2>

                                <p className="mb-8 leading-loose text-white/75">
                                    اختر الزهور، الألوان، التغليف والمزهرية.
                                    صمم بوكيه فريد يعبر عن مشاعرك.
                                </p>

                                <Link href="/atelier">
                                    <Button
                                        variant="gold"
                                        className="gap-2"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        ابدأ التصميم
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            <GoldDivider />

            {/* ═══ آراء العملاء ═══ */}
            <section dir="rtl" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-12 text-center">
                    <p className="flore-eyebrow mb-4">TESTIMONIALS</p>
                    <h2 className="font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                        آراء عملائنا
                    </h2>
                </motion.div>

                <div className="grid gap-6 md:gap-8 md:grid-cols-3">
                    {testimonials.map((testimonial, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.45, delay: i * 0.08 }}
                            className="relative rounded-3xl border border-flore-border/70 bg-flore-card p-7 shadow-luxury-soft"
                        >
                            <Quote
                                className="absolute left-6 top-6 h-7 w-7 text-flore-gold/30"
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />

                            <div className="mb-4 flex gap-1" aria-label={`${testimonial.rating} من 5`}>
                                {[...Array(testimonial.rating)].map((_, j) => (
                                    <svg
                                        key={j}
                                        className="h-4 w-4 fill-current text-flore-gold-dark"
                                        viewBox="0 0 20 20"
                                        aria-hidden="true"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>

                            <p className="mb-6 leading-loose text-flore-text-secondary text-[15px]">
                                {testimonial.text}
                            </p>

                            <div className="flex items-center gap-3 border-t border-flore-border/60 pt-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-flore-subtle">
                                    <span className="font-amiri text-lg font-bold text-flore-primary">
                                        {testimonial.name[0]}
                                    </span>
                                </div>

                                <span className="font-noto font-medium text-flore-text-primary">
                                    {testimonial.name}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            <GoldDivider />

            {/* ═══ معرض الأعمال ═══ */}
            <section dir="rtl" className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
                <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-12 text-center">
                    <p className="flore-eyebrow mb-4">GALLERY</p>
                    <h2 className="font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                        معرض أعمالنا
                    </h2>
                </motion.div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {galleryImages.map((src, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                            className={`group relative overflow-hidden rounded-2xl ${i === 0 || i === 3
                                ? "aspect-[3/4]"
                                : "aspect-square"
                                }`}
                        >
                            <Image
                                src={src}
                                alt={`من أعمال فلوري ${i + 1}`}
                                fill
                                sizes="(max-width: 768px) 50vw, 33vw"
                                className="object-cover transition-transform duration-700 ease-flore group-hover:scale-105"
                            />

                            <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    )
}
