import { ChevronDown, CircleCheck, Filter, Flag, Folder, Shapes, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconView } from '@/components/IconView'
import { journalMenuClass } from '@/components/JournalTitle'
import { TypeIndicator } from '@/components/TypeIndicator'
import { Checkbox } from '@/components/ui/controls'
import { Popover } from '@/components/ui/popover'
import { KIND_LABEL, PRIORITY_COLOR, PRIORITY_LABEL } from '@/domain/display'
import { tint } from '@/domain/style'
import { EMPTY_FILTERS, OTHER, type CalendarFilters, type EntryType, type Priority } from '@/domain/types'
import { countActiveFilters } from '@/domain/visibility'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'

// Même univers que le titre de page (JournalTitle) : pastilles Fredoka, bordure lavande, encre bleu nuit.

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

/**
 * Filtres d'une vue (calendrier.md l. 57) : catégorie / sous-catégorie (la sous-catégorie prime),
 * priorité, fait / pas fait, type. Ils sont mémorisés dans la vue active.
 */
export function FiltersBar({ filters, onChange }: { filters: CalendarFilters; onChange: (f: CalendarFilters) => void }) {
  const categories = useApp((s) => s.data.categories)
  const subcategories = useApp((s) => s.data.subcategories)
  const set = (patch: Partial<CalendarFilters>) => onChange({ ...filters, ...patch })
  const catCount = filters.categoryIds.length + filters.subcategoryIds.length
  const journal = useTheme() === 'journal'

  return (
    <div role="group" aria-label="Filtres" className={cn('flex flex-wrap items-center', journal ? 'gap-2 font-plate' : 'gap-1.5')}>
      {journal ? (
        <span className="mr-1 inline-flex h-7 -rotate-3 items-center gap-1.5 rounded-full border-2 border-[#A3A8EE] bg-[#DCDDFF] pr-3 pl-2.5 text-[13px] font-semibold text-[#2F2B6E]">
          <Filter size={14} strokeWidth={2.2} />
          filtres
        </span>
      ) : (
        <Filter size={14} className="mr-0.5 text-ink-3" />
      )}

      <Chip label="Catégories" icon={<Folder />} active={catCount > 0} count={catCount}>
        <div className="max-h-[360px] w-[270px] overflow-y-auto">
          {[...categories]
            .sort((a, b) => a.position - b.position)
            .map((c) => (
              <div key={c.id}>
                <Option checked={filters.categoryIds.includes(c.id)} onChange={() => set({ categoryIds: toggle(filters.categoryIds, c.id) })}>
                  <ColorTag color={c.color} strong>
                    <IconView icon={c.icon} size={14} color={c.color} />
                    {c.name}
                  </ColorTag>
                </Option>
                {subcategories
                  .filter((s) => s.categoryId === c.id)
                  .sort((a, b) => a.position - b.position)
                  .map((s) => (
                    <Option key={s.id} indent checked={filters.subcategoryIds.includes(s.id)} onChange={() => set({ subcategoryIds: toggle(filters.subcategoryIds, s.id) })}>
                      <ColorTag color={s.color}>
                        <IconView icon={s.icon} size={13} color={s.color} />
                        {s.name}
                      </ColorTag>
                    </Option>
                  ))}
              </div>
            ))}
          <Option checked={filters.categoryIds.includes(OTHER)} onChange={() => set({ categoryIds: toggle(filters.categoryIds, OTHER) })}>
            <ColorTag>Autre (sans catégorie)</ColorTag>
          </Option>
          <p className={cn('leading-snug', journal ? 'mt-1.5 border-t-2 border-dashed border-[#DCDDFF] px-2.5 pt-2 pb-1 text-xs text-[#5B57A6]' : 'px-2 pt-1.5 pb-1 text-[11px] text-ink-3')}>
            Si des sous-catégories sont cochées, elles priment sur leur catégorie.
          </p>
        </div>
      </Chip>

      <Chip label="Priorité" icon={<Flag />} active={filters.priorities.length > 0} count={filters.priorities.length}>
        <div className="w-[190px]">
          {(['high', 'medium', 'low', 'none'] as (Priority | 'none')[]).map((p) => (
            <Option key={p} checked={filters.priorities.includes(p)} onChange={() => set({ priorities: toggle(filters.priorities, p) })}>
              {p === 'none' ? (
                <span className={cn('size-[9px] rounded-full border-[1.5px]', journal ? 'border-[#A3A8EE]' : 'border-[#c7c6c4]')} />
              ) : (
                <span className="size-[9px] rounded-full" style={{ background: PRIORITY_COLOR[p] }} />
              )}
              <span className={cn(p === 'none' && (journal ? 'text-[#5B57A6]' : 'text-ink-2'))}>{p === 'none' ? 'Sans priorité' : PRIORITY_LABEL[p]}</span>
            </Option>
          ))}
        </div>
      </Chip>

      <Chip label={filters.status === 'all' ? 'Statut' : filters.status === 'done' ? 'Fait' : 'À faire'} icon={<CircleCheck />} active={filters.status !== 'all'}>
        <div className="w-[170px]">
          {(
            [
              ['all', 'Tout'],
              ['todo', 'À faire'],
              ['done', 'Fait'],
            ] as const
          ).map(([value, label]) => (
            <Option key={value} radio checked={filters.status === value} onChange={() => set({ status: value })}>
              {label}
            </Option>
          ))}
        </div>
      </Chip>

      <Chip label="Type" icon={<Shapes />} active={filters.kinds.length > 0} count={filters.kinds.length}>
        <div className="w-[200px]">
          {(['simple', 'spread', 'habit', 'event'] as EntryType[]).map((k) => (
            <Option key={k} checked={filters.kinds.includes(k)} onChange={() => set({ kinds: toggle(filters.kinds, k) })}>
              <TypeIndicator type={k} className={journal ? 'text-[#6E6BC4]' : 'text-ink-2'} />
              {KIND_LABEL[k]}
            </Option>
          ))}
        </div>
      </Chip>

      {countActiveFilters(filters) > 0 && (
        <button
          type="button"
          onClick={() => onChange({ ...EMPTY_FILTERS })}
          className={cn(
            'flex items-center gap-1',
            journal
              ? 'h-9 rounded-full px-2.5 text-sm font-medium text-[#5B57A6] underline decoration-[#C9CDFF] decoration-wavy underline-offset-[5px] hover:text-[#2F2B6E]'
              : 'rounded-md px-1.5 py-0.5 text-[13px] text-ink-3 hover:bg-hover hover:text-ink',
          )}
        >
          <X size={13} strokeWidth={journal ? 2.5 : 2} /> {journal ? 'effacer' : 'Effacer'}
        </button>
      )}
    </div>
  )
}

