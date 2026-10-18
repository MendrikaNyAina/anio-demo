import type { CSSProperties } from 'react'
import { CalendarClock } from 'lucide-react'
import { KIND_LABEL } from '@/domain/display'
import type { EntryType, IconRef, TaskKind } from '@/domain/types'
import { cn } from '@/lib/utils'
import { IconView } from './IconView'

/** Le type se lit au trait du cadre : plein (simple), tirets (étalée), pointillés (habitude). */
const DASH: Record<TaskKind, string | undefined> = { simple: undefined, spread: '3 2', habit: '0.01 2.6' }

interface Props {
  type: EntryType
  /** Icône de la (sous-)catégorie principale, placée dans le cadre. Absente : un simple point. */
  icon?: IconRef
  /** Couleur de l'icône ; le cadre suit la couleur du texte (`currentColor`). */
  color?: string
  notion?: boolean
  /** Côté du cadre, en px. */
  size?: number
  className?: string
  style?: CSSProperties
}

/** Indicateur visuel du type d'entrée (calendrier.md l. 29). */
export function TypeIndicator({ type, icon, color, notion, size = 14, className, style }: Props) {
  if (notion) {
    return (
      <span
        title="Tâche Notion"
        className={cn('inline-flex shrink-0 items-center justify-center rounded-[3px] border border-current font-serif leading-none font-bold', className)}
        style={{ width: size, height: size, fontSize: size * 0.72, ...style }}
      >
        N
      </span>
    )
  }

  if (type === 'event') {
    return (
      <span title={KIND_LABEL.event} className={cn('inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size, ...style }}>
        <CalendarClock size={size - 2} strokeWidth={2.2} />
      </span>
    )
  }

  // Les points ont besoin d'un trait un peu plus épais pour rester lisibles.
  const stroke = type === 'habit' ? 1.8 : 1.4
  const radius = size * 0.28
  return (
    <span
      title={KIND_LABEL[type]}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size, borderRadius: radius, ...style }}
    >
      <svg aria-hidden width={size} height={size} className="pointer-events-none absolute inset-0 overflow-visible">
        <rect
          x={stroke / 2}
          y={stroke / 2}
          width={size - stroke}
          height={size - stroke}
          rx={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={DASH[type]}
          strokeLinecap={type === 'habit' ? 'round' : 'butt'}
        />
      </svg>
      {icon ? (
        <IconView icon={icon} size={Math.round(size * 0.62)} color={color} />
      ) : (
        <span className="rounded-full bg-current" style={{ width: Math.max(3, size * 0.24), height: Math.max(3, size * 0.24) }} />
      )}
    </span>
  )
}
