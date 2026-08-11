"use client"

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/lib/store/cart-store"
import { formatPrice } from "@/lib/utils"
import type { Product } from "@/types"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Flower = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  color: string | null
  in_stock: boolean
}

type Greenery = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  in_stock: boolean
}

type Container = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  in_stock: boolean
  container_type: "basket" | "glass_vase" | "wrap" | "luxury_box"
}

type BouquetSize = {
  id: string
  key: string
  label_ar: string
  desc_ar: string | null
  stem_count: number
  price_multiplier: number
}

type Step =
  | "flowers"
  | "greenery"
  | "container"
  | "size"
  | "message"

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CONTAINER_ICONS: Record<Container["container_type"], string> = {
  basket: "🧺",
  glass_vase: "🏺",
  wrap: "💐",
  luxury_box: "🎁",
}

const CONTAINER_LABELS: Record<Container["container_type"], string> = {
  basket: "سلة",
  glass_vase: "مزهرية زجاجية",
  wrap: "تغليف باقة",
  luxury_box: "صندوق فاخر",
}

const PRESETS = [
  {
    id: "romantic",
    label: "رومانسية",
    icon: "💕",
    desc: "ألوان حمراء ووردية",
  },
  {
    id: "elegant",
    label: "فاخرة",
    icon: "✨",
    desc: "أوركيد وألوان راقية",
  },
  {
    id: "fresh",
    label: "منعشة",
    icon: "🌿",
    desc: "زهور بيضاء وهادئة",
  },
  {
    id: "sunshine",
    label: "مشرقة",
    icon: "☀️",
    desc: "ألوان صفراء ومشرقة",
  },
]

const COLOR_FILTERS = [
  {
    label: "الكل",
    value: "all",
    color: "linear-gradient(135deg,#ccc,#999)",
  },
  {
    label: "أحمر",
    value: "#e11d48",
    color: "#e11d48",
  },
  {
    label: "وردي",
    value: "#ff6b9d",
    color: "#ff6b9d",
  },
  {
    label: "أبيض",
    value: "#f8fafc",
    color: "#f8fafc",
  },
  {
    label: "أصفر",
    value: "#fbbf24",
    color: "#fbbf24",
  },
  {
    label: "بنفسجي",
    value: "#a855f7",
    color: "#a855f7",
  },
]

// ─────────────────────────────────────────────────────────────
// Deterministic Preview Positions
// ─────────────────────────────────────────────────────────────

const PREVIEW_POSITIONS = [
  { x: 50, y: 2, rotation: -5, scale: 1.0 },
  { x: 34, y: 10, rotation: 10, scale: 0.96 },
  { x: 66, y: 10, rotation: -12, scale: 0.98 },
  { x: 23, y: 24, rotation: 16, scale: 0.9 },
  { x: 77, y: 24, rotation: -18, scale: 0.92 },
  { x: 39, y: 29, rotation: 5, scale: 1.0 },
  { x: 61, y: 29, rotation: -6, scale: 1.0 },
  { x: 50, y: 39, rotation: 0, scale: 0.96 },
  { x: 30, y: 42, rotation: 12, scale: 0.88 },
  { x: 70, y: 42, rotation: -12, scale: 0.9 },
  { x: 44, y: 49, rotation: 4, scale: 0.92 },
  { x: 56, y: 49, rotation: -4, scale: 0.92 },
]

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function flowerMatchesColor(
  flower: Flower,
  targetColor: string
): boolean {
  const color = normalizeText(flower.color)
  const nameAr = normalizeText(flower.name_ar)
  const name = normalizeText(flower.name)

  if (!color && !nameAr && !name) {
    return false
  }

  const target = normalizeText(targetColor)

  // Direct HEX comparison
  if (color === target) {
    return true
  }

  // Common Arabic color names
  const colorAliases: Record<string, string[]> = {
    "#e11d48": [
      "أحمر",
      "احمر",
      "حمراء",
      "red",
      "#e11d48",
    ],
    "#ff6b9d": [
      "وردي",
      "ورديه",
      "وردية",
      "زهري",
      "pink",
      "#ff6b9d",
    ],
    "#f8fafc": [
      "أبيض",
      "ابيض",
      "بيضاء",
      "white",
      "#f8fafc",
    ],
    "#fbbf24": [
      "أصفر",
      "اصفر",
      "صفراء",
      "yellow",
      "#fbbf24",
    ],
    "#a855f7": [
      "بنفسجي",
      "بنفسجية",
      "purple",
      "#a855f7",
    ],
  }

  const aliases = colorAliases[target] || []

  return aliases.some(
    alias =>
      color.includes(alias) ||
      nameAr.includes(alias) ||
      name.includes(alias)
  )
}

