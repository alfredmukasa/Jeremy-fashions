import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type AdminPageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function AdminPageHeader({ eyebrow, title, description, actions }: AdminPageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 border-b border-neutral-200 pb-8 md:flex-row md:items-end md:justify-between"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-serif text-3xl text-neutral-950 md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm text-neutral-600">{description}</p> : null}
      </motion.div>
      {actions ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="flex flex-wrap gap-2"
        >
          {actions}
        </motion.div>
      ) : null}
    </motion.header>
  )
}
