import type { ReactNode } from 'react'
import { tint } from '@/domain/style'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/appStore'

/** Lavande du thème journal, teinte par défaut de l'en-tête d'une carte. */
const LAVENDER = '#8C92E8'

/** Classes du contenu des cartes de panneau (suivi des habitudes, Bilan). */
export function usePanelTone() {
  return {
    tile: 'rounded-lg bg-sidebar',
    row: 'rounded-md hover:bg-hover',
    empty: 'bg-[#ecebe9]',
    ink: 'text-ink',
    soft: 'text-ink-2',
  }
}

/**
 * Carte de panneau. Thème journal : comme les cartes de la page Catégories (bordure fine, en-tête sur
 * une bande pastel de la couleur `accent`, ombre légère au survol). Thème Notion : cadre gris sobre.
 */
export function PanelCard({ title, action, accent = LAVENDER, className, children }: { title: ReactNode; action?: ReactNode; accent?: string; className?: string; children: ReactNode }) {
  const journal = useTheme() === 'journal'

  if (!journal) {
    return (
      <section className={cn('rounded-lg border border-line bg-white p-4', className)}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-semibold">{title}</h3>
          {action}
        </div>
        {children}
      </section>
    )
  }

  return (
    <section className={cn('rounded-xl border border-line bg-white px-2 pt-1.5 pb-2 transition-shadow hover:shadow-[0_2px_10px_rgb(0_0_0/6%)]', className)}>
      <div className="mb-2 flex h-9 items-center justify-between gap-2 rounded-md px-2" style={{ background: tint(accent, 21) }}>
        <h3 className="truncate text-[15px] font-semibold">{title}</h3>
        {action}
      </div>
      <div className="px-2 pb-1">{children}</div>
    </section>
  )
}
