import cors from 'cors'
import express from 'express'

import { config } from './config.js'
import { paymentsRouter } from './routes/payments.js'
import { webhooksRouter } from './routes/webhooks.js'

const app = express()

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  }),
)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)
app.use(express.json())
app.use('/api/payments', paymentsRouter)

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error', error)
  res.status(500).json({ error: 'Unexpected server error.' })
})

app.listen(config.port, () => {
  console.log(`Payment API listening on http://localhost:${config.port}`)
})
