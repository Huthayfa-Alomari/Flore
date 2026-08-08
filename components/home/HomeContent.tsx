"use client"

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Flower2, Sparkles, Eye, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProductCard } from '@/components/catalog/ProductCard'
import type { Product } from '@/types'

const categories = [
    { id: 'bouquets', label: 'باقات', icon: Flower2, image: 'https://i.pinimg.com/736x/be/3e/86/be3e86ae7397e687d7a3a3e102263e17.jpg' },
    { id: 'preserved', label: 'محفوظة', icon: Sparkles, image: 'https://i.pinimg.com/1200x/9f/70/1e/9f701e0af1c23c0ec9199e73fdaf7b59.jpg' },
    { id: 'vases', label: 'مزهريات', icon: Eye, image: 'https://i.pinimg.com/736x/a0/1f/e0/a01fe02e25dc4ba07fdee159e14c4e16.jpg' },
    { id: 'chocolates', label: 'هدايا', icon: Flower2, image: 'https://i.pinimg.com/1200x/3a/f7/37/3af737be180f61c74995b45542ddcb26.jpg' },
    { id: 'accessories', label: 'إكسسوارات', icon: Sparkles, image: 'https://i.pinimg.com/1200x/aa/54/9c/aa549ce762e8b2acf64302de1ec1cf7f.jpg' },
    { id: 'plants', label: 'نباتات', icon: Flower2, image: 'https://i.pinimg.com/control1/736x/7c/4f/01/7c4f016dd19aa239f327a33ab3f4a828.jpg' },

]

const testimonials = [
    { name: 'سارة العبدالله', text: 'أجمل بوكيه وصلني على الإطلاق! التغليف فاخر والزهور طازجة جداً. التوصيل كان سريعاً جداً في عمّان.', rating: 5 },
    { name: 'أحمد الخالدي', text: 'صممت بوكيه مخصص لخطوبتي وكان رائعاً! فريق فلوري محترف جداً ويستحق كل ثناء.', rating: 5 },
    { name: 'نور الحسين', text: 'خدمة VIP حقيقية. الباقة وصلت مع عطر رائع ورسالة handwritten. سأطلب دائماً من هنا.', rating: 5 },
]

const galleryImages = [
    'https://i.pinimg.com/control1/1200x/49/79/2a/49792a35f698e62abd2546f0ba68736d.jpg',
    'https://i.pinimg.com/1200x/de/89/38/de8938e4818671c45928aa4d248e1198.jpg',
    'https://i.pinimg.com/736x/50/5b/99/505b99251b8d8251e64f36653bd92f42.jpg',
    'https://i.pinimg.com/736x/6b/7c/96/6b7c96aac5cc08b279c6477785ffa9a6.jpg',
    'https://i.pinimg.com/control1/1200x/0c/69/9b/0c699b0a8e613373d7e83deb1d05c281.jpg',
    'https://i.pinimg.com/1200x/fb/93/39/fb93399121d11c6b444494f33e5f34d2.jpg',
]

interface HomeContentProps {
    featuredProducts: Product[]
}

