import { normalizePaymentStatus, type PaymentStatus } from '../lib/paymentStatus'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type CustomerOrder = {
  id: string
  createdAt: string
  status: string
  paymentStatus: PaymentStatus
  totalAmount: number
  currency: string
}

export type CustomerOrderLineItem = {
  id: string
  productId: string | null
  title: string
  quantity: number
  unitPrice: number
  sku: string | null
  imageUrl: string | null
}

export type CustomerOrderAddress = {
  fullName: string
  line1: string
  line2?: string
  city: string
  region: string
  postalCode: string
  country: string
}

export type CustomerOrderDetail = CustomerOrder & {
  shippingAddress: CustomerOrderAddress | null
  paymentMethod: string
  stripePaymentIntentId: string | null
  paidAt: string | null
  items: CustomerOrderLineItem[]
}

type OrderRow = {
  id: string
  created_at: string
  status: string
  payment_status: string
  total_amount: number | string
  currency: string
  shipping_address: unknown
  stripe_payment_intent_id: string | null
  payment_metadata: Record<string, unknown> | null
  order_items: OrderItemRow[] | null
}

type OrderItemRow = {
  id: string
  product_id: string | null
  title: string
  quantity: number
  unit_price: number | string
  sku: string | null
  products:
    | {
        image_url: string | null
        gallery_images: string[] | null
      }
    | {
        image_url: string | null
        gallery_images: string[] | null
      }[]
    | null
}

function mapOrder(row: Pick<OrderRow, 'id' | 'created_at' | 'status' | 'payment_status' | 'total_amount' | 'currency'>): CustomerOrder {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    paymentStatus: normalizePaymentStatus(row.payment_status),
    totalAmount: Number(row.total_amount),
    currency: row.currency,
  }
}

function parseAddress(raw: unknown): CustomerOrderAddress | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const fullName =
    typeof value.fullName === 'string'
      ? value.fullName
      : typeof value.full_name === 'string'
        ? value.full_name
        : ''
  const line1 = typeof value.line1 === 'string' ? value.line1 : ''
  const city = typeof value.city === 'string' ? value.city : ''
  const region = typeof value.region === 'string' ? value.region : ''
  const postalCode =
    typeof value.postalCode === 'string'
      ? value.postalCode
      : typeof value.postal_code === 'string'
        ? value.postal_code
        : ''
  const country = typeof value.country === 'string' ? value.country : ''
  if (!fullName && !line1) return null
  return {
    fullName,
    line1,
    line2: typeof value.line2 === 'string' ? value.line2 : undefined,
    city,
    region,
    postalCode,
    country,
  }
}

function lineImage(row: OrderItemRow): string | null {
  const product = Array.isArray(row.products) ? row.products[0] : row.products
  const gallery = product?.gallery_images
  if (Array.isArray(gallery) && gallery[0]) return gallery[0]
  if (product?.image_url) return product.image_url
  return null
}

function paymentMethodLabel(paymentStatus: PaymentStatus, stripePaymentIntentId: string | null): string {
  if (paymentStatus === 'paid' || paymentStatus === 'processing' || stripePaymentIntentId) return 'Card'
  if (paymentStatus === 'refunded' || paymentStatus === 'partial_refund') return 'Refunded'
  if (paymentStatus === 'failed') return 'Failed'
  return 'Pending'
}

function readPaidAt(metadata: Record<string, unknown> | null): string | null {
  const paidAt = metadata?.paid_at
  return typeof paidAt === 'string' ? paidAt : null
}

function mapOrderDetail(row: OrderRow): CustomerOrderDetail {
  const base = mapOrder(row)
  return {
    ...base,
    shippingAddress: parseAddress(row.shipping_address),
    paymentMethod: paymentMethodLabel(base.paymentStatus, row.stripe_payment_intent_id),
    stripePaymentIntentId: row.stripe_payment_intent_id,
    paidAt: readPaidAt(row.payment_metadata),
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      title: item.title,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      sku: item.sku,
      imageUrl: lineImage(item),
    })),
  }
}

async function requireCurrentUserId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Sign in to view your orders.')
  }

  return user.id
}

export async function listCustomerOrders(): Promise<CustomerOrder[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const userId = await requireCurrentUserId()

  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, status, payment_status, total_amount, currency')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapOrder(row as OrderRow))
}

export async function listCustomerOrdersDetailed(): Promise<CustomerOrderDetail[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const userId = await requireCurrentUserId()

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      created_at,
      status,
      payment_status,
      total_amount,
      currency,
      shipping_address,
      stripe_payment_intent_id,
      payment_metadata,
      order_items (
        id,
        product_id,
        title,
        quantity,
        unit_price,
        sku,
        products (
          image_url,
          gallery_images
        )
      )
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapOrderDetail(row as unknown as OrderRow))
}

export async function getCustomerOrderPaymentStatus(orderId: string): Promise<{
  paymentStatus: PaymentStatus
  status: string
} | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const userId = await requireCurrentUserId()
  const { data, error } = await supabase
    .from('orders')
    .select('payment_status, status')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    paymentStatus: normalizePaymentStatus(data.payment_status),
    status: data.status,
  }
}
