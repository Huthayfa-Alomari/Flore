'use client'

import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import type { AtelierContainer, Flower, Greenery, QuantityMap } from '@/lib/atelier/types'

const positions = [
  [50, 9, 0.98], [36, 17, 0.9], [64, 17, 0.92], [25, 28, 0.82], [75, 28, 0.84],
  [43, 31, 0.94], [57, 31, 0.95], [50, 42, 0.88], [31, 44, 0.78], [69, 44, 0.8],
  [41, 53, 0.8], [59, 53, 0.8], [50, 59, 0.72], [22, 40, 0.7], [78, 40, 0.7],
]

function supportedImage(url: string | null | undefined) {
  if (!url) return false
  return url.startsWith('/') || url.includes('rlktxwqxmwdostitaefo.supabase.co') || url.includes('i.pinimg.com')
}

export function BouquetPreview({
  flowers,
  flowerQuantities,
  greenery,
  greeneryQuantities,
  container,
  aiImageUrl,
  isGenerating,
}: {
  flowers: Flower[]
  flowerQuantities: QuantityMap
  greenery: Greenery[]
  greeneryQuantities: QuantityMap
  container: AtelierContainer | null
  aiImageUrl: string | null
  isGenerating: boolean
}) {
  const flowerItems = Object.entries(flowerQuantities).flatMap(([id, qty]) => {
    const flower = flowers.find(item => item.id === id)
    if (!flower) return []
    return Array.from({ length: Math.min(qty, 15) }, (_, index) => ({ ...flower, previewKey: `${id}-${index}` }))
  })

  const greeneryItems = Object.entries(greeneryQuantities).flatMap(([id, qty]) => {
    const item = greenery.find(entry => entry.id === id)
    if (!item) return []
    return Array.from({ length: Math.min(qty, 6) }, (_, index) => ({ ...item, previewKey: `${id}-${index}` }))
  })

  if (aiImageUrl) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#EEE9E1]">
        <Image src={aiImageUrl} alt="معاينة فوتوغرافية لتصميم الباقة" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 420px" priority />
        <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/40 bg-black/25 px-4 py-3 text-right text-white backdrop-blur-md">
          <p className="text-xs tracking-[0.18em] opacity-80">FLORÉ AI STUDIO</p>
          <p className="mt-1 text-sm font-medium">تصوّر فوتوغرافي إرشادي للتنسيق المختار</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-black/5 bg-[radial-gradient(circle_at_50%_18%,#fff_0%,#F5F0E9_48%,#E8E0D5_100%)]">
      <div className="absolute inset-x-[15%] bottom-[4%] h-[42%] overflow-hidden rounded-t-[46%] rounded-b-[18%] border border-black/5 bg-[#D7C8B8] shadow-[0_30px_55px_rgba(32,32,30,0.12)]">
        {container && supportedImage(container.image) ? (
          <Image src={container.image!} alt={container.name_ar || container.name} fill className="object-cover" sizes="300px" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,.55),transparent_45%),linear-gradient(20deg,#C7B29D,#E7DDD2)]" />
        )}
      </div>

      <div className="absolute inset-x-[8%] top-[6%] h-[58%]">
        {greeneryItems.map((item, index) => {
          const x = 15 + ((index * 17) % 70)
          const y = 18 + ((index * 11) % 30)
          return (
            <div key={item.previewKey} className="absolute h-24 w-10 -translate-x-1/2 rounded-[70%_10%_70%_10%] bg-[#6D7D63]/75 blur-[0.2px]" style={{ left: `${x}%`, top: `${y}%`, rotate: `${-28 + index * 13}deg` }} />
          )
        })}

        {flowerItems.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-black/10 bg-white/60">
                <Sparkles className="h-5 w-5 text-[#B89B5E]" aria-hidden="true" />
              </div>
              <p className="font-amiri text-xl text-[#20201E]">ابدأ باختيار الحجم</p>
              <p className="mt-1 text-xs text-[#766E66]">ثم ابنِ التكوين ساقًا بعد ساق</p>
            </div>
          </div>
        ) : (
          flowerItems.map((flower, index) => {
            const [x, y, scale] = positions[index % positions.length]
            const size = 58 * scale
            return (
              <div key={flower.previewKey} className="absolute -translate-x-1/2 transition-all duration-500" style={{ left: `${x}%`, top: `${y}%`, zIndex: 20 + index }}>
                {supportedImage(flower.image) ? (
                  <div className="overflow-hidden rounded-full border-[3px] border-white/80 shadow-[0_8px_18px_rgba(32,32,30,0.14)]" style={{ width: size, height: size }}>
                    <Image src={flower.image!} alt="" width={Math.ceil(size)} height={Math.ceil(size)} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="rounded-full border-[3px] border-white/80 shadow-[0_8px_18px_rgba(32,32,30,0.14)]" style={{ width: size, height: size, backgroundColor: flower.color || '#D8B8B5' }} />
                )}
              </div>
            )
          })
        )}
      </div>

      {isGenerating && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[#F7F3ED]/90 backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#20201E]/15 border-t-[#20201E]" />
            <p className="mt-4 font-amiri text-xl text-[#20201E]">نصوغ المعاينة الواقعية</p>
            <p className="mt-1 text-xs text-[#766E66]">يمكنك متابعة تصميمك بعد اكتمالها</p>
          </div>
        </div>
      )}
    </div>
  )
}
