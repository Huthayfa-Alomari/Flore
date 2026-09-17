import { describe, expect, it } from 'vitest'
import { calculateAtelierPrice, getStemProgress } from '@/lib/atelier/pricing'

describe('atelier pricing', () => {
  it('applies the size multiplier to flowers only', () => {
    const result = calculateAtelierPrice({
      flowers: [
        { id: 'rose', price: 1.5 },
        { id: 'tulip', price: 2 },
      ],
      flowerQuantities: { rose: 10, tulip: 10 },
      greenery: [{ id: 'eucalyptus', price: 1.25 }],
      greeneryQuantities: { eucalyptus: 2 },
      container: { price: 5 },
      size: { price_multiplier: 1.5 },
    })

    expect(result.flowersBase).toBe(35)
    expect(result.flowersAdjusted).toBe(52.5)
    expect(result.greenery).toBe(2.5)
    expect(result.container).toBe(5)
    expect(result.total).toBe(60)
  })

  it('reports exact stem progress for the selected size', () => {
    expect(getStemProgress({ a: 12, b: 8 }, { stem_count: 20 })).toEqual({
      selected: 20,
      target: 20,
      remaining: 0,
      excess: 0,
      complete: true,
    })
  })

  it('detects incomplete and excessive bouquets', () => {
    expect(getStemProgress({ a: 18 }, { stem_count: 20 }).remaining).toBe(2)
    expect(getStemProgress({ a: 22 }, { stem_count: 20 }).excess).toBe(2)
  })
})
