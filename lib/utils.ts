import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CartItem } from '@/lib/store/cart-store';

// 1. دالة دمج كلاسات Tailwind (ضرورية جداً للمكونات)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 2. دالة تنسيق الأسعار
export function formatPrice(price: number, currency: string = 'JOD'): string {
  const formattedVal = price.toFixed(2);
  const displayCurrency = currency === 'JOD' ? 'د.أ' : currency;
  return `${formattedVal} ${displayCurrency}`;
}

// 3. دالة توليد رسالة الواتساب
export function generateWhatsAppMessage(items: CartItem[], total: number): string {
  let message = `🌸 *طلب جديد من متجر Floré* 🌸\n\n`;

  items.forEach((item, index) => {
    message += `${index + 1}. *${item.product.name}*\n`;
    message += `   الكمية: ${item.quantity}\n`;
    message += `   السعر: ${formatPrice(item.product.price * item.quantity)}\n`;

    if (item.customization) {
      if (item.customization.wrap) message += `   التغليف: ${item.customization.wrap}\n`;
      if (item.customization.vase) message += `   المزهرية: ${item.customization.vase}\n`;
      if (item.customization.message) message += `   كرت الإهداء: "${item.customization.message}"\n`;
    }
    message += `---------------------------\n`;
  });

  message += `\n💰 *الإجمالي الكلي:* ${formatPrice(total)}`;
  message += `\n\nشكراً لاختياركم فلوري، يرجى إرسال هذه الرسالة لتأكيد الطلب وبدء التنسيق الفاخر ونقش العطر الدائم ✨.`;

  return message;
}

// 4. فئات المنتجات المعتمدة (مع التوافق مع الكتالوج)
export const categories = [
  { id: 'all', label: 'الكل' },
  { id: 'bouquets', label: 'باقات زهور' },
  { id: 'preserved', label: 'زهور محفوظة' },
  { id: 'vases', label: 'مزهريات' },
  { id: 'chocolates', label: 'شوكولاتة' },
  { id: 'custom', label: 'تنسيق خاص' }
] as const;

// 5. حالات الطلب الفاخرة مع الألوان والتوطين باللغة العربية
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
  { value: 'cancelled', label: 'ملغي', color: 'bg-red-100 text-red-800' }
] as const;

// 6. دالة تنسيق التاريخ للغة العربية الفصحى
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 7. دالة تقييد الأحداث المتكررة عالية التردد (Debounce)
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}


// CSV Injection Protection (Phase 4 Security)
export function sanitizeCSV(value: string): string {
  const dangerous = ['=', '+', '-', '@', '\t', '\r', '\n']
  if (dangerous.some(char => value.startsWith(char))) {
    return "'" + value
  }
  return value
}

export function generateCSV(rows: string[][]): string {
  return rows
    .map(row => row.map(cell => `"${sanitizeCSV(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
