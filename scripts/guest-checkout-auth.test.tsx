import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

function startServer() {
  return createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    ssr: { external: ['react', 'react-dom', 'react-router-dom', 'react-icons', 'framer-motion'] },
  })
}

async function renderNote(server: ViteDevServer, email?: string) {
  const note = await server.ssrLoadModule('/src/components/checkout/GuestCheckoutAccountNote.tsx')
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(note.GuestCheckoutAccountNote, { email })),
  )
}

test('guest checkout offers sign in and sign up, and keeps the typed email', async () => {
  const server = await startServer()
  try {
    const paths = await server.ssrLoadModule('/src/lib/guestAuthPaths.ts')
    assert.equal(paths.guestLoginPath('  Guest@Studio.com '), '/login?email=Guest%40Studio.com')
    assert.equal(paths.guestRegisterPath('guest@studio.com'), '/register?email=guest%40studio.com')
    assert.equal(paths.guestLoginPath('   '), '/login')
    assert.equal(paths.guestRegisterPath(), '/register')

    const html = await renderNote(server, 'guest@studio.com')
    assert.match(html, /Checking out as a guest/)
    assert.match(html, /href="\/login\?email=guest%40studio.com"/)
    assert.match(html, />Sign in</)
    assert.match(html, /href="\/register\?email=guest%40studio.com"/)
    assert.match(html, />create an account</)
    assert.equal(html.includes('<script'), false)
  } finally {
    await server.close()
  }
})
