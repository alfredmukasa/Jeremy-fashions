import { motion } from 'framer-motion'

import { Container } from '../layout/Container'

const shots = [
  'https://images.unsplash.com/photo-1509631179647-017733b3a056?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1490367532201-b9bc1df483a6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
]

export function LookbookGrid() {
  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Studio</p>
            <h3 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">Field notes</h3>
          </div>
          <p className="max-w-md text-sm text-neutral-600">
            A scroll of silhouettes: tailoring, texture, and light — optimized for slow browsing.
          </p>
        </div>
        <div className="columns-2 gap-4 md:columns-3 md:gap-6">
          {shots.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 5) * 0.04, duration: 0.45 }}
              className="mb-4 break-inside-avoid overflow-hidden bg-neutral-100 md:mb-6"
            >
              <img src={src} alt="" className="w-full object-cover" loading="lazy" />
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
