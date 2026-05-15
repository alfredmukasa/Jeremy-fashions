export type Gender = 'men' | 'women' | 'unisex'

export type ProductKind = 'apparel' | 'footwear' | 'accessories'

export type ProductColor = {
  name: string
  hex: string
}

export type ProductAttributes = {
  material?: string
  upperMaterial?: string
  outsole?: string
  width?: string
  heelHeight?: string
  closure?: string
  fit?: string
  fabric?: string
  lining?: string
  dimensions?: string
  care?: string
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  category: string
  productKind: ProductKind
  gender: Gender
  sizes: string[]
  colors: ProductColor[]
  attributes: ProductAttributes
  price: number
  salePrice?: number
  rating: number
  images: string[]
  stock: number
  tags: string[]
  featured?: boolean
  brand?: string
  sku?: string
}

export type Category = {
  id: string
  slug: string
  name: string
  description?: string
  imageUrl?: string
  productKind: ProductKind
}

export type WaitlistEntry = {
  fullName: string
  email: string
  phone?: string
  instagram?: string
  interestedProductId?: string
}

export type CartLineSnapshot = {
  name: string
  slug: string
  image: string
  unitPrice: number
  category?: string
}

export type ShippingAddress = {
  id: string
  createdAt: string
  updatedAt: string
  label?: string | null
  fullName: string
  line1: string
  line2?: string
  city: string
  region: string
  postalCode: string
  country: string
  isDefault: boolean
}

export type ShippingAddressInput = {
  label?: string
  fullName: string
  line1: string
  line2?: string
  city: string
  region: string
  postalCode: string
  country: string
  isDefault?: boolean
}

export type CartLine = {
  key: string
  productId: string
  size: string
  colorName: string
  quantity: number
  /**
   * Persisted snapshot of the product at add-to-cart time. Keeping the
   * essentials on the line itself means the cart UI never has to re-fetch
   * the catalog and remains stable if a product is later disabled or
   * removed in the database.
   */
  snapshot: CartLineSnapshot
}
