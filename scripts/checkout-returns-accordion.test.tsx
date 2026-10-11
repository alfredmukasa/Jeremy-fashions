import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

const RETURNS_BODY = 'Unworn pieces may be returned within 30 days.\n\nFinal sale and altered items are excluded.'

function startServer() {
  return createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    ssr: { external: ['react', 'react-dom', 'react-router-dom', 'react-icons', 'framer-motion'] },
  })
}

async function renderReturns(
  server: ViteDevServer,
  props: { body: string; defaultOpen?: boolean },
) {
  const note = await server.ssrLoadModule('/src/components/checkout/CheckoutPolicyNote.tsx')
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(note.CheckoutReturnsAccordion, props)),
  )
}

test('checkout returns body stays hidden until the accordion is opened', async () => {
  const server = await startServer()
  try {
    const collapsed = await renderReturns(server, { body: RETURNS_BODY })
    assert.match(collapsed, /aria-expanded="false"/)
    assert.match(collapsed, />Returns</)
    assert.equal(collapsed.includes('Unworn pieces may be returned'), false)
    assert.equal(collapsed.includes('Final sale and altered items are excluded'), false)
    assert.equal(collapsed.includes('whitespace-pre-wrap'), false)

    const expanded = await renderReturns(server, { body: RETURNS_BODY, defaultOpen: true })
    assert.match(expanded, /aria-expanded="true"/)
    assert.match(expanded, /aria-label="Return policy"/)
    assert.match(expanded, /whitespace-pre-wrap/)
    assert.match(expanded, /Unworn pieces may be returned within 30 days\./)
    assert.match(expanded, /Final sale and altered items are excluded\./)
    assert.match(expanded, /Return policy/)
  } finally {
    await server.close()
  }
})