export default function HomeContent({ featuredProducts }: HomeContentProps) {
    return (
        <div className="space-y-24">
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-flore-bg" />
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-flore-subtle rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-flore-gold/20 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block font-playfair text-sm tracking-[0.3em] text-flore-text-secondary uppercase mb-6">
                            Luxury Flower Boutique
                        </span>
                        <h1 className="font-amiri text-5xl md:text-7xl font-bold text-flore-text-primary mb-6 leading-tight">
                            الفخامة في كل تفصيلة
                        </h1>
                        <p className="font-noto text-lg md:text-xl text-flore-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
                            بوكيهات فاخرة بتصاميم حصرية، توصيل سريع في عمّان. اكتشف مجموعتنا الفريدة من الزهور والهدايا الفاخرة.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/catalog">
                                <Button size="lg" className="gap-2">
                                    تسوق الآن
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/atelier">
                                <Button variant="outline" size="lg" className="gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    صمّم باقتك
                                </Button>
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="mt-16"
                    >
                        <Flower2 className="h-16 w-16 mx-auto text-flore-primary/30" />
                    </motion.div>
                </div>
            </section>

            {/* Marquee - تم إصلاح طريقة الـ Loop لتفادي مشاكل الـ Hydration */}
            <section className="bg-flore-subtle py-6 overflow-hidden">
                <div className="flex animate-marquee whitespace-nowrap">
                    {[1, 2, 3, 4].map((item) => (
                        <span key={item} className="mx-8 font-playfair text-lg text-flore-primary/60 tracking-widest">
                            LUXURY · فاخر · PREMIUM · أصيل · EXCLUSIVE · فريد · ELEGANT · أنيق ·
                        </span>
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Featured Products */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary mb-4">
                        منتجات مميزة
                    </h2>
                    <p className="text-flore-text-secondary">اختارنا لك بعناية</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {featuredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Categories */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary text-center mb-12">
                    تصفح حسب الفئة
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {categories.map((category) => {
                        const Icon = category.icon
                        return (
                            <Link key={category.id} href={`/catalog?category=${category.id}`}>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="relative group overflow-hidden rounded-3xl aspect-square"
                                >
                                    <Image
                                        src={category.image}
                                        alt={category.label}
                                        fill
                                        sizes="(max-w-768px) 50vw, 25vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                        <Icon className="h-6 w-6 mb-2" />
                                        <h3 className="font-amiri text-xl font-bold">{category.label}</h3>
                                    </div>
                                </motion.div>
                            </Link>
                        )
                    })}
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* AR Teaser */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-flore-card rounded-3xl p-8 md:p-12 shadow-luxury">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="inline-block bg-flore-subtle text-flore-primary px-4 py-1 rounded-full text-sm font-medium mb-4">
                                تجربة تفاعلية
                            </span>
                            <h2 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary mb-4">
                                جرّب قبل أن تطلب
                            </h2>
                            <p className="text-flore-text-secondary mb-6 leading-relaxed">
                                استخدم تقنية الواقع المعزز لرؤية البوكيه في منزلك قبل الشراء. حرك هاتفك واستكشف كل التفاصيل.
                            </p>
                            <Link href="/ar">
                                <Button className="gap-2">
                                    <Eye className="h-4 w-4" />
                                    جرب الآن
                                </Button>
                            </Link>
                        </div>
                        <div className="relative aspect-square bg-flore-bg rounded-2xl overflow-hidden">
                            <Image
                                src="https://i.pinimg.com/control1/1200x/23/c4/aa/23c4aa9c0ae3b702a1366178e41228b3.jpg"
                                alt="AR Preview"
                                fill
                                sizes="(max-w-768px) 100vw, 50vw"
                                className="object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                                    <Eye className="h-8 w-8 text-flore-primary" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Atelier Teaser */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-br from-flore-primary to-flore-primary-dark rounded-3xl p-8 md:p-12 text-white">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1">
                            <div className="relative aspect-video bg-white/10 rounded-2xl overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="h-16 w-16 text-flore-gold animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <span className="inline-block bg-white/20 text-white px-4 py-1 rounded-full text-sm font-medium mb-4">
                                الأتيليه
                            </span>
                            <h2 className="font-amiri text-3xl md:text-4xl font-bold mb-4">
                                صمّم باقتك الخاصة
                            </h2>
                            <p className="text-white/80 mb-6 leading-relaxed">
                                اختر الزهور، الألوان، التغليف والمزهرية. صمم بوكيه فريد يعبر عن مشاعرك.
                            </p>
                            <Link href="/atelier">
                                <Button variant="secondary" className="gap-2">
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
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Testimonials */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary text-center mb-12">
                    آراء عملائنا
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-flore-card rounded-3xl p-8 shadow-luxury"
                        >
                            <div className="flex gap-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, j) => (
                                    <svg key={j} className="h-5 w-5 text-flore-gold-dark fill-current" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-flore-text-secondary mb-6 leading-relaxed">{testimonial.text}</p>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-flore-subtle flex items-center justify-center">
                                    <span className="font-amiri text-flore-primary font-bold">
                                        {testimonial.name[0]}
                                    </span>
                                </div>
                                <span className="font-noto font-medium text-flore-text-primary">{testimonial.name}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-flore-gold-dark to-transparent" />
            </div>

            {/* Gallery */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <h2 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary text-center mb-12">
                    معرض أعمالنا
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImages.map((src, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative overflow-hidden rounded-2xl group ${i === 0 || i === 3 ? 'aspect-[3/4]' : 'aspect-square'}`}
                        >
                            <Image
                                src={src}
                                alt={`Gallery ${i + 1}`}
                                fill
                                sizes="(max-w-768px) 50vw, 33vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    )
}