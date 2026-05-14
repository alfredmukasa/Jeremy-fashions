import { useState } from 'react'
import { motion } from 'framer-motion'

import { Button } from '../common/Button'
import { Container } from '../layout/Container'
import { Input } from '../common/Input'

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section className="home-section relative overflow-hidden border-y border-[var(--border-subtle)] bg-[var(--text-primary)] text-[var(--accent-contrast)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.06),transparent_55%)]"
      />
      <Container>
        <div className="relative grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
          <div>
            <p className="eyebrow text-white/55">Newsletter</p>
            <h3 className="display-serif mt-5 text-[clamp(2rem,4vw,3.25rem)]">Private drops. No noise.</h3>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/65">
              Studio notes, limited releases, and early access — sent sparingly.
            </p>
          </div>
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="rounded-full border-white/20 bg-white/5 px-5 text-white placeholder:text-white/35 focus:border-white/40"
            />
            <Button type="submit" variant="inverse" className="w-full md:w-auto">
              {sent ? 'Subscribed' : 'Join the list'}
            </Button>
            {sent ? (
              <p className="text-xs tracking-wide text-white/55">Thank you — this is a UI demo only.</p>
            ) : null}
          </motion.form>
        </div>
      </Container>
    </section>
  )
}
