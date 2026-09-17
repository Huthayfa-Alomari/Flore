import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CartItem } from '@/lib/store/cart-store'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency: string = 'JOD'): string {
  const safePrice = Number.isFinite(Number(price)) ? Number(price) : 0
  const formattedVal = safePrice.toFixed(2)
  const displayCurrency = currency === 'JOD' ? 'د.أ' : currency
  return `${formattedVal} ${displayCurrency}`
}

export function generateWhatsAppMessage(items: CartItem[], total: number): string {
  let message = `طلب جديد من FLORÉ\n\n`

  items.forEach((item, index) => {
    message += `${index + 1}. ${item.product.name}\n`
    message += `   الكمية: ${item.quantity}\n`
    message += `   السعر: ${formatPrice(item.product.price * item.quantity)}\n`

    if (item.customization) {
      if (item.customization.flowers?.length) {
        message += `   الزهور: ${item.customization.flowers.join('، ')}\n`
      }
      if (item.customization.greenery?.length) {
        message += `   اللمسات الخضراء: ${item.customization.greenery.join('، ')}\n`
      }
      if (item.customization.container) {
        message += `   التقديم: ${item.customization.container}\n`
      } else {
        if (item.customization.wrap) message += `   التغليف: ${item.customization.wrap}\n`
        if (item.customization.vase) message += `   المزهرية: ${item.customization.vase}\n`
      }
      if (item.customization.message) message += `   كرت الإهداء: "${item.customization.message}"\n`
    }
    message += `---------------------------\n`
  })

  message += `\nالإجمالي الكلي: ${formatPrice(total)}`
  message += `\n\nيرجى تأكيد الطلب مع فريق FLORÉ.`
  return message
}

export const categories = [
  { id: 'all', label: 'الكل' },
  { id: 'bouquets', label: 'باقات زهور' },
  { id: 'preserved', label: 'زهور محفوظة' },
  { id: 'vases', label: 'مزهريات' },
  { id: 'chocolates', label: 'شوكولاتة' },
  { id: 'custom', label: 'تنسيق خاص' },
  { id: 'accessories', label: 'إكسسوارات' },
  { id: 'plants', label: 'نباتات' },
] as const

export const orderStatuses = [
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-gray-100 text-gray-800' },
  { value: 'received', label: 'تم الاستلام', color: 'bg-blue-100 text-blue-800' },
  { value: 'arranging', label: 'جاري التنسيق', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'scenting', label: 'تعطير الباقة', color: 'bg-pink-100 text-pink-800' },
  { value: 'sealing', label: 'تثبيت العطر والتغليف', color: 'bg-purple-100 text-purple-800' },
  { value: 'departed', label: 'خرجت للتوصيل', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'en_route', label: 'في الطريق', color: 'bg-orange-100 text-orange-800' },
  { value: 'nearby', label: 'بالقرب من الموقع', color: 'bg-teal-100 text-teal-800' },
  { value: 'arrived', label: 'وصل الموقع', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'delivered', label: 'تم التسليم', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-red-100 text-red-800' },
] as const

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function sanitizeCSV(value: string): string {
  const dangerous = ['=', '+', '-', '@', '\t', '\r', '\n']
  if (dangerous.some(char => value.startsWith(char))) return "'" + value
  return value
}

export function generateCSV(rows: string[][]): string {
  return rows
    .map(row => row.map(cell => `"${sanitizeCSV(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
