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
    <section className="border-y border-neutral-200 bg-neutral-950 py-20 text-white md:py-28">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/60">Newsletter</p>
            <h3 className="mt-4 font-serif text-4xl tracking-tight md:text-5xl">Private drops. No noise.</h3>
            <p className="mt-4 text-sm text-white/70">
              Studio notes, limited releases, and early access — sent sparingly.
            </p>
          </div>
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="border-white/20 bg-transparent text-white placeholder:text-white/40"
            />
            <Button type="submit" variant="inverse" className="w-full md:w-auto">
              {sent ? 'Subscribed' : 'Join the list'}
            </Button>
            {sent ? <p className="text-xs text-emerald-300">Thank you — this is a UI demo only.</p> : null}
          </motion.form>
        </div>
      </Container>
    </section>
  )
}
