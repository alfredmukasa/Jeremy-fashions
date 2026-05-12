import type { ProductAttributes, ProductKind } from '../types'

export const APPAREL_SIZE_PRESETS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export const FOOTWEAR_SIZE_PRESETS = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'] as const
export const ACCESSORY_SIZE_PRESETS = ['One Size'] as const

const FOOTWEAR_SLUGS = new Set(['sneakers', 'shoes', 'footwear'])
const ACCESSORY_SLUGS = new Set(['accessories', 'bags', 'belts', 'hats'])

export function resolveProductKind(slug: string, explicit?: string | null): ProductKind {
  if (explicit === 'apparel' || explicit === 'footwear' || explicit === 'accessories') {
    return explicit
  }
  const normalized = slug.trim().toLowerCase()
  if (FOOTWEAR_SLUGS.has(normalized)) return 'footwear'
  if (ACCESSORY_SLUGS.has(normalized)) return 'accessories'
  return 'apparel'
}

export function sizePresetsForKind(kind: ProductKind): readonly string[] {
  if (kind === 'footwear') return FOOTWEAR_SIZE_PRESETS
  if (kind === 'accessories') return ACCESSORY_SIZE_PRESETS
  return APPAREL_SIZE_PRESETS
}

export function defaultSizesForKind(kind: ProductKind): string[] {
  return [...sizePresetsForKind(kind)]
}

export function sizeLabelForKind(kind: ProductKind): string {
  if (kind === 'footwear') return 'Shoe size (US)'
  if (kind === 'accessories') return 'Size'
  return 'Apparel size'
}

export function emptyAttributesForKind(kind: ProductKind): ProductAttributes {
  if (kind === 'footwear') {
    return {
      material: '',
      upperMaterial: '',
      outsole: '',
      width: '',
      heelHeight: '',
      closure: '',
      care: '',
    }
  }
  if (kind === 'accessories') {
    return {
      material: '',
      dimensions: '',
      closure: '',
      care: '',
    }
  }
  return {
    material: '',
    fabric: '',
    fit: '',
    lining: '',
    care: '',
  }
}

export function attributeFieldsForKind(kind: ProductKind): { key: keyof ProductAttributes; label: string }[] {
  if (kind === 'footwear') {
    return [
      { key: 'upperMaterial', label: 'Upper material' },
      { key: 'material', label: 'Material' },
      { key: 'outsole', label: 'Outsole' },
      { key: 'width', label: 'Width' },
      { key: 'heelHeight', label: 'Heel height' },
      { key: 'closure', label: 'Closure' },
      { key: 'care', label: 'Care' },
    ]
  }
  if (kind === 'accessories') {
    return [
      { key: 'material', label: 'Material' },
      { key: 'dimensions', label: 'Dimensions' },
      { key: 'closure', label: 'Closure' },
      { key: 'care', label: 'Care' },
    ]
  }
  return [
    { key: 'fabric', label: 'Fabric' },
    { key: 'material', label: 'Material' },
    { key: 'fit', label: 'Fit' },
    { key: 'lining', label: 'Lining' },
    { key: 'care', label: 'Care' },
  ]
}
