import { formatPrice, formatDate, generateWhatsAppMessage, debounce } from '@/lib/utils'

describe('Utils', () => {
  describe('formatPrice', () => {
    it('formats price in JOD correctly', () => {
      const result = formatPrice(45.00, 'JOD')
      expect(result).toContain('45')
      expect(result).toContain('د.أ')
    })
  })

  describe('formatDate', () => {
    it('formats date in Arabic', () => {
      const result = formatDate('2026-01-15')
      expect(result).toBeTruthy()
    })
  })

  describe('generateWhatsAppMessage', () => {
    it('generates proper WhatsApp message', () => {
      const items = [{
        product: {
          id: '1',
          name: 'وردة',
          name_en: null,
          category: 'bouquets' as const,
          price: 45,
          currency: 'JOD',
          image: '',
          images: [],
          description: null,
          description_en: null,
          badge: null,
          badge_color: null,
          in_stock: true,
          model_url: null,
          ar_enabled: false,
          created_at: '',
          updated_at: '',
        },
        quantity: 2,
      }]

      const message = generateWhatsAppMessage(items, 90)
      expect(message).toContain('وردة')
      expect(message).toContain('90')
    })
  })

  describe('debounce', () => {
    it('delays function execution', () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('test')
      expect(mockFn).not.toHaveBeenCalled()

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockFn).toHaveBeenCalledWith('test')
          resolve()
        }, 150)
      })
    })
  })
})