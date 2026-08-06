import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import { config } from './config.js'
import { ordersRouter } from './routes/orders.js'
import { paymentsRouter } from './routes/payments.js'
import { webhooksRouter } from './routes/webhooks.js'

const app = express()

app.set('trust proxy', 1) // behind Vercel's proxy — needed for express-rate-limit to key by real client IP

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

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error', error)
  res.status(500).json({ error: 'Unexpected server error.' })
})

export default app
