export type Gender = 'men' | 'women' | 'unisex'

export type ProductColor = {
  name: string
  hex: string
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  category: string
  gender: Gender
  sizes: string[]
  colors: ProductColor[]
  price: number
  salePrice?: number
  rating: number
  images: string[]
  stock: number
  tags: string[]
}

export type Review = {
  id: string
  productId: string
  author: string
  rating: number
  date: string
  title: string
  body: string
  verified: boolean
}

export type CartLine = {
  key: string
  productId: string
  size: string
  colorName: string
  quantity: number
}

export type MockAddress = {
  id: string
  label: string
  line1: string
  line2?: string
  city: string
  region: string
  postal: string
  country: string
}

export type MockOrder = {
  id: string
  date: string
  status: 'delivered' | 'processing' | 'shipped'
  total: number
  items: number
  thumbnail: string
}

export type MockUser = {
  id: string
  name: string
  email: string
  phone: string
}
