import { motion } from 'framer-motion'

import { Container } from '../layout/Container'

const shots = [
  'https://cdn.pixabay.com/photo/2020/11/06/06/24/black-5716973_1280.jpg',
  'https://cdn.pixabay.com/photo/2016/09/10/01/24/urban-1658436_1280.jpg',
  'https://cdn.pixabay.com/photo/2022/02/07/22/04/man-7000371_1280.jpg',
  'https://cdn.pixabay.com/photo/2024/11/27/07/51/woman-9227532_1280.jpg',
  'https://cdn.pixabay.com/photo/2020/08/26/14/02/girl-5519558_1280.jpg',
  'https://cdn.pixabay.com/photo/2018/05/11/16/18/man-3390927_1280.jpg',
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