function triggerConfetti() {
  if (typeof window === "undefined") return

  const colors = [
    "#0D5C63",
    "#67B26F",
    "#C9A962",
    "#ff6b9d",
  ]

  for (let i = 0; i < 40; i++) {
    const el = document.createElement("div")

    el.style.position = "fixed"
    el.style.left = "50%"
    el.style.top = "50%"
    el.style.width = "8px"
    el.style.height = "8px"
    el.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)]
    el.style.borderRadius =
      Math.random() > 0.5 ? "50%" : "2px"
    el.style.pointerEvents = "none"
    el.style.zIndex = "9999"

    document.body.appendChild(el)

    const angle = Math.random() * Math.PI * 2
    const velocity = 100 + Math.random() * 200

    const tx = Math.cos(angle) * velocity
    const ty = Math.sin(angle) * velocity - 100

    const rot = Math.random() * 720 - 360

    el.animate(
      [
        {
          transform: "translate(0,0) rotate(0deg)",
          opacity: 1,
        },
        {
          transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
          opacity: 0,
        },
      ],
      {
        duration: 800 + Math.random() * 600,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      }
    ).onfinish = () => el.remove()
  }
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function AtelierPage() {
  const { addItem } = useCart()

  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  // ───────────────────────────────────────────────────────────
  // Data
  // ───────────────────────────────────────────────────────────

  const [flowers, setFlowers] = useState<Flower[]>([])
  const [greeneries, setGreeneries] = useState<Greenery[]>([])
  const [containers, setContainers] = useState<Container[]>([])
  const [bouquetSizes, setBouquetSizes] = useState<BouquetSize[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ───────────────────────────────────────────────────────────
  // Selection
  // ───────────────────────────────────────────────────────────

  const [selectedFlowers, setSelectedFlowers] =
    useState<Record<string, number>>({})

  const [selectedGreenery, setSelectedGreenery] =
    useState<Record<string, number>>({})

  const [selectedContainer, setSelectedContainer] =
    useState<string | null>(null)

  const [selectedSize, setSelectedSize] =
    useState<string>("")

  const [giftMessage, setGiftMessage] = useState("")

  // ───────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────

  const [activeStep, setActiveStep] =
    useState<Step>("flowers")

  const [colorFilter, setColorFilter] =
    useState("all")

  const [previewHovered, setPreviewHovered] =
    useState(false)

  const [showPresets, setShowPresets] =
    useState(true)

  const [added, setAdded] = useState(false)

  // ───────────────────────────────────────────────────────────
  // AI Preview
  // ───────────────────────────────────────────────────────────

  const [aiImageUrl, setAiImageUrl] =
    useState<string | null>(null)

  const [isGeneratingAi, setIsGeneratingAi] =
    useState(false)

  const [aiRemaining, setAiRemaining] =
    useState<number | null>(null)

  // ───────────────────────────────────────────────────────────
  // Load Data
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setError(null)

        const [
          { data: f, error: ef },
          { data: c, error: ec },
          { data: g, error: eg },
          { data: s, error: es },
        ] = await Promise.all([
          supabase
            .from("flower_types")
            .select("*")
            .eq("in_stock", true)
            .order("price"),

          supabase
            .from("vase_options")
            .select("*")
            .eq("in_stock", true)
            .order("price"),

          supabase
            .from("greenery_options")
            .select("*")
            .eq("in_stock", true)
            .order("price"),

          supabase
            .from("bouquet_sizes")
            .select("*")
            .order("stem_count"),
        ])

        if (ef) throw ef
        if (ec) throw ec
        if (eg) throw eg
        if (es) throw es

        if (!isMounted) return

        setFlowers((f || []) as Flower[])
        setContainers((c || []) as Container[])
        setGreeneries((g || []) as Greenery[])
        setBouquetSizes((s || []) as BouquetSize[])
      } catch (err: unknown) {
        if (!isMounted) return

        const message =
          err &&
            typeof err === "object" &&
            "message" in err
            ? String(
              (err as { message?: unknown }).message ||
              ""
            )
            : ""

        setError(
          message || "حدث خطأ في تحميل بيانات الأتيليه"
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [supabase])

  // ───────────────────────────────────────────────────────────
  // Default Size
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (bouquetSizes.length === 0) return

    const currentExists = bouquetSizes.some(
      size => size.key === selectedSize
    )

    if (!currentExists) {
      const regular = bouquetSizes.find(
        size => size.key === "regular"
      )

      setSelectedSize(
        regular?.key || bouquetSizes[0].key
      )
    }
  }, [bouquetSizes, selectedSize])

  // ───────────────────────────────────────────────────────────
  // Filtered Flowers
  // ───────────────────────────────────────────────────────────

  const filteredFlowers = useMemo(() => {
    if (colorFilter === "all") {
      return flowers
    }

    return flowers.filter(flower =>
      flowerMatchesColor(flower, colorFilter)
    )
  }, [flowers, colorFilter])

  // ───────────────────────────────────────────────────────────
  // Price Calculations
  // ───────────────────────────────────────────────────────────

  const flowersTotalPrice = useMemo(() => {
    return Object.entries(selectedFlowers).reduce(
      (sum, [id, qty]) => {
        const flower = flowers.find(
          item => item.id === id
        )

        return (
          sum +
          (flower?.price || 0) * qty
        )
      },
      0
    )
  }, [selectedFlowers, flowers])

  const greeneryTotalPrice = useMemo(() => {
    return Object.entries(selectedGreenery).reduce(
      (sum, [id, qty]) => {
        const greenery = greeneries.find(
          item => item.id === id
        )

        return (
          sum +
          (greenery?.price || 0) * qty
        )
      },
      0
    )
  }, [selectedGreenery, greeneries])

  const selectedContainerObj = useMemo(
    () =>
      containers.find(
        container =>
          container.id === selectedContainer
      ),
    [containers, selectedContainer]
  )

  const selectedSizeObj = useMemo(
    () =>
      bouquetSizes.find(
        size => size.key === selectedSize
      ),
    [bouquetSizes, selectedSize],
  )

  const sizeMultiplier =
    selectedSizeObj?.price_multiplier || 1

  // الحجم يطبق على الزهور فقط
  const totalPrice = useMemo(() => {
    const flowersPrice =
      flowersTotalPrice * sizeMultiplier

    const greeneryPrice =
      greeneryTotalPrice

    const containerPrice =
      selectedContainerObj?.price || 0

    return (
      flowersPrice +
      greeneryPrice +
      containerPrice
    )
  }, [
    flowersTotalPrice,
    greeneryTotalPrice,
    selectedContainerObj,
    sizeMultiplier,
  ])

  const totalFlowers = useMemo(
    () =>
      Object.values(selectedFlowers).reduce(
        (total, qty) => total + qty,
        0
      ),
    [selectedFlowers]
  )

  // ───────────────────────────────────────────────────────────
  // Flower Quantity
  // ───────────────────────────────────────────────────────────

  const updateFlowerQty = useCallback(
    (id: string, delta: number) => {
      setSelectedFlowers(prev => {
        const current = prev[id] || 0
        const qty = Math.max(
          0,
          current + delta
        )

        const next = { ...prev }

        if (qty === 0) {
          delete next[id]
        } else {
          next[id] = qty
        }

        return next
      })

      setAiImageUrl(null)
    },
    []
  )

  // ───────────────────────────────────────────────────────────
  // Greenery Quantity
  // ───────────────────────────────────────────────────────────

  const updateGreeneryQty = useCallback(
    (id: string, delta: number) => {
      setSelectedGreenery(prev => {
        const current = prev[id] || 0

        const qty = Math.max(
          0,
          current + delta
        )

        const next = { ...prev }

        if (qty === 0) {
          delete next[id]
        } else {
          next[id] = qty
        }

        return next
      })

      setAiImageUrl(null)
    },
    []
  )

  // ───────────────────────────────────────────────────────────
  // Presets
  // ───────────────────────────────────────────────────────────

  const applyPreset = useCallback(
    (presetId: string) => {
      const next: Record<string, number> = {}

      if (presetId === "romantic") {
        const romanticFlowers = flowers.filter(
          flower =>
            flowerMatchesColor(
              flower,
              "#e11d48"
            ) ||
            flowerMatchesColor(
              flower,
              "#ff6b9d"
            )
        )

        romanticFlowers
          .slice(0, 2)
          .forEach((flower, index) => {
            next[flower.id] =
              index === 0 ? 5 : 3
          })
      }

      if (presetId === "elegant") {
        const elegantFlowers =
          flowers.filter(flower => {
            const text =
              `${flower.name_ar || ""} ${flower.name || ""
                }`.toLowerCase()

            return (
              text.includes("أوركيد") ||
              text.includes("اوركيد") ||
              text.includes("orchid") ||
              text.includes("كالا") ||
              text.includes("calla") ||
              text.includes("لافندر") ||
              text.includes("lavender") ||
              flowerMatchesColor(
                flower,
                "#a855f7"
              )
            )
          })

        elegantFlowers
          .slice(0, 2)
          .forEach((flower, index) => {
            next[flower.id] =
              index === 0 ? 4 : 2
          })
      }

      if (presetId === "fresh") {
        const whiteFlowers =
          flowers.filter(flower =>
            flowerMatchesColor(
              flower,
              "#f8fafc"
            )
          )

        whiteFlowers
          .slice(0, 2)
          .forEach((flower, index) => {
            next[flower.id] =
              index === 0 ? 6 : 2
          })
      }

      if (presetId === "sunshine") {
        const sunnyFlowers =
          flowers.filter(flower => {
            const text =
              `${flower.name_ar || ""} ${flower.name || ""
                }`.toLowerCase()

            return (
              flowerMatchesColor(
                flower,
                "#fbbf24"
              ) ||
              text.includes("عباد الشمس") ||
              text.includes("sunflower") ||
              text.includes("دوار الشمس") ||
              text.includes("برتقال")
            )
          })

        sunnyFlowers
          .slice(0, 2)
          .forEach((flower, index) => {
            next[flower.id] =
              index === 0 ? 5 : 2
          })
      }

      if (Object.keys(next).length === 0) {
        window.alert(
          "عذراً، هذا الاقتراح غير متاح حالياً، اختر زهورك يدوياً 🌸"
        )
        return
      }

      setSelectedFlowers(next)
      setShowPresets(false)
      setAiImageUrl(null)
      setActiveStep("flowers")
    },
    [flowers]
  )

  // ───────────────────────────────────────────────────────────
  // Reset
  // ───────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    setSelectedFlowers({})
    setSelectedGreenery({})
    setSelectedContainer(null)

    if (bouquetSizes.length > 0) {
      const regular = bouquetSizes.find(
        size => size.key === "regular"
      )

      setSelectedSize(
        regular?.key || bouquetSizes[0].key
      )
    } else {
      setSelectedSize("")
    }

    setGiftMessage("")
    setActiveStep("flowers")
    setShowPresets(true)
    setAiImageUrl(null)
    setAiRemaining(null)
    setAdded(false)
    setColorFilter("all")
  }, [bouquetSizes])

  // ───────────────────────────────────────────────────────────
  // AI Preview
  // ───────────────────────────────────────────────────────────

  const handleGenerateAiPreview =
    useCallback(async () => {
      if (totalFlowers === 0) {
        window.alert(
          "الرجاء اختيار زهور أولاً"
        )
        return
      }

      if (isGeneratingAi) {
        return
      }

      if (aiRemaining === 0) {
        window.alert(
          "انتهت محاولات المعاينة المجانية لهذا اليوم."
        )
        return
      }

      setIsGeneratingAi(true)
      setAiImageUrl(null)

      try {
        const res = await fetch(
          "/api/atelier/generate-preview",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              flowers:
                Object.entries(
                  selectedFlowers
                ).map(([id, qty]) => ({
                  id,
                  qty,
                })),

              greenery:
                Object.entries(
                  selectedGreenery
                ).map(([id, qty]) => ({
                  id,
                  qty,
                })),

              containerId:
                selectedContainer,

              sizeKey:
                selectedSize,
            }),
          }
        )

        const data = await res.json()

        if (!res.ok) {
          window.alert(
            data?.error ||
            "تعذر توليد الصورة حالياً"
          )

          if (
            typeof data?.remaining ===
            "number"
          ) {
            setAiRemaining(
              data.remaining
            )
          }

          return
        }

        if (!data?.imageUrl) {
          throw new Error(
            "AI response did not include imageUrl"
          )
        }

        setAiImageUrl(data.imageUrl)

        if (
          typeof data?.remaining ===
          "number"
        ) {
          setAiRemaining(
            data.remaining
          )
        }
      } catch (err) {
        console.error(
          "AI Preview Error:",
          err
        )

        window.alert(
          "تعذر توليد الصورة حالياً، يرجى المحاولة مرة أخرى."
        )
      } finally {
        setIsGeneratingAi(false)
      }
    }, [
      totalFlowers,
      isGeneratingAi,
      aiRemaining,
      selectedFlowers,
      selectedGreenery,
      selectedContainer,
      selectedSize,
    ])

  // ───────────────────────────────────────────────────────────
  // Container Selection
  // ───────────────────────────────────────────────────────────

  const handleContainerSelect = useCallback(
    (containerId: string) => {
      setSelectedContainer(prev =>
        prev === containerId
          ? null
          : containerId
      )

      setAiImageUrl(null)
    },
    []
  )

  // ───────────────────────────────────────────────────────────
  // Size Selection
  // ───────────────────────────────────────────────────────────

  const handleSizeSelect = useCallback(
    (sizeKey: string) => {
      setSelectedSize(sizeKey)
      setAiImageUrl(null)
    },
    []
  )

  // ───────────────────────────────────────────────────────────
  // Add To Cart
  // ───────────────────────────────────────────────────────────

  const handleAddToCart = useCallback(() => {
    if (totalFlowers === 0) {
      window.alert(
        "اختر زهرة واحدة على الأقل"
      )
      return
    }

    const selectedFlowerNames =
      Object.entries(
        selectedFlowers
      )
        .map(([id, qty]) => {
          const flower =
            flowers.find(
              item => item.id === id
            )

          return `${flower?.name_ar ||
            flower?.name ||
            "زهرة"
            } ×${qty}`
        })
        .join("، ")

    const now =
      new Date().toISOString()

    const containerName =
      selectedContainerObj
        ? selectedContainerObj.name_ar ||
        selectedContainerObj.name
        : ""

    const sizeName =
      selectedSizeObj?.label_ar ||
      ""

    const descriptionParts = [
      `زهور: ${selectedFlowerNames}`,
    ]

    if (containerName) {
      descriptionParts.push(
        `الحاوية: ${containerName}`
      )
    }

    if (sizeName) {
      descriptionParts.push(
        `الحجم: ${sizeName}`
      )
    }

    if (giftMessage.trim()) {
      descriptionParts.push(
        `رسالة: ${giftMessage.trim()}`
      )
    }

    const fallbackImage =
      flowers.find(
        flower =>
          selectedFlowers[flower.id]
      )?.image || ""

    const customProduct: Product = {
      id: `custom-${Date.now()}`,

      name: `باقة مخصصة — ${selectedFlowerNames}`,

      name_en:
        "Custom Bouquet",

      category:
        "custom" as const,

      price: totalPrice,

      currency: "JOD",

      image:
        aiImageUrl ||
        fallbackImage,

      images: [],

      description:
        descriptionParts.join(
          " | "
        ),

      description_en: null,

      badge: "مخصص",

      badge_color:
        "#0D5C63",

      in_stock: true,

      model_url: null,

      ar_enabled: false,

      created_at: now,

      updated_at: now,
    }

    // ─────────────────────────────────────────────
    // Preserve existing Cart structure
    // but correctly map container type.
    // ─────────────────────────────────────────────

    let wrapId: string | null = null
    let vaseId: string | null = null

    if (selectedContainerObj) {
      if (
        selectedContainerObj.container_type ===
        "wrap"
      ) {
        wrapId =
          selectedContainerObj.id
      } else {
        vaseId =
          selectedContainerObj.id
      }
    }

    addItem({
      product: customProduct,

      quantity: 1,

      customization: {
        flowers:
          Object.entries(
            selectedFlowers
          ).map(([id, qty]) => {
            const flower =
              flowers.find(
                item => item.id === id
              )

            return `${flower?.name_ar ||
              flower?.name ||
              "زهرة"
              } ×${qty}`
          }),

        wrap:
          selectedContainerObj
            ?.container_type ===
            "wrap"
            ? containerName
            : "",

        vase:
          selectedContainerObj
            ?.container_type !==
            "wrap"
            ? containerName
            : "",

        message:
          giftMessage,
      },

      bouquetSelection: {
        flowers:
          Object.entries(
            selectedFlowers
          ).map(([id, qty]) => ({
            id,
            qty,
          })),

        wrapId,

        vaseId,
      },
    })

    triggerConfetti()

    setAdded(true)

    window.setTimeout(() => {
      window.location.href =
        "/cart"
    }, 1200)
  }, [
    totalFlowers,
    selectedFlowers,
    flowers,
    selectedContainerObj,
    totalPrice,
    giftMessage,
    addItem,
    selectedSizeObj,
    aiImageUrl,
  ])

  // ───────────────────────────────────────────────────────────
  // Deterministic CSS Preview
  // ───────────────────────────────────────────────────────────

  const bouquetPreviewItems =
    useMemo(() => {
      const items: {
        id: string
        color: string
        image: string | null
        size: number
      }[] = []

      let flowerIndex = 0

      Object.entries(
        selectedFlowers
      ).forEach(([id, qty]) => {
        const flower =
          flowers.find(
            item => item.id === id
          )

        if (!flower) return

        const count = Math.min(
          qty,
          12
        )

        for (
          let i = 0;
          i < count;
          i++
        ) {
          const position =
            PREVIEW_POSITIONS[
            flowerIndex %
            PREVIEW_POSITIONS.length
            ]

          items.push({
            id: `${id}-${i}`,
            color:
              flower.color ||
              "#ff6b9d",
            image:
              flower.image || null,
            size:
              34 *
              position.scale,
          })

          flowerIndex++
        }
      })

      return items
    }, [
      selectedFlowers,
      flowers,
    ])

  // ───────────────────────────────────────────────────────────
  // Steps
  // ───────────────────────────────────────────────────────────

  const steps: {
    key: Step
    label: string
    icon: string
  }[] = [
      {
        key: "flowers",
        label: "الزهور",
        icon: "🌸",
      },
      {
        key: "greenery",
        label: "الأوراق",
        icon: "🌿",
      },
      {
        key: "container",
        label: "الحاوية",
        icon: "🎁",
      },
      {
        key: "size",
        label: "الحجم",
        icon: "📏",
      },
      {
        key: "message",
        label: "الإهداء",
        icon: "💌",
      },
    ]

  const stepIndex =
    steps.findIndex(
      step =>
        step.key === activeStep
    )

  // ───────────────────────────────────────────────────────────
  // Loading
  // ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-flore-bg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-flore-primary/20 border-t-flore-primary animate-spin" />

          <p className="text-flore-text-secondary text-lg font-medium animate-pulse">
            جاري تحميل الأتيليه...
          </p>
        </div>
      </div>
    )
  }

  // ───────────────────────────────────────────────────────────
  // Error
  // ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-flore-bg">
        <div className="text-center bg-flore-card rounded-3xl p-8 shadow-luxury max-w-sm mx-4">
          <div className="text-5xl mb-4">
            😔
          </div>

          <p className="text-red-500 text-xl mb-4 font-bold">
            {error}
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
            className="bg-flore-primary text-white px-6 py-2 rounded-xl font-bold hover:opacity-90 transition"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  // ───────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-flore-bg pb-32 font-noto"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ─────────────────────────────────────────────── */}
        {/* Header */}
        {/* ─────────────────────────────────────────────── */}

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-flore-card/60 backdrop-blur-sm rounded-full px-4 py-1.5 mb-3 border border-flore-border">
            <span className="text-xs text-flore-text-secondary tracking-widest uppercase">
              Atelier Floré
            </span>
          </div>

          <h1 className="font-amiri text-4xl md:text-5xl font-bold text-flore-text-primary mb-2">
            أتيليه فلوري
          </h1>

          <p className="text-flore-text-secondary text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            صمّم باقتك الخاصة خطوة بخطوة —
            من الزهرة إلى الحاوية
          </p>
        </div>

        {/* ─────────────────────────────────────────────── */}
        {/* Stepper */}
        {/* ─────────────────────────────────────────────── */}

        <div className="flex items-center justify-center gap-2 md:gap-4 mb-10 overflow-x-auto pb-2">
          {steps.map(
            (step, idx) => {
              const isActive =
                step.key ===
                activeStep

              const isPast =
                idx < stepIndex

              const isClickable =
                idx <=
                stepIndex + 1

              return (
                <button
                  key={step.key}
                  onClick={() =>
                    isClickable &&
                    setActiveStep(
                      step.key
                    )
                  }
                  disabled={
                    !isClickable
                  }
                  className={`flex items-center gap-2.5 whitespace-nowrap transition-all duration-300 ${!isClickable
                      ? "opacity-30 cursor-not-allowed"
                      : "cursor-pointer"
                    }`}
                >
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 transition-all duration-300 ${isActive
                        ? "border-flore-primary bg-flore-primary text-white"
                        : isPast
                          ? "border-flore-primary text-flore-primary"
                          : "border-flore-border text-flore-text-secondary"
                      }`}
                  >
                    {isPast ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      String(
                        idx + 1
                      ).padStart(
                        2,
                        "0"
                      )
                    )}
                  </span>

                  <span
                    className={`text-sm font-medium hidden md:inline ${isActive
                        ? "text-flore-text-primary font-bold"
                        : "text-flore-text-secondary"
                      }`}
                  >
                    {step.label}
                  </span>

                  {idx <
                    steps.length -
                    1 && (
                      <span className="w-4 md:w-8 h-px bg-flore-border mx-1" />
                    )}
                </button>
              )
            }
          )}
        </div>

        {/* ─────────────────────────────────────────────── */}
        {/* Presets */}
        {/* ─────────────────────────────────────────────── */}

        {showPresets &&
          activeStep ===
          "flowers" &&
          totalFlowers === 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-flore-text-secondary uppercase tracking-wider">
                  ابدأ باقتراح سريع
                </h3>

                <button
                  onClick={() =>
                    setShowPresets(
                      false
                    )
                  }
                  className="text-xs text-flore-primary hover:underline"
                >
                  تخطي
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRESETS.map(
                  preset => (
                    <button
                      key={
                        preset.id
                      }
                      onClick={() =>
                        applyPreset(
                          preset.id
                        )
                      }
                      className="group bg-flore-card rounded-2xl p-4 border-2 border-flore-border hover:border-flore-primary hover:shadow-lg transition-all duration-300 text-right"
                    >
                      <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
                        {
                          preset.icon
                        }
                      </div>

                      <div className="font-bold text-flore-text-primary text-sm mb-1">
                        {
                          preset.label
                        }
                      </div>

                      <div className="text-xs text-flore-text-secondary leading-relaxed">
                        {
                          preset.desc
                        }
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

        {/* ─────────────────────────────────────────────── */}
        {/* Main Grid */}
        {/* ─────────────────────────────────────────────── */}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-3 space-y-6">

            {/* ─────────────────────────────────────── */}
            {/* FLOWERS */}
            {/* ─────────────────────────────────────── */}

            {activeStep ===
              "flowers" && (
                <div>

                  {/* Filters */}
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    <span className="text-sm font-bold text-flore-text-secondary whitespace-nowrap ml-1">
                      تصفية:
                    </span>

                    {COLOR_FILTERS.map(
                      cf => (
                        <button
                          key={
                            cf.value
                          }
                          onClick={() =>
                            setColorFilter(
                              cf.value
                            )
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 whitespace-nowrap ${colorFilter ===
                              cf.value
                              ? "border-flore-primary bg-flore-primary/10 text-flore-primary"
                              : "border-flore-border bg-flore-card text-flore-text-secondary hover:border-flore-primary/50"
                            }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/10"
                            style={{
                              background:
                                cf.color,
                            }}
                          />

                          {
                            cf.label
                          }
                        </button>
                      )
                    )}
                  </div>

                  {/* Flowers */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredFlowers.map(
                      flower => {
                        const qty =
                          selectedFlowers[
                          flower.id
                          ] || 0

                        const isSelected =
                          qty > 0

                        return (
                          <div
                            key={
                              flower.id
                            }
                            className={`group relative bg-flore-card rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isSelected
                                ? "border-flore-primary shadow-lg"
                                : "border-flore-border hover:border-flore-primary/50 hover:shadow-md"
                              }`}
                          >
                            <div className="relative h-32 bg-gradient-to-b from-flore-bg to-flore-card overflow-hidden">
                              {flower.image ? (
                                <Image
                                  src={
                                    flower.image
                                  }
                                  alt={
                                    flower.name_ar ||
                                    flower.name
                                  }
                                  fill
                                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div
                                    className="w-16 h-16 rounded-full opacity-30"
                                    style={{
                                      backgroundColor:
                                        flower.color ||
                                        "#ff6b9d",
                                    }}
                                  />
                                </div>
                              )}

                              {isSelected && (
                                <div className="absolute top-2 left-2 bg-flore-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  {qty}
                                </div>
                              )}
                            </div>

                            <div className="p-3">
                              <p className="font-bold text-sm text-flore-text-primary">
                                {flower.name_ar ||
                                  flower.name}
                              </p>

                              <p className="text-flore-primary text-sm font-bold mb-2">
                                {formatPrice(
                                  flower.price
                                )}
                              </p>

                              <div className="flex items-center justify-between bg-flore-bg rounded-xl p-1">
                                <button
                                  onClick={() =>
                                    updateFlowerQty(
                                      flower.id,
                                      1
                                    )
                                  }
                                  className="bg-flore-primary text-white w-8 h-8 rounded-lg font-bold text-lg hover:brightness-110 transition flex items-center justify-center active:scale-95"
                                >
                                  +
                                </button>

                                <span
                                  className={`font-bold text-base px-3 transition-all ${isSelected
                                      ? "text-flore-primary scale-110"
                                      : "text-flore-text-secondary"
                                    }`}
                                >
                                  {qty}
                                </span>

                                <button
                                  onClick={() =>
                                    updateFlowerQty(
                                      flower.id,
                                      -1
                                    )
                                  }
                                  disabled={
                                    qty === 0
                                  }
                                  className="bg-flore-card border border-flore-border text-flore-text-secondary w-8 h-8 rounded-lg font-bold text-lg hover:bg-flore-bg transition flex items-center justify-center disabled:opacity-30 active:scale-95"
                                >
                                  −
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>

                  {filteredFlowers.length ===
                    0 && (
                      <div className="text-center py-12 bg-flore-card rounded-2xl border border-flore-border">
                        <div className="text-4xl mb-2">
                          🔍
                        </div>

                        <p className="text-flore-text-secondary">
                          لا توجد زهور بهذا اللون
                          حالياً
                        </p>

                        <button
                          onClick={() =>
                            setColorFilter(
                              "all"
                            )
                          }
                          className="text-flore-primary font-bold mt-2 hover:underline"
                        >
                          عرض الكل
                        </button>
                      </div>
                    )}

                  {totalFlowers >
                    0 && (
                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={() =>
                            setActiveStep(
                              "greenery"
                            )
                          }
                          className="bg-flore-primary text-white px-8 py-3 rounded-xl font-bold text-base hover:brightness-110 transition shadow-lg flex items-center gap-2"
                        >
                          التالي: الأوراق الخضراء

                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                </div>
              )}

            {/* ─────────────────────────────────────── */}
            {/* GREENERY */}
            {/* ─────────────────────────────────────── */}

            {activeStep ===
              "greenery" && (
                <div className="space-y-4">
                  <p className="text-sm text-flore-text-secondary mb-3">
                    اختر الأوراق الخضراء
                    لتكمل تنسيقك (اختياري)
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {greeneries.map(
                      item => {
                        const qty =
                          selectedGreenery[
                          item.id
                          ] || 0

                        return (
                          <div
                            key={
                              item.id
                            }
                            className={`rounded-2xl border-2 overflow-hidden ${qty > 0
                                ? "border-flore-primary shadow-lg"
                                : "border-flore-border"
                              } bg-flore-card`}
                          >
                            <div className="relative h-24 bg-flore-bg">
                              {item.image ? (
                                <Image
                                  src={
                                    item.image
                                  }
                                  alt={
                                    item.name_ar ||
                                    item.name
                                  }
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl">
                                  🌿
                                </div>
                              )}
                            </div>

                            <div className="p-3">
                              <p className="font-bold text-sm text-flore-text-primary">
                                {item.name_ar ||
                                  item.name}
                              </p>

                              <p className="text-flore-primary text-sm font-bold mb-2">
                                {formatPrice(
                                  item.price
                                )}
                              </p>

                              <div className="flex items-center justify-between bg-flore-bg rounded-xl p-1">
                                <button
                                  onClick={() =>
                                    updateGreeneryQty(
                                      item.id,
                                      1
                                    )
                                  }
                                  className="bg-flore-primary text-white w-8 h-8 rounded-lg font-bold"
                                >
                                  +
                                </button>

                                <span className="font-bold px-3">
                                  {qty}
                                </span>

                                <button
                                  onClick={() =>
                                    updateGreeneryQty(
                                      item.id,
                                      -1
                                    )
                                  }
                                  disabled={
                                    qty ===
                                    0
                                  }
                                  className="bg-flore-card border border-flore-border w-8 h-8 rounded-lg font-bold disabled:opacity-30"
                                >
                                  −
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() =>
                        setActiveStep(
                          "flowers"
                        )
                      }
                      className="text-flore-text-secondary font-bold hover:text-flore-primary transition flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>

                      السابق
                    </button>

                    <button
                      onClick={() =>
                        setActiveStep(
                          "container"
                        )
                      }
                      className="bg-flore-primary text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition shadow-md"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}

            {/* ─────────────────────────────────────── */}
            {/* CONTAINER */}
            {/* ─────────────────────────────────────── */}

            {activeStep ===
              "container" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {containers.map(
                      container => {
                        const isSelected =
                          selectedContainer ===
                          container.id

                        return (
                          <button
                            key={
                              container.id
                            }
                            onClick={() =>
                              handleContainerSelect(
                                container.id
                              )
                            }
                            className={`group relative rounded-2xl border-2 p-4 transition-all duration-300 text-center ${isSelected
                                ? "border-flore-primary bg-flore-primary/5 shadow-lg"
                                : "border-flore-border bg-flore-card hover:border-flore-primary/50 hover:shadow-md"
                              }`}
                          >
                            <div className="relative w-16 h-16 mx-auto mb-2 rounded-xl overflow-hidden bg-flore-bg flex items-center justify-center">
                              {container.image ? (
                                <Image
                                  src={
                                    container.image
                                  }
                                  alt=""
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <span className="text-3xl">
                                  {
                                    CONTAINER_ICONS[
                                    container
                                      .container_type
                                    ]
                                  }
                                </span>
                              )}

                              {isSelected && (
                                <div className="absolute inset-0 bg-flore-primary/20 flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-flore-primary"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={
                                        3
                                      }
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>

                            <p className="font-bold text-sm text-flore-text-primary">
                              {container.name_ar ||
                                CONTAINER_LABELS[
                                container
                                  .container_type
                                ]}
                            </p>

                            <p className="text-xs mt-1">
                              {container.price >
                                0 ? (
                                <span className="text-flore-primary font-bold">
                                  +
                                  {formatPrice(
                                    container.price
                                  )}
                                </span>
                              ) : (
                                <span className="text-green-600 font-bold">
                                  مجاني
                                </span>
                              )}
                            </p>
                          </button>
                        )
                      }
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() =>
                        setActiveStep(
                          "greenery"
                        )
                      }
                      className="text-flore-text-secondary font-bold hover:text-flore-primary transition flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>

                      السابق
                    </button>

                    <button
                      onClick={() =>
                        setActiveStep(
                          "size"
                        )
                      }
                      className="bg-flore-primary text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition shadow-md"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}

            {/* ─────────────────────────────────────── */}
            {/* SIZE */}
            {/* ─────────────────────────────────────── */}

            {activeStep ===
              "size" && (
                <div className="space-y-4">
                  {bouquetSizes.length ===
                    0 ? (
                    <div className="bg-flore-card border border-flore-border rounded-2xl p-6 text-center">
                      <p className="text-flore-text-secondary">
                        لا توجد أحجام متاحة
                        حالياً.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {bouquetSizes.map(
                        size => {
                          const isSelected =
                            selectedSize ===
                            size.key

                          return (
                            <button
                              key={
                                size.id
                              }
                              onClick={() =>
                                handleSizeSelect(
                                  size.key
                                )
                              }
                              className={`text-right rounded-2xl border-2 p-4 transition-all ${isSelected
                                  ? "border-flore-primary bg-flore-primary/5 shadow-lg"
                                  : "border-flore-border bg-flore-card hover:border-flore-primary/50"
                                }`}
                            >
                              <p className="font-bold text-flore-text-primary mb-1">
                                {
                                  size.label_ar
                                }
                              </p>

                              <p className="text-sm text-flore-text-secondary mb-2">
                                {
                                  size.desc_ar
                                }
                              </p>

                              {size.price_multiplier >
                                1 && (
                                  <span className="text-flore-primary text-xs font-bold">
                                    ×
                                    {
                                      size.price_multiplier
                                    }
                                  </span>
                                )}
                            </button>
                          )
                        }
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() =>
                        setActiveStep(
                          "container"
                        )
                      }
                      className="text-flore-text-secondary font-bold hover:text-flore-primary transition flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7-7 7 7"
                        />
                      </svg>

                      السابق
                    </button>

                    <button
                      onClick={() =>
                        setActiveStep(
                          "message"
                        )
                      }
                      className="bg-flore-primary text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition shadow-md"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}

            {/* ─────────────────────────────────────── */}
            {/* MESSAGE */}
            {/* ─────────────────────────────────────── */}

            {activeStep ===
              "message" && (
                <div>
                  <div className="bg-flore-card rounded-2xl border border-flore-border p-6">
                    <h3 className="font-bold text-flore-text-primary mb-4 flex items-center gap-2">
                      <span>💌</span>
                      رسالة الإهداء
                    </h3>

                    <textarea
                      value={
                        giftMessage
                      }
                      onChange={e =>
                        setGiftMessage(
                          e.target
                            .value
                        )
                      }
                      placeholder="اكتب رسالتك الخاصة هنا..."
                      rows={5}
                      maxLength={200}
                      className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-4 text-flore-text-primary placeholder:text-flore-text-secondary focus:border-flore-primary focus:outline-none resize-none transition-colors text-base leading-relaxed"
                    />

                    <div className="flex justify-between items-center mt-2 gap-3">
                      <span className="text-xs text-flore-text-secondary">
                        {
                          giftMessage.length
                        }
                        /200
                      </span>

                      <div className="flex gap-2 flex-wrap justify-end">
                        {[
                          "كل عام وأنت بخير 🎉",
                          "أحبك 💕",
                          "شكراً لك 🌸",
                          "بالتوفيق ✨",
                        ].map(
                          quick => (
                            <button
                              key={
                                quick
                              }
                              onClick={() =>
                                setGiftMessage(
                                  quick
                                )
                              }
                              className="text-xs bg-flore-bg border border-flore-border rounded-lg px-3 py-1 text-flore-text-secondary hover:border-flore-primary hover:text-flore-primary transition"
                            >
                              {quick}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <button
                      onClick={() =>
                        setActiveStep(
                          "size"
                        )
                      }
                      className="text-flore-text-secondary font-bold hover:text-flore-primary transition flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>

                      السابق
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* ─────────────────────────────────────────────── */}
          {/* PREVIEW SIDEBAR */}
          {/* ─────────────────────────────────────────────── */}

          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">

              <div
                className="bg-flore-card rounded-3xl p-6 border border-flore-border shadow-luxury relative overflow-hidden"
                onMouseEnter={() =>
                  setPreviewHovered(
                    true
                  )
                }
                onMouseLeave={() =>
                  setPreviewHovered(
                    false
                  )
                }
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-flore-primary/10 to-transparent rounded-bl-full" />

                <h3 className="font-amiri text-xl font-bold text-flore-text-primary mb-4 text-center relative z-10">
                  معاينة الباقة
                </h3>

                <div className="relative mx-auto w-full max-w-[280px] aspect-[3/4] mb-4 rounded-2xl overflow-hidden bg-flore-bg/50 flex items-center justify-center">

                  {/* AI CTA */}
                  {totalFlowers >
                    0 &&
                    !aiImageUrl &&
                    !isGeneratingAi && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-flore-bg/80 backdrop-blur-sm p-4 text-center">
                        <div className="text-3xl mb-2">
                          🪄
                        </div>

                        <p className="text-flore-text-primary font-bold text-sm mb-3">
                          هل تريد رؤية شكل
                          باقتك فعلياً؟
                        </p>

                        <button
                          onClick={
                            handleGenerateAiPreview
                          }
                          disabled={
                            aiRemaining ===
                            0
                          }
                          className="bg-flore-primary text-white px-4 py-2 rounded-xl font-bold text-sm hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          توليد معاينة واقعية
                          (AI) 📸
                        </button>

                        <span className="text-xs text-flore-text-secondary mt-2">
                          {aiRemaining ===
                            null
                            ? "حتى 5 محاولات يومياً"
                            : aiRemaining >
                              0
                              ? `محاولات متبقية: ${aiRemaining}`
                              : "انتهت محاولاتك لهذا اليوم"}
                        </span>
                      </div>
                    )}

                  {/* AI Loading */}
                  {isGeneratingAi && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-flore-bg/90 backdrop-blur-sm">
                      <div className="w-12 h-12 rounded-full border-4 border-flore-primary/20 border-t-flore-primary animate-spin mb-3" />

                      <p className="text-flore-text-primary font-bold text-sm text-center px-4">
                        جاري تصميم باقتك
                        بالذكاء الاصطناعي...
                      </p>

                      <p className="text-flore-text-secondary text-xs mt-1">
                        قد يستغرق ذلك
                        15 ثانية
                      </p>
                    </div>
                  )}

                  {/* AI Image */}
                  {aiImageUrl ? (
                    <Image
                      src={
                        aiImageUrl
                      }
                      alt="معاينة الباقة بالذكاء الاصطناعي"
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-105"
                    />
                  ) : (
                    !isGeneratingAi && (
                      <>
                        {/* Container */}
                        <div
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-[55%] rounded-t-[40%] transition-all duration-500"
                          style={{
                            backgroundColor:
                              "var(--flore-gold)",
                            backgroundImage:
                              selectedContainerObj?.image
                                ? `url(${selectedContainerObj.image})`
                                : undefined,
                            backgroundSize:
                              "cover",
                            opacity:
                              0.85,
                            boxShadow:
                              "0 8px 32px rgba(0,0,0,0.1)",
                          }}
                        />

                        {/* Flowers */}
                        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[85%] h-[55%] z-10">
                          {bouquetPreviewItems.length ===
                            0 ? (
                            <div className="h-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-4xl mb-2 opacity-30">
                                  🌸
                                </div>

                                <p className="text-flore-text-secondary text-sm">
                                  اختر زهوراً
                                  لتظهر هنا
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="relative w-full h-full">
                              {bouquetPreviewItems.map(
                                (
                                  item,
                                  i
                                ) => {
                                  const position =
                                    PREVIEW_POSITIONS[
                                    i %
                                    PREVIEW_POSITIONS.length
                                    ]

                                  const scale =
                                    previewHovered
                                      ? position.scale *
                                      1.1
                                      : position.scale

                                  return (
                                    <div
                                      key={
                                        item.id
                                      }
                                      className="absolute transition-all duration-500 ease-out"
                                      style={{
                                        left: `${position.x}%`,
                                        top: `${position.y}px`,
                                        transform: `translate(-50%, 0) rotate(${position.rotation}deg) scale(${scale})`,
                                        zIndex:
                                          10 +
                                          i,
                                      }}
                                    >
                                      {item.image ? (
                                        <div
                                          className="rounded-full overflow-hidden border-2 border-white shadow-md"
                                          style={{
                                            width:
                                              item.size,
                                            height:
                                              item.size,
                                          }}
                                        >
                                          <Image
                                            src={
                                              item.image
                                            }
                                            alt=""
                                            width={
                                              item.size
                                            }
                                            height={
                                              item.size
                                            }
                                            className="object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div
                                          className="rounded-full border-2 border-white shadow-md"
                                          style={{
                                            width:
                                              item.size,
                                            height:
                                              item.size,
                                            backgroundColor:
                                              item.color,
                                          }}
                                        />
                                      )}
                                    </div>
                                  )
                                }
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )
                  )}
                </div>

                {/* Regenerate */}
                {aiImageUrl && (
                  <button
                    onClick={
                      handleGenerateAiPreview
                    }
                    disabled={
                      aiRemaining ===
                      0 ||
                      isGeneratingAi
                    }
                    className="w-full mb-3 text-sm text-flore-primary bg-flore-primary/10 py-2 rounded-lg font-bold hover:bg-flore-primary/20 transition disabled:opacity-50"
                  >
                    {aiRemaining ===
                      0
                      ? "انتهت المحاولات"
                      : "🔁 إعادة التوليد"}
                  </button>
                )}

                {/* Message Preview */}
                {giftMessage && (
                  <div className="bg-flore-bg rounded-xl p-3 mb-4 border border-flore-border">
                    <p className="text-flore-text-secondary text-sm italic leading-relaxed text-center font-amiri">
                      &quot;
                      {
                        giftMessage
                      }
                      &quot;
                    </p>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm mb-4">
                  {totalFlowers >
                    0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-flore-text-secondary">
                          الزهور (
                          {
                            totalFlowers
                          }
                          )
                        </span>

                        <span className="font-bold text-flore-text-primary">
                          {formatPrice(
                            flowersTotalPrice *
                            sizeMultiplier
                          )}
                        </span>
                      </div>
                    )}

                  {Object.keys(
                    selectedGreenery
                  ).length > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-flore-text-secondary">
                          الأوراق الخضراء
                        </span>

                        <span className="font-bold text-flore-text-primary">
                          {formatPrice(
                            greeneryTotalPrice
                          )}
                        </span>
                      </div>
                    )}

                  {selectedContainerObj && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-flore-text-secondary">
                        {
                          selectedContainerObj.name_ar
                        }
                      </span>

                      <span className="font-bold text-flore-text-primary">
                        {formatPrice(
                          selectedContainerObj.price
                        )}
                      </span>
                    </div>
                  )}

                  {sizeMultiplier >
                    1 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-flore-text-secondary">
                          حجم{" "}
                          {
                            selectedSizeObj?.label_ar
                          }
                        </span>

                        <span className="font-bold text-flore-primary">
                          ×
                          {
                            sizeMultiplier
                          }
                        </span>
                      </div>
                    )}
                </div>

                {/* Total */}
                <div className="border-t-2 border-dashed border-flore-border pt-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-flore-text-primary text-base">
                      الإجمالي
                    </span>

                    <span className="font-amiri text-3xl font-bold text-flore-primary">
                      {formatPrice(
                        totalPrice
                      )}
                    </span>
                  </div>
                </div>

                {/* Add To Cart */}
                <button
                  onClick={
                    handleAddToCart
                  }
                  disabled={
                    totalFlowers ===
                    0 ||
                    added
                  }
                  className={`w-full py-3.5 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 ${added
                      ? "bg-green-500 text-white"
                      : totalFlowers ===
                        0
                        ? "bg-flore-border text-flore-text-secondary cursor-not-allowed"
                        : "bg-flore-primary text-white hover:brightness-110 shadow-lg active:scale-[0.98]"
                    }`}
                >
                  {added ? (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={
                            2.5
                          }
                          d="M5 13l4 4L19 7"
                        />
                      </svg>

                      تمت الإضافة لهديتك
                      🌸
                    </>
                  ) : (
                    "أضف لهديتك"
                  )}
                </button>

                {/* Reset */}
                {totalFlowers >
                  0 && (
                    <button
                      onClick={
                        clearAll
                      }
                      className="w-full mt-2 text-flore-text-secondary text-sm hover:text-red-400 transition py-1"
                    >
                      إعادة التصميم من
                      البداية
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}