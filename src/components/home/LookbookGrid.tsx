import { motion } from 'framer-motion'

import { Container } from '../layout/Container'
import { SectionHeading } from '../common/SectionHeading'

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
    <section className="home-section">
      <Container>
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Studio"
            title="Field notes"
            subtitle="A scroll of silhouettes: tailoring, texture, and light — optimized for slow browsing."
            className="max-w-xl"
          />
        </div>
        <div className="columns-2 gap-5 md:columns-3 md:gap-7">
          {shots.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 5) * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="group mb-5 break-inside-avoid overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-muted)] shadow-[var(--shadow-soft)] md:mb-7"
            >
              <img
                src={src}
                alt=""
                className="image-zoom w-full object-cover"
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
