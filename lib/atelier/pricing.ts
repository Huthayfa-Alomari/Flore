import type { AtelierContainer, BouquetSize, Flower, Greenery, QuantityMap } from './types'

type Priceable = { id: string; price: number }

export type AtelierPriceBreakdown = {
  flowersBase: number
  sizeMultiplier: number
  flowersAdjusted: number
  greenery: number
  container: number
  total: number
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function sumSelected(items: Priceable[], quantities: QuantityMap) {
  const prices = new Map(items.map(item => [item.id, Number(item.price) || 0]))
  return Object.entries(quantities).reduce((sum, [id, qty]) => {
    return sum + (prices.get(id) || 0) * Math.max(0, Number(qty) || 0)
  }, 0)
}

export function countSelectedStems(quantities: QuantityMap) {
  return Object.values(quantities).reduce((sum, qty) => sum + Math.max(0, Number(qty) || 0), 0)
}

export function calculateAtelierPrice(input: {
  flowers: Pick<Flower, 'id' | 'price'>[]
  flowerQuantities: QuantityMap
  greenery: Pick<Greenery, 'id' | 'price'>[]
  greeneryQuantities: QuantityMap
  container?: Pick<AtelierContainer, 'price'> | null
  size?: Pick<BouquetSize, 'price_multiplier'> | null
}): AtelierPriceBreakdown {
  const flowersBase = sumSelected(input.flowers, input.flowerQuantities)
  const greenery = sumSelected(input.greenery, input.greeneryQuantities)
  const sizeMultiplier = Math.max(1, Number(input.size?.price_multiplier) || 1)
  const flowersAdjusted = flowersBase * sizeMultiplier
  const container = Number(input.container?.price) || 0

  return {
    flowersBase: roundMoney(flowersBase),
    sizeMultiplier,
    flowersAdjusted: roundMoney(flowersAdjusted),
    greenery: roundMoney(greenery),
    container: roundMoney(container),
    total: roundMoney(flowersAdjusted + greenery + container),
  }
}

export function getStemProgress(quantities: QuantityMap, size?: Pick<BouquetSize, 'stem_count'> | null) {
  const selected = countSelectedStems(quantities)
  const target = Math.max(0, Number(size?.stem_count) || 0)
  return {
    selected,
    target,
    remaining: Math.max(0, target - selected),
    excess: Math.max(0, selected - target),
    complete: target > 0 && selected === target,
  }
}

export function canIncreaseStem(quantities: QuantityMap, size?: Pick<BouquetSize, 'stem_count'> | null) {
  const { selected, target } = getStemProgress(quantities, size)
  return target === 0 || selected < target
}
