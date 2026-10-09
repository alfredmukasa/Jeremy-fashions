import app from '../server/dist/app.js'

// Stripe verifies the webhook against the raw body. Vercel must not parse it first.
export const config = {
  api: {
    bodyParser: false,
  },
}

export default app
