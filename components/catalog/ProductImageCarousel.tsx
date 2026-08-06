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
            {/* المسرح الرئيسي */}
            <div className="relative rounded-3xl overflow-hidden bg-flore-subtle">
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
                            className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors"
                        >
                            <ChevronRight className="h-5 w-5 text-flore-text-primary" />
                        </button>
                        <button
                            onClick={scrollNext}
                            aria-label="الصورة التالية"
                            className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-flore-text-primary" />
                        </button>

                        {/* نقاط المؤشر (Dots) */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {images.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => scrollTo(i)}
                                    aria-label={`الانتقال للصورة ${i + 1}`}
                                    className={`h-2 rounded-full transition-all ${i === selectedIndex ? 'w-6 bg-white' : 'w-2 bg-white/60'
                                        }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Thumbnails (اختياري، يبقى مفيد على الشاشات الكبيرة) */}
            {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => scrollTo(i)}
                            className={`relative h-20 w-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${selectedIndex === i ? 'border-flore-primary' : 'border-transparent'
                                }`}
                        >
                            <Image src={img} alt={`${alt} ${i + 1}`} fill className="object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}