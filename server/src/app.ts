import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import { config } from './config.js'
import { ordersRouter } from './routes/orders.js'
import { paymentsRouter } from './routes/payments.js'
import { renderSocialPreviewHtml, socialPreviewRouter } from './routes/socialPreview.js'
import { webhooksRouter } from './routes/webhooks.js'

const app = express()

app.set('trust proxy', 1) // behind Vercel's proxy — needed for express-rate-limit to key by real client IP

// Modest budget for the bot-prerender path: each hit does a DB read, and legitimate
// crawler traffic for a small catalog is nowhere near this ceiling.
const socialPreviewLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

// Vercel's `has: user-agent` rewrite in vercel.json sends known social/search bot
// requests here for *any* storefront path (home, product, shop, …) by appending
// `?social-preview-path=<original path>` to the same `/api/server` function this whole
// app is deployed as. Intercepting by query param — rather than by Express route path —
// means this works regardless of which URL a bot actually requested, and real browser
// traffic (which never carries this query param) is completely unaffected and falls
// through to `next()` immediately below.
app.use((req, res, next) => {
  const previewPath = req.query['social-preview-path']
  if (typeof previewPath !== 'string') return next()

  socialPreviewLimiter(req, res, () => {
    renderSocialPreviewHtml(previewPath)
      .then((html) => {
        res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400')
        res.type('html').send(html)
      })
      .catch((error: unknown) => {
        console.error('[socialPreview] middleware failed', error)
        res.status(500).type('html').send('<!doctype html><title>KREWNOX</title>')
      })
  })
})

app.use(helmet())
app.use(compression())
app.use(
  cors({
    origin: config.clientOrigins,
    credentials: true,
  }),
)

// General ceiling so no single client (or a burst under load) can monopolize the
// payment API. Generous enough for normal shopping; tight enough to blunt abuse.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
})

// Payment-intent creation hits Stripe + the DB per call and is the most expensive/
// abuse-sensitive route — a tighter budget than the general API limiter.
const paymentsLimiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkout attempts. Please wait a moment and try again.' },
})

// Guest order-status lookup is keyed only by order id + email with no session — rate
// limit it so it can't be used to brute-force/enumerate emails against an order id.
const orderLookupLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)
app.use(express.json())
app.use('/api', apiLimiter)
app.use('/api/payments/create-payment-intent', paymentsLimiter)
app.use('/api/orders/:id/status', orderLookupLimiter)
app.use('/api/payments', paymentsRouter)
app.use('/api/orders', ordersRouter)
// Bot-only prerendered HTML for social-crawler Open Graph tags — see socialPreview.ts
// and the matching `has: user-agent` rewrite in vercel.json.
app.use('/api/social-preview', socialPreviewRouter)

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error', error)
  res.status(500).json({ error: 'Unexpected server error.' })
})

export default app
