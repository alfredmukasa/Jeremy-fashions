import type { NextFunction, Response } from 'express'

import type { AuthedRequest } from './auth.js'
import type { CheckoutAddress, CreatePaymentIntentBody } from '../types.js'
import { CheckoutError } from '../services/orderService.js'

export function validateCreatePaymentIntent(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = req.body as Partial<CreatePaymentIntentBody>
    const idempotencyKey = body.idempotencyKey?.trim()
    const email = body.email?.trim().toLowerCase()
    const items = body.items

    if (!idempotencyKey || idempotencyKey.length < 8) {
      throw new CheckoutError('A valid checkout idempotency key is required.', 400)
    }

    if (!email || !email.includes('@')) {
      throw new CheckoutError('A valid email address is required.', 400)
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new CheckoutError('At least one cart item is required.', 400)
    }

    const shippingAddress = parseAddress(body.shippingAddress, 'shipping')
    const billingAddress = body.billingSameAsShipping
      ? shippingAddress
      : parseAddress(body.billingAddress, 'billing')

    req.body = {
      idempotencyKey,
      email,
      currency: body.currency?.trim().toUpperCase() || 'USD',
      items: items.map((item) => ({
        productId: String(item.productId ?? '').trim(),
        title: String(item.title ?? '').trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        size: String(item.size ?? '').trim(),
        colorName: String(item.colorName ?? '').trim(),
        sku: item.sku ? String(item.sku).trim() : undefined,
      })),
      shippingAddress,
      billingAddress,
      billingSameAsShipping: Boolean(body.billingSameAsShipping),
    } satisfies CreatePaymentIntentBody

    return next()
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ error: error.message })
    }
    return res.status(400).json({ error: 'Invalid checkout payload.' })
  }
}

function parseAddress(value: CheckoutAddress | undefined, label: string): CheckoutAddress {
  const fullName = value?.fullName?.trim()
  const line1 = value?.line1?.trim()
  const city = value?.city?.trim()
  const region = value?.region?.trim()
  const postalCode = value?.postalCode?.trim()
  const country = value?.country?.trim()

  if (!fullName || !line1 || !city || !region || !postalCode || !country) {
    throw new CheckoutError(`Complete ${label} address details are required.`, 400)
  }

  return {
    fullName,
    line1,
    line2: value?.line2?.trim() || undefined,
    city,
    region,
    postalCode,
    country,
  }
}
