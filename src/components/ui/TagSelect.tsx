import { Check } from 'lucide-react'
import { useState } from 'react'
import { shade, tint } from '@/domain/style'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/appStore'
import { journalMenuClass } from '../JournalTitle'
import { Popover } from './popover'

export interface TagOption<T extends string> {
  value: T
  label: string
  color: string
}

/** Étiquette colorée façon Notion (fond pastel, texte foncé de la même couleur). Journal : pilule bordée, Fredoka. */
export function Tag({ label, color, className }: { label: string; color: string; className?: string }) {
  const journal = useTheme() === 'journal'
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate px-1.5 text-[13px] leading-[20px] whitespace-nowrap',
        journal ? 'rounded-full border-[1.5px] px-2 font-plate font-medium' : 'rounded-[3px]',
        className,
      )}
      style={{ background: tint(color, journal ? 25 : 20), color: shade(color, 70), borderColor: journal ? tint(color, 55) : undefined }}
    >
      {label}
    </span>
  )
}

/**
 * Propriété « sélection » d'une page Notion : la valeur s'affiche en étiquette colorée (ou « Vide »),
 * un clic ouvre la liste des options. Recliquer sur l'option choisie la retire.
 */
export function TagSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | undefined
  options: TagOption<T>[]
  onChange: (value: T | undefined) => void
  /** Nom de la propriété, pour les lecteurs d'écran. */
  label: string
}) {
  const journal = useTheme() === 'journal'
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className={journal ? cn(journalMenuClass, 'p-1.5') : 'p-1'}
      trigger={
        <button
          type="button"
          aria-label={`${label} : ${current?.label ?? 'vide'}`}
          className={cn('flex min-h-8 w-full items-center rounded-md px-1.5 text-left transition-colors', journal ? 'hover:bg-[#F4F3FF]' : 'hover:bg-hover')}
        >
          {current ? <Tag label={current.label} color={current.color} /> : <span className="text-sm text-ink-3">Vide</span>}
        </button>
      }
    >
      <div className="w-[220px]" role="listbox" aria-label={label}>
        <div className={cn('px-2 pt-1 pb-1.5 text-xs', journal ? 'text-[#5B57A6]' : 'text-ink-3')}>Choisis une option</div>
        {options.map((o) => {
          const selected = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                onChange(selected ? undefined : o.value)
                setOpen(false)
              }}
              className={cn('flex w-full items-center gap-2 px-2 py-1 text-left', journal ? 'rounded-[10px] hover:bg-[#F4F3FF]' : 'rounded-md hover:bg-hover')}
            >
              <Tag label={o.label} color={o.color} />
              {selected && <Check size={14} className="ml-auto shrink-0 text-ink-2" />}
            </button>
          )
        })}
        {current && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined)
              setOpen(false)
            }}
            className={cn('mt-1 w-full border-t border-line px-2 pt-1.5 pb-1 text-left text-[13px] text-ink-3 hover:text-ink', journal && 'border-[#E3E2F8]')}
          >
            Retirer
          </button>
        )}
      </div>
    </Popover>
  )
}
