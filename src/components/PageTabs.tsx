import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/appStore'

// Onglets de page partagés (vues du calendrier, habitudes).
// Thème journal : intercalaires de classeur dans les couleurs du titre de page (JournalTitle) ;
// l'onglet actif est blanc et se fond dans le contenu, les autres foncent à mesure qu'ils s'en éloignent.
// Thème Notion : onglets soulignés.

const INK = '#2F2B6E'
const INACTIVE_FILLS = ['#E8E7FD', '#DEDEFB', '#D4D4F6']

/** Couleur d'un intercalaire selon sa distance à l'onglet actif. */
export const tabFill = (distance: number) => (distance === 0 ? '#FFFFFF' : INACTIVE_FILLS[Math.min(distance, INACTIVE_FILLS.length) - 1])

/** Chaque onglet recouvre celui de droite ; l'actif passe devant tout le monde. */
export const tabZIndex = (index: number, count: number, active: boolean) => (active ? count + 1 : count - index)

export function TabStrip({ children }: { children: ReactNode }) {
  const journal = useTheme() === 'journal'
  return <div className={cn('flex items-end overflow-x-auto border-b', journal ? 'gap-3 border-[#E3E2F8] px-4 pt-2.5 sm:px-6' : 'gap-0.5 border-line px-2 sm:px-4')}>{children}</div>
}

export function PageTab({
  active,
  fill,
  zIndex,
  onClick,
  onDoubleClick,
  onContextMenu,
  children,
}: {
  active: boolean
  fill: string
  zIndex: number
  onClick: () => void
  onDoubleClick?: () => void
  onContextMenu?: (e: MouseEvent) => void
  children: ReactNode
}) {
  const journal = useTheme() === 'journal'

  if (!journal) {
    return (
      <div
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
        className={cn(
          'relative mb-[-1px] flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-2.5 text-sm whitespace-nowrap select-none',
          active ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink',
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      className={cn(
        'relative -mb-px flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-tl-[14px] pr-2 pl-5 font-plate text-sm whitespace-nowrap select-none',
        active ? 'font-semibold text-[#2F2B6E] drop-shadow-[0_-2px_6px_rgb(47_43_110/10%)]' : 'font-medium text-[#5B57A6] hover:text-[#2F2B6E]',
      )}
      style={{ background: fill, zIndex }}
    >
      {children}
      {/* Bord droit en pente douce, qui recouvre le début de l'onglet suivant */}
      <svg width="26" height="40" viewBox="0 0 26 40" aria-hidden="true" className="pointer-events-none absolute bottom-0 left-full" style={{ fill }}>
        <path d="M0 0C8 0 10 4 12 12l4 18c2 7 5 10 10 10H0z" />
      </svg>
    </div>
  )
}

/** Petit compteur dans un onglet (filtres actifs…). */
export function TabBadge({ children }: { children: ReactNode }) {
  const journal = useTheme() === 'journal'
  return journal ? (
    <span className="flex h-4 min-w-4 items-center justify-center rounded-full border-[1.5px] px-1 text-[10px] leading-none font-semibold" style={{ borderColor: INK, background: '#E86AAE', color: INK }}>
      {children}
    </span>
  ) : (
    <span className="rounded-full bg-accent-soft px-1.5 text-[10px] font-semibold text-accent">{children}</span>
  )
}

/** Bouton en fin de bande d'onglets (« + », « … », « 3 de plus »). Transmet la ref pour servir de déclencheur de menu. */
export const TabStripButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { first?: boolean }>(function TabStripButton(
  { first, className, ...props },
  ref,
) {
  const journal = useTheme() === 'journal'
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        'flex shrink-0 items-center justify-center gap-1 whitespace-nowrap transition-colors',
        journal
          ? cn('mb-1.5 h-7 min-w-7 rounded-full px-1.5 font-plate text-[13px] text-[#5B57A6] hover:bg-[#DCDDFF] hover:text-[#2F2B6E] data-[state=open]:bg-[#DCDDFF]', first ? 'ml-4' : 'ml-0')
          : 'mb-1 ml-1 h-7 rounded-md px-1.5 text-[13px] text-ink-3 hover:bg-hover hover:text-ink data-[state=open]:bg-hover',
        className,
      )}
    />
  )
})
