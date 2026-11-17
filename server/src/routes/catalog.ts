import { Router } from 'express'

import { isD1Configured } from '../lib/d1.js'
import { readPublicCatalog } from '../services/publicCatalog.js'

export const catalogRouter = Router()

catalogRouter.get('/catalog', async (_req, res) => {
  if (!isD1Configured()) {
    res.status(503).json({ error: 'Catalog database is not configured.' })
    return
  }

  try {
    const catalog = await readPublicCatalog()
    res.set('Cache-Control', 'public, max-age=30')
    res.json(catalog)
  } catch (error) {
    console.error('[catalog] read failed', error)
    res.status(502).json({ error: 'Catalog database is unavailable.' })
  }
})