/**
 * Pastille d'un filtre. Trois états : au repos, actif (lavande + badge jaune du nombre),
 * ouvert (fond blanc, bord encre ; Radix pose `data-state="open"` sur le déclencheur).
 */
function Chip({ label, icon, active, count = 0, children }: { label: string; icon: ReactNode; active: boolean; count?: number; children: ReactNode }) {
  const notion = useTheme() === 'notion'
  if (notion) {
    return (
      <Popover
        trigger={
          <button
            type="button"
            className={cn(
              'flex h-7 items-center gap-1 rounded-full border px-2.5 text-[13px] transition-colors',
              active ? 'border-[#b5d3f3] bg-accent-soft text-accent' : 'border-line text-ink-2 hover:bg-hover',
            )}
          >
            {label}
            {count > 0 && <span className="font-semibold">· {count}</span>}
            <ChevronDown size={13} />
          </button>
        }
      >
        <div className="p-1">{children}</div>
      </Popover>
    )
  }
  return (
    <Popover
      className={journalMenuClass}
      trigger={
        <button
          type="button"
          className={cn(
            'group flex h-9 items-center gap-1.5 rounded-full border-2 pr-2.5 pl-3 text-sm font-medium text-[#2F2B6E] transition-colors [&_svg]:size-[15px]',
            active ? 'border-[#7F84E3] bg-[#DCDDFF]' : 'border-[#A3A8EE] bg-[#F4F3FF] hover:bg-[#ECEBFF]',
            'data-[state=open]:border-[#2F2B6E] data-[state=open]:bg-white',
          )}
        >
          <span className={cn('flex', !active && 'text-[#6E6BC4] group-data-[state=open]:text-[#2F2B6E]')}>{icon}</span>
          {label}
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] border-[#2F2B6E] bg-[#FFE08A] px-1 text-xs leading-none font-semibold">
              {count}
            </span>
          )}
          <ChevronDown strokeWidth={2.2} className={cn('transition-transform group-data-[state=open]:rotate-180', !active && 'text-[#6E6BC4]')} />
        </button>
      }
    >
      {children}
    </Popover>
  )
}

/** Nom d'une catégorie façon étiquette Notion : couleur pastélisée (même mélange que le fond des tâches). */
function ColorTag({ color, strong, children }: { color?: string; strong?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-1.5 truncate rounded-md px-1.5 py-px text-[#37352F]', strong ? 'font-semibold' : 'font-medium')}
      style={{ background: color ? tint(color, 20) : '#F1F1EF' }}
    >
      {children}
    </span>
  )
}

function Option({ checked, onChange, children, indent, radio }: { checked: boolean; onChange: () => void; children: ReactNode; indent?: boolean; radio?: boolean }) {
  const notion = useTheme() === 'notion'
  if (notion) {
    return (
      <div role="button" tabIndex={0} onClick={onChange} onKeyDown={(e) => e.key === 'Enter' && onChange()} className={cn('flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[13px] hover:bg-hover', indent && 'pl-7')}>
        {radio ? (
          <span className={cn('flex size-4 items-center justify-center rounded-full border', checked ? 'border-accent' : 'border-[#c7c6c4]')}>{checked && <span className="size-2 rounded-full bg-accent" />}</span>
        ) : (
          <Checkbox checked={checked} onChange={onChange} />
        )}
        {children}
      </div>
    )
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => e.key === 'Enter' && onChange()}
      className={cn('flex h-8 cursor-pointer items-center gap-2.5 rounded-[10px] px-2 text-[13.5px] font-medium hover:bg-[#F4F3FF]', indent && 'pl-9')}
    >
      {radio ? (
        <span className={cn('flex size-[18px] shrink-0 items-center justify-center rounded-full border-2', checked ? 'border-[#2F2B6E]' : 'border-[#A3A8EE]')}>
          {checked && <span className="size-2 rounded-full bg-[#2F2B6E]" />}
        </span>
      ) : (
        <Checkbox
          checked={checked}
          onChange={onChange}
          className={cn('size-[18px] rounded-md border-2', checked ? 'border-[#2F2B6E] bg-[#2F2B6E]' : 'border-[#A3A8EE]')}
        />
      )}
      {children}
    </div>
  )
}
