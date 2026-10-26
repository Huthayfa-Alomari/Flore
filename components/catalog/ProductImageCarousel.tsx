'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronRight, ChevronLeft } from 'lucide-react'

export function ProductImageCarousel({
    images,
    alt,
}: {
    images: string[]
    alt: string
}) {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: images.length > 1,
        direction: 'rtl', // يتماشى مع اتجاه الموقع بالكامل
    })
    const [selectedIndex, setSelectedIndex] = useState(0)

    const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi])
    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setSelectedIndex(emblaApi.selectedScrollSnap())
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return
        onSelect()
        emblaApi.on('select', onSelect)
        emblaApi.on('reInit', onSelect)
    }, [emblaApi, onSelect])

    return (
        <div className="space-y-3">
            {/* المسرح الرئيسي — إطار بحواف ناعمة وخط رفيع */}
            <div className="relative overflow-hidden rounded-3xl border border-flore-border/70 bg-flore-subtle shadow-luxury-soft">
                <div className="overflow-hidden" ref={emblaRef}>
                    <div className="flex">
                        {images.map((img, i) => (
                            <div key={i} className="relative flex-[0_0_100%] aspect-[4/5]">
                                <Image
                                    src={img}
                                    alt={`${alt} ${i + 1}`}
                                    fill
                                    className="object-cover"
                                    priority={i === 0}
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {images.length > 1 && (
                    <>
                        <button
                            onClick={scrollPrev}
                            aria-label="الصورة السابقة"
                            className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-flore-border/60 bg-flore-card/90 text-flore-text-primary shadow-luxury-soft backdrop-blur-sm transition-all duration-200 ease-flore hover:scale-105 hover:bg-flore-card active:scale-95"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                        <button
                            onClick={scrollNext}
                            aria-label="الصورة التالية"
                            className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-flore-border/60 bg-flore-card/90 text-flore-text-primary shadow-luxury-soft backdrop-blur-sm transition-all duration-200 ease-flore hover:scale-105 hover:bg-flore-card active:scale-95"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        {/* مؤشرات نحيفة — شريط ذهبي للصورة النشطة */}
                        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-flore-card/75 px-3 py-2 shadow-luxury-soft backdrop-blur-sm">
                            {images.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => scrollTo(i)}
                                    aria-label={`الانتقال للصورة ${i + 1}`}
                                    aria-current={i === selectedIndex}
                                    className={`h-1 cursor-pointer rounded-full transition-all duration-300 ease-flore ${
                                        i === selectedIndex
                                            ? 'w-7 bg-flore-gold'
                                            : 'w-2.5 bg-flore-text-primary/25 hover:bg-flore-text-primary/45'
                                    }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* الصور المصغرة — إطارات رفيعة أنيقة */}
            {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => scrollTo(i)}
                            aria-label={`عرض الصورة ${i + 1}`}
                            className={`relative h-20 w-20 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 ease-flore ${
                                selectedIndex === i
                                    ? 'border-flore-primary opacity-100 ring-2 ring-flore-primary/15'
                                    : 'border-flore-border/70 opacity-60 hover:border-flore-sage hover:opacity-100'
                            }`}
                        >
                            <Image
                                src={img}
                                alt={`${alt} ${i + 1}`}
                                fill
                                className="object-cover"
                                sizes="80px"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
