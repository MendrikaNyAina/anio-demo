import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { TypeIndicator } from '@/components/TypeIndicator'
import { Popover } from '@/components/ui/popover'
import type { AppTheme, EntryType } from '@/domain/types'
import { cn } from '@/lib/utils'

const ITEMS: [EntryType, string][] = [
  ['simple', 'simple'],
  ['spread', 'étalée'],
  ['habit', 'habitude'],
  ['event', 'événement'],
]

const HINT = "Le cadre autour de l'icône de la catégorie indique le type de tâche"

/**
 * Légende des types dans l'en-tête du calendrier.
 * Journal : une pilule « légende » qui ouvre l'étiquette. Notion : un encadré fin et discret, toujours visible.
 */
export function TypeLegend({ theme }: { theme: AppTheme }) {
  if (theme === 'notion') {
    return (
      <ul className="mt-1 flex items-center gap-x-3.5 rounded-md border border-line bg-white px-2.5 py-1 text-[13px] whitespace-nowrap text-ink-2" title={HINT}>
        <li className="text-xs font-medium text-ink-3">Légende</li>
        {ITEMS.map(([type, label]) => (
          <li key={type} className="flex items-center gap-1.5">
            <TypeIndicator type={type} size={15} className="text-ink-2" />
            {label}
          </li>
        ))}
      </ul>
    )
  }

  return <JournalLegend />
}

/** Journal : seule la pilule « légende » reste affichée ; un clic ouvre la liste par-dessus, sans décaler l'en-tête. */
function JournalLegend() {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      className="rounded-[18px] bg-transparent p-0 shadow-none"
      trigger={
        <button
          type="button"
          aria-expanded={open}
          title={HINT}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border-2 border-[#A3A8EE] px-2.5 font-plate text-[12px] leading-[20px] font-semibold text-[#2F2B6E] transition-colors hover:bg-[#C9CDFF]',
            open ? 'bg-[#C9CDFF]' : 'bg-[#DCDDFF]',
          )}
        >
          légende
          <ChevronDown size={12} strokeWidth={2.6} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      }
    >
      <ul className="flex items-center gap-x-4 rounded-[18px] border-2 border-[#A3A8EE] bg-white px-4 py-2.5 font-plate text-[13px] font-medium whitespace-nowrap text-[#2F2B6E] shadow-[0_3px_0_#DCDDFF]">
        {ITEMS.map(([type, label]) => (
          <li key={type} className="flex items-center gap-1.5">
            <TypeIndicator type={type} size={16} className="text-[#6E6BC4]" />
            {label}
          </li>
        ))}
      </ul>
    </Popover>
  )
}
