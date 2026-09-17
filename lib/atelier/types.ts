export type ContainerType = 'basket' | 'glass_vase' | 'vase' | 'wrap' | 'luxury_box'

export type Flower = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  color: string | null
  color_family?: string | null
  in_stock: boolean
}

export type Greenery = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  in_stock: boolean
}

export type AtelierContainer = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  in_stock: boolean
  container_type: ContainerType
}

export type BouquetSize = {
  id: string
  key: string
  label_ar: string
  desc_ar: string | null
  stem_count: number
  price_multiplier: number
}

export type AtelierStep = 'size' | 'flowers' | 'greenery' | 'container' | 'message'

export type QuantityMap = Record<string, number>

export type BouquetSelection = {
  flowers: Array<{ id: string; qty: number }>
  greenery: Array<{ id: string; qty: number }>
  containerId: string | null
  sizeKey: string
}

export const CONTAINER_LABELS: Record<ContainerType, string> = {
  basket: 'سلة',
  glass_vase: 'مزهرية زجاجية',
  vase: 'مزهرية',
  wrap: 'تغليف',
  luxury_box: 'صندوق فاخر',
}

export function normalizeContainerType(value: string | null | undefined): ContainerType {
  if (
    value === 'basket' ||
    value === 'glass_vase' ||
    value === 'vase' ||
    value === 'wrap' ||
    value === 'luxury_box'
  ) {
    return value
  }
  return 'vase'
}

export function toSelectionEntries(quantities: QuantityMap) {
  return Object.entries(quantities)
    .filter(([, qty]) => Number.isFinite(qty) && qty > 0)
    .map(([id, qty]) => ({ id, qty }))
}
