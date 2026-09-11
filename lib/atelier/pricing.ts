export type QuantitySelection = {
  id: string
  qty: number
}

export type BouquetContainerSelection = {
  containerId?: string | null
  wrapId?: string | null
  vaseId?: string | null
}

export type BouquetPriceSelection = BouquetContainerSelection & {
  flowers: QuantitySelection[]
  greenery?: QuantitySelection[]
  sizeKey?: string | null
}

export type BouquetPriceCatalog = {
  flowerPrices: ReadonlyMap<string, number>
  greeneryPrices: ReadonlyMap<string, number>
  containerPrices: ReadonlyMap<string, number>
  sizeMultipliers: ReadonlyMap<string, number>
}

export function resolveBouquetContainerId(
  selection: BouquetContainerSelection
) {
  return selection.containerId || selection.vaseId || selection.wrapId || null
}

export function hasConflictingContainerIds(
  selection: BouquetContainerSelection
) {
  const ids = [
    selection.containerId,
    selection.vaseId,
    selection.wrapId,
  ].filter((value): value is string => Boolean(value))

  return new Set(ids).size > 1
}

export function calculateBouquetUnitPrice(
  selection: BouquetPriceSelection,
  catalog: BouquetPriceCatalog
) {
  const price = (value: number | undefined) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const flowersPrice = selection.flowers.reduce(
    (sum, flower) =>
      sum + price(catalog.flowerPrices.get(flower.id)) * flower.qty,
    0
  )
  const greeneryPrice = (selection.greenery || []).reduce(
    (sum, greenery) =>
      sum + price(catalog.greeneryPrices.get(greenery.id)) * greenery.qty,
    0
  )
  const containerId = resolveBouquetContainerId(selection)
  const containerPrice = containerId
    ? price(catalog.containerPrices.get(containerId))
    : 0
  const configuredMultiplier = selection.sizeKey
    ? price(catalog.sizeMultipliers.get(selection.sizeKey))
    : 1
  const multiplier = configuredMultiplier > 0 ? configuredMultiplier : 1

  // Size describes the amount of flowers. Greenery and the physical container
  // are fixed-price additions and must not be multiplied a second time.
  return (
    Math.round(
      (flowersPrice * multiplier + greeneryPrice + containerPrice) * 100
    ) / 100
  )
}
