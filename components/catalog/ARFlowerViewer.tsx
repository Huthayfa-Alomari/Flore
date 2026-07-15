'use client'

import { useEffect, useState, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// model-viewer types are defined globally in types/model-viewer.d.ts

interface ARFlowerViewerProps {
  modelUrl: string | null
  posterUrl: string | null
  onClose: () => void
}

export function ARFlowerViewer({ modelUrl, posterUrl, onClose }: ARFlowerViewerProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const modelViewerRef = useRef<any>(null)

  // fallback للصورة الافتراضية في حال كانت الداتا فارغة منعاً لـ 404
  const finalPoster = posterUrl || '/images/placeholder-luxury.jpg'

  useEffect(() => {
    setIsMounted(true)

    // جلب المكتبة ديناميكياً في بيئة الـ Client فقط
    if (typeof window !== 'undefined' && !customElements.get('model-viewer')) {
      import('@google/model-viewer')
        .then(() => console.log('Model Viewer initialized successfully'))
        .catch((error) => console.error('Failed to load model-viewer:', error))
    }

    // تنظيف الـ States عند تدمير المكون
    return () => {
      setIsModelLoaded(false)
    }
  }, [])

  if (!modelUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-flore-border shadow-luxury">
          <p className="font-noto text-base text-flore-text-secondary">
            نموذج المعاينة ثلاثي الأبعاد وعناصر الواقع المعزز غير متوفرة لهذا المنتج حالياً.
          </p>
          <button
            onClick={onClose}
            className="mt-5 bg-flore-primary text-white px-6 py-2 rounded-xl font-noto text-xs hover:bg-opacity-95 transition-all"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    )
  }

  if (!isMounted) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-luxury border border-flore-border"
      >
        {/* الهيدر العلوي */}
        <div className="flex items-center justify-between p-4 border-b border-flore-border bg-white">
          <h3 className="font-amiri text-lg font-bold text-flore-text-primary flex items-center gap-2">
            معاينة الأبعاد الحية والواقع المعزز (AR)
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-flore-text-secondary hover:text-flore-primary hover:bg-flore-bg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* مسرح العرض الرئيسي للـ 3D */}
        <div className="relative aspect-square bg-gradient-to-b from-flore-bg to-white flex items-center justify-center">

          {/* شاشة التحميل الذكية حتى يكتمل الرندر */}
          <AnimatePresence>
            {!isModelLoaded && (
              <motion.div
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-white/80 flex flex-col items-center justify-center gap-3"
              >
                <Loader2 className="h-8 w-8 text-flore-primary animate-spin" />
                <p className="text-xs font-noto text-flore-text-secondary animate-pulse">جاري بناء المجسم ثلاثي الأبعاد الفاخر...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <model-viewer
            ref={modelViewerRef}
            src={modelUrl}
            poster={finalPoster}
            alt="Floré 3D Luxury Asset Preview"
            camera-controls
            auto-rotate
            ar
            ar-modes="webxr scene-viewer quick-look"
            touch-action="pan-y"
            shadow-intensity="1.5"
            exposure="0.9"
            style={{ width: '100%', height: '100%', position: 'relative', zIndex: 10 }}
            // تفعيل الـ Loading State برمجياً عند اكتمال جلب الـ Asset
            onload={() => setIsModelLoaded(true)}
          />

          {/* زر تشغيل الـ AR حقيقي، آمن للـ Build ومتوافق مع متصفحات الموبايل الصارمة */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100]"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (modelViewerRef.current) {
                  modelViewerRef.current.activateAR()
                }
              }}
              className="bg-flore-primary text-white font-noto font-bold text-xs px-6 py-3 rounded-xl shadow-lg hover:bg-opacity-95 transition-all"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            >
              عرض الباقة في مساحتك الحقيقية
            </button>
          </div>

        </div>

        {/* تلميحات تجربة المستخدم التوجيهية */}
        <div className="p-4 bg-flore-bg/40 border-t border-flore-border text-center">
          <p className="text-xs font-noto text-flore-text-secondary leading-relaxed">
            يمكنك تدوير المجسم وتهيئة الزوايا بأصابعك. للتجربة الحية الكاملة، افتح الرابط من متصفح هاتف ذكي (iOS أو Android) لتفعيل كاميرا البيئة الحقيقية.
          </p>
        </div>
      </motion.div>
    </div>
  )
}