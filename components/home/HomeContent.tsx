"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Flower2, Sparkles, Eye, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ProductCard } from "@/components/catalog/ProductCard"
import { OccasionSelector } from "./OccasionSelector"
import type { Product } from "@/types"

const categories = [
    {
        id: "bouquets",
        label: "باقات",
        icon: Flower2,
        image: "https://i.pinimg.com/736x/be/3e/86/be3e86ae7397e687d7a3a3e102263e17.jpg",
    },
    {
        id: "preserved",
        label: "محفوظة",
        icon: Sparkles,
        image: "https://i.pinimg.com/1200x/9f/70/1e/9f701e0af1c23c0ec9199e73fdaf7b59.jpg",
    },
    {
        id: "vases",
        label: "مزهريات",
        icon: Eye,
        image: "https://i.pinimg.com/736x/a0/1f/e0/a01fe02e25dc4ba07fdee159e14c4e16.jpg",
    },
    {
        id: "chocolates",
        label: "هدايا",
        icon: Flower2,
        image: "https://i.pinimg.com/1200x/3a/f7/37/3af737be180f61c74995b45542ddcb26.jpg",
    },
    {
        id: "accessories",
        label: "إكسسوارات",
        icon: Sparkles,
        image: "https://i.pinimg.com/1200x/aa/54/9c/aa549ce762e8b2acf64302de1ec1cf7f.jpg",
    },
    {
        id: "plants",
        label: "نباتات",
        icon: Flower2,
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
        text: "خدمة VIP حقيقية. الباقة وصلت مع عطر رائع ورسالة handwritten. سأطلب دائماً من هنا.",
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

interface HomeContentProps {
    featuredProducts: Product[]
}

export default function HomeContent({
    featuredProducts,
}: HomeContentProps) {
    return (
        <div className="space-y-24">
            {/* Hero Section */}
            <section
                dir="rtl"
                className="relative flex min-h-[90vh] items-center justify-center overflow-hidden"
            >
                {/* Background */}
                <div className="absolute inset-0 bg-flore-bg" />

                <div className="absolute inset-0 opacity-30">
                    <div className="absolute left-20 top-20 h-72 w-72 rounded-full bg-flore-subtle blur-3xl" />
                    <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-flore-gold/20 blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.8,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        <span className="mb-6 inline-block font-playfair text-sm uppercase tracking-[0.3em] text-flore-text-secondary">
                            Floré — Give Beautifully
                        </span>

                        <h1 className="mb-6 font-amiri text-5xl font-bold leading-tight text-flore-text-primary md:text-7xl">
                            فلوري
                        </h1>

                        <p className="mx-auto mb-10 max-w-2xl font-noto text-lg leading-relaxed text-flore-text-secondary md:text-xl">
                            ما بتشتري باقة، بتصمّم هدية تحمل معنى.
                            توصيل سريع في عمّان والزرقاء.
                        </p>

                        <div className="flex flex-col justify-center gap-4 sm:flex-row">
                            {/* Primary CTA */}
                            <Link href="/atelier">
                                <Button
                                    size="lg"
                                    className="w-full gap-2 sm:w-auto"
                                >
                                    صمّم هديتك
                                    <Sparkles className="h-4 w-4" />
                                </Button>
                            </Link>

                            {/* Secondary CTA */}
                            <Link href="/catalog">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full gap-2 sm:w-auto"
                                >
                                    استكشف فلوري
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Decorative flower */}
                    <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        className="mt-16"
                        aria-hidden="true"
                    >
                        <Flower2 className="mx-auto h-16 w-16 text-flore-primary/30" />
                    </motion.div>
                </div>
            </section>

            {/* Occasion Discovery */}
            <OccasionSelector />

            {/* Marquee */}
            <section className="overflow-hidden bg-flore-subtle py-6">
                <div className="flex animate-marquee whitespace-nowrap">
                    {[1, 2, 3, 4].map((item) => (
                        <span
                            key={item}
                            className="mx-8 font-playfair text-lg tracking-widest text-flore-primary/60"
                        >
                            LUXURY · فاخر · PREMIUM · أصيل · EXCLUSIVE · فريد · ELEGANT · أنيق ·
                        </span>
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Featured Products */}
            <section
                dir="rtl"
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
            >
                <div className="mb-12 text-center">
                    <h2 className="mb-4 font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                        منتجات مميزة
                    </h2>

                    <p className="text-flore-text-secondary">
                        اخترناها لك بعناية
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {featuredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                        />
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Categories */}
            <section
                dir="rtl"
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
            >
                <h2 className="mb-12 text-center font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                    تصفح حسب الفئة
                </h2>

                <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
                    {categories.map((category) => {
                        const Icon = category.icon

                        return (
                            <Link
                                key={category.id}
                                href={`/catalog?category=${category.id}`}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    transition={{
                                        duration: 0.35,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    className="group relative aspect-square overflow-hidden rounded-3xl"
                                >
                                    <Image
                                        src={category.image}
                                        alt={category.label}
                                        fill
                                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                        <Icon className="mb-2 h-6 w-6" />

                                        <h3 className="font-amiri text-xl font-bold">
                                            {category.label}
                                        </h3>
                                    </div>
                                </motion.div>
                            </Link>
                        )
                    })}
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* AR Teaser */}
            <section
                dir="rtl"
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
            >
                <div className="rounded-3xl bg-flore-card p-8 shadow-luxury md:p-12">
                    <div className="grid items-center gap-12 md:grid-cols-2">
                        <div>
                            <span className="mb-4 inline-block rounded-full bg-flore-subtle px-4 py-1 text-sm font-medium text-flore-primary">
                                تجربة تفاعلية
                            </span>

                            <h2 className="mb-4 font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                                جرّب قبل أن تطلب
                            </h2>

                            <p className="mb-6 leading-relaxed text-flore-text-secondary">
                                استخدم تقنية الواقع المعزز لرؤية البوكيه في منزلك
                                قبل الشراء. حرك هاتفك واستكشف كل التفاصيل.
                            </p>

                            <Link href="/ar">
                                <Button className="gap-2">
                                    <Eye className="h-4 w-4" />
                                    جرب الآن
                                </Button>
                            </Link>
                        </div>

                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-flore-bg">
                            <Image
                                src="https://i.pinimg.com/control1/1200x/23/c4/aa/23c4aa9c0ae3b702a1366178e41228b3.jpg"
                                alt="AR Preview"
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                            />

                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur-sm">
                                    <Eye className="h-8 w-8 text-flore-primary" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Atelier Teaser */}
            <section
                dir="rtl"
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
            >
                <div className="rounded-3xl bg-gradient-to-br from-flore-primary to-flore-primary-dark p-8 text-white md:p-12">
                    <div className="grid items-center gap-12 md:grid-cols-2">
                        <div className="order-2 md:order-1">
                            <div className="relative aspect-video overflow-hidden rounded-2xl bg-white/10">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="h-16 w-16 animate-pulse text-flore-gold" />
                                </div>
                            </div>
                        </div>

                        <div className="order-1 md:order-2">
                            <span className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1 text-sm font-medium text-white">
                                الأتيليه
                            </span>

                            <h2 className="mb-4 font-amiri text-3xl font-bold md:text-4xl">
                                صمّم باقتك الخاصة
                            </h2>

                            <p className="mb-6 leading-relaxed text-white/80">
                                اختر الزهور، الألوان، التغليف والمزهرية.
                                صمم بوكيه فريد يعبر عن مشاعرك.
                            </p>

                            <Link href="/atelier">
                                <Button
                                    variant="secondary"
                                    className="gap-2"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    ابدأ التصميم
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Testimonials */}
            <section
                dir="rtl"
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
            >
                <h2 className="mb-12 text-center font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                    آراء عملائنا
                </h2>

                <div className="grid gap-8 md:grid-cols-3">
                    {testimonials.map((testimonial, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="rounded-3xl bg-flore-card p-8 shadow-luxury"
                        >
                            <div className="mb-4 flex gap-1">
                                {[...Array(testimonial.rating)].map(
                                    (_, j) => (
                                        <svg
                                            key={j}
                                            className="h-5 w-5 fill-current text-flore-gold-dark"
                                            viewBox="0 0 20 20"
                                            aria-hidden="true"
                                        >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    )
                                )}
                            </div>

                            <p className="mb-6 leading-relaxed text-flore-text-secondary">
                                {testimonial.text}
                            </p>

                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-flore-subtle">
                                    <span className="font-amiri font-bold text-flore-primary">
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

            {/* Divider */}
            <div className="flex justify-center">
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Gallery */}
            <section
                dir="rtl"
                className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8"
            >
                <h2 className="mb-12 text-center font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                    معرض أعمالنا
                </h2>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {galleryImages.map((src, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={`group relative overflow-hidden rounded-2xl ${i === 0 || i === 3
                                ? "aspect-[3/4]"
                                : "aspect-square"
                                }`}
                        >
                            <Image
                                src={src}
                                alt={`Gallery ${i + 1}`}
                                fill
                                sizes="(max-width: 768px) 50vw, 33vw"
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />

                            <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/20" />
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    )
}