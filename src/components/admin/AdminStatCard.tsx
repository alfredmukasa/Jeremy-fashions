import { motion } from 'framer-motion'

type AdminStatCardProps = {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'alert'
}

export function AdminStatCard({ label, value, hint, tone = 'default' }: AdminStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`border bg-white p-6 ${
        tone === 'alert' ? 'border-amber-300 bg-amber-50/40' : 'border-neutral-200'
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">{label}</p>
      <p className="mt-3 font-serif text-3xl text-neutral-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </motion.div>
  )
}
