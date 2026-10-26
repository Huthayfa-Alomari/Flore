import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/orders/create/route'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// محاكاة حزم الاتصال بقاعدة البيانات لمنع الاتصال الفعلي أثناء الفحص
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/service')

describe('POST /api/orders/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // الاختبار الأول: حماية السيرفر من تلاعب العميل بالأسعار
  it('rejects tampered client prices and uses server-computed total', async () => {
    const mockProducts = [
      { id: '11111111-1111-1111-1111-111111111111', price: 50.0, in_stock: true, name: 'Red Roses' },
      { id: '22222222-2222-2222-2222-222222222222', price: 30.0, in_stock: true, name: 'Lilies' },
    ]

    const mockSupabase = {
      auth: { 
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) 
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
          }
        }
        if (table === 'orders') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'order-1' }, error: null }),
          }
        }
        return {}
      }),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    const request = new Request('http://localhost/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { product_id: '11111111-1111-1111-1111-111111111111', qty: 2, price: 10.0 }, // العميل يحاول تزييف السعر لـ 10 دنانير
          { product_id: '22222222-2222-2222-2222-222222222222', qty: 1, price: 5.0 },
        ],
        customer_name: 'Zaid Al-Ahmad',
        customer_phone: '+962791234567',
        delivery_address: 'Abdoun, Amman',
        payment_method: 'cash',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    // الحسبة الصحيحة على السيرفر: (50 * 2) + (30 * 1) = 130 ديناراً، وتجاهل قيم العميل تماماً
    expect(data.total).toBe(130.0)
    expect(data.orderId).toBe('order-1')
  })

  // الاختبار الثاني: رفض إتمام الطلب إذا كانت الباقات الفاخرة غير متوفرة في الأتيليه
  it('rejects out-of-stock products', async () => {
    const mockProducts = [
      { id: '11111111-1111-1111-1111-111111111111', price: 75.0, in_stock: false, name: 'Luxury Orchid' }, // نفدت من المخزن
    ]

    const mockSupabase = {
      auth: { 
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) 
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
          }
        }
        return {}
      }),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    const request = new Request('http://localhost/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ product_id: '11111111-1111-1111-1111-111111111111', qty: 1 }],
        customer_name: 'Rania Awad',
        customer_phone: '+962787654321',
        delivery_address: 'Dabouq, Amman',
        payment_method: 'cash',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    // يجب أن يعيد الخادم خطأ عدم توفر (400 Bad Request أو 422 Unprocessable Entity)
    expect(response.status).toBe(400)
    expect(data.error).toContain('out of stock')
  })

  // الاختبار الثالث: السماح صراحةً بطلبات الضيوف (Guest Checkout) — ميزة أساسية مقصودة
  // في المشروع (الدفع عبر واتساب/CliQ/كاش لا يتطلب تسجيل دخول)، مع التأكد أن الطلب
  // يُسجَّل بـ user_id = null وليس مربوطًا بأي حساب.
  it('allows guest (unauthenticated) checkout and stores user_id as null', async () => {
    const mockProducts = [
      { id: '11111111-1111-1111-1111-111111111111', price: 20.0, in_stock: true, name: 'Sunflowers', image: '/sunflowers.jpg' },
    ]

    let insertedOrder: any = null

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
          }
        }
        return {}
      }),
    }

    const mockServiceClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            insert: vi.fn().mockImplementation((data: any) => {
              insertedOrder = data
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'order-guest-1' }, error: null }),
              }
            }),
          }
        }
        return {}
      }),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = new Request('http://localhost/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ product_id: '11111111-1111-1111-1111-111111111111', qty: 1 }],
        customer_name: 'Guest User',
        customer_phone: '+962790000000',
        delivery_address: 'Zarqa, Jordan',
        payment_method: 'cash',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.orderId).toBe('order-guest-1')
    expect(insertedOrder.user_id).toBeNull()
  })
})