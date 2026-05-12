import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi2'

import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../utils/cn'

type Props = {
  className?: string
  overlay?: boolean
}

export function ThemeToggle({ className, overlay = false }: Props) {
  const { appearanceMode, canPersistTheme, setAppearanceMode } = useTheme()

  if (!canPersistTheme) return null

  const isDark = appearanceMode === 'dark'
  const next = isDark ? 'light' : 'dark'

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => void setAppearanceMode(next)}
      className={cn(
        'inline-flex shrink-0 p-2 transition hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        overlay ? 'text-white focus-visible:outline-white' : 'text-[var(--text-primary)] focus-visible:outline-[var(--text-primary)]',
        className,
      )}
    >
      {isDark ? <HiOutlineSun className="h-5 w-5" /> : <HiOutlineMoon className="h-5 w-5" />}
    </button>
  )
}
