import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

import { DEFAULT_HERO_CTA_LABEL, DEFAULT_HERO_TITLE } from '../src/constants/siteContent.ts'

function startServer() {
  return createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    ssr: { external: ['react', 'react-dom', 'react-router-dom', 'react-icons', 'framer-motion'] },
  })
}

async function renderSlide(server: ViteDevServer, slide: { src: string; alt: string; title?: string; ctaLabel?: string }) {
  const hero = await server.ssrLoadModule('/src/components/home/HeroSection.tsx')
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        Fragment,
        null,
        createElement(hero.HeroSlideHeading, { slide }),
        createElement(hero.HeroSlideCta, { slide }),
      ),
    ),
  )
}

test('homepage hero renders saved slide text as plain text', async () => {
  const server = await startServer()
  try {
    const content = await server.ssrLoadModule('/src/services/siteContentService.ts')
    const slides = content.parseHeroSlides({
      slides: [
        {
          src: 'https://cdn.example/one.jpg',
          alt: 'Look one',
          title: 'Atelier <drop>',
          ctaLabel: 'Enter the <shop>',
        },
      ],
    })

    assert.equal(slides[0].src, 'https://cdn.example/one.jpg')
    assert.equal(slides[0].alt, 'Look one')
    assert.equal(slides[0].title, 'Atelier <drop>')
    assert.equal(slides[0].ctaLabel, 'Enter the <shop>')

    const html = await renderSlide(server, slides[0])
    assert.match(html, /<h1[\s>]/)
    assert.match(html, /Atelier &lt;drop&gt;/)
    assert.match(html, /Enter the &lt;shop&gt;/)
    assert.match(html, /href="\/shop"/)
    assert.equal(html.includes('<drop>'), false)
    assert.equal(html.includes('<shop>'), false)
    assert.equal(html.includes('<script'), false)
  } finally {
    await server.close()
  }
})

test('missing or blank hero text falls back to the built-in copy', async () => {
  const server = await startServer()
  try {
    const content = await server.ssrLoadModule('/src/services/siteContentService.ts')
    const slides = content.parseHeroSlides({
      slides: [
        { src: 'https://cdn.example/plain.jpg', alt: 'Look' },
        { src: 'https://cdn.example/blank.jpg', alt: 'Look', title: '   ', ctaLabel: '' },
      ],
    })

    assert.equal(slides[0].title, undefined)
    assert.equal(slides[0].ctaLabel, undefined)
    assert.equal(slides[1].title, undefined)
    assert.equal(slides[1].ctaLabel, undefined)
    assert.equal(slides[0].src, 'https://cdn.example/plain.jpg')
    assert.equal(slides[1].src, 'https://cdn.example/blank.jpg')

    for (const slide of slides) {
      const html = await renderSlide(server, slide)
      assert.match(html, new RegExp(DEFAULT_HERO_TITLE))
      assert.match(html, new RegExp(DEFAULT_HERO_CTA_LABEL))
      assert.match(html, /<h1[\s>]/)
    }

    const payload = content.heroSlidesPayload([
      { src: 'https://cdn.example/plain.jpg', alt: 'Look', title: '  ', ctaLabel: '' },
      { src: 'https://cdn.example/custom.jpg', alt: 'Night', title: 'Night study', ctaLabel: 'Shop night' },
    ])
    assert.deepEqual(payload, {
      slides: [
        { src: 'https://cdn.example/plain.jpg', alt: 'Look' },
        {
          src: 'https://cdn.example/custom.jpg',
          alt: 'Night',
          title: 'Night study',
          ctaLabel: 'Shop night',
        },
      ],
    })
  } finally {
    await server.close()
  }
})
