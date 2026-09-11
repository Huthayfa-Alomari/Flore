import {
  calculateBouquetUnitPrice,
  hasConflictingContainerIds,
  resolveBouquetContainerId,
} from '@/lib/atelier/pricing'

describe('Atelier bouquet pricing', () => {
  const catalog = {
    flowerPrices: new Map([
      ['rose', 2.5],
      ['lily', 4],
    ]),
    greeneryPrices: new Map([['eucalyptus', 1.25]]),
    containerPrices: new Map([
      ['wrap', 3],
      ['vase', 8],
    ]),
    sizeMultipliers: new Map([['deluxe', 1.5]]),
  }

  it('applies the size multiplier to flowers only', () => {
    expect(
      calculateBouquetUnitPrice(
        {
          flowers: [
            { id: 'rose', qty: 4 },
            { id: 'lily', qty: 2 },
          ],
          greenery: [{ id: 'eucalyptus', qty: 2 }],
          containerId: 'vase',
          sizeKey: 'deluxe',
        },
        catalog
      )
    ).toBe(37.5)
  })

  it('keeps legacy wrap and vase ids compatible', () => {
    expect(resolveBouquetContainerId({ wrapId: 'wrap' })).toBe('wrap')
    expect(resolveBouquetContainerId({ vaseId: 'vase' })).toBe('vase')
  })

  it('detects different container ids in the same payload', () => {
    expect(
      hasConflictingContainerIds({ containerId: 'vase', wrapId: 'wrap' })
    ).toBe(true)
    expect(
      hasConflictingContainerIds({ containerId: 'vase', vaseId: 'vase' })
    ).toBe(false)
  })
})
