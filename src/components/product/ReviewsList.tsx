import { motion } from 'framer-motion'

import type { Review } from '../../types'

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  return (
    <div className="space-y-8">
      {reviews.map((r, i) => (
        <motion.article
          key={r.id}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
          className="border-b border-neutral-200 pb-8 last:border-0"
        >
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium text-neutral-950">{r.author}</p>
            {r.verified ? (
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-700">Verified</span>
            ) : null}
            <span className="text-xs text-neutral-500">{r.date}</span>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-neutral-500">
            {Array.from({ length: 5 }).map((_, n) => (
              <span key={n}>{n < r.rating ? '★' : '☆'}</span>
            ))}{' '}
            <span className="text-neutral-400">({r.rating}/5)</span>
          </p>
          <h4 className="mt-3 font-medium text-neutral-900">{r.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">{r.body}</p>
        </motion.article>
      ))}
    </div>
  )
}
