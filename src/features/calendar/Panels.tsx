import { Inbox, X } from 'lucide-react'
import { useMemo } from 'react'
import { fmtDayLong } from '@/domain/display'
import { entriesOfDay, unscheduledEntry, unscheduledTasks, type Entry } from '@/domain/entries'
import { buildLookup } from '@/domain/lookup'
import type { CalendarFilters, Task } from '@/domain/types'
import { useApp } from '@/store/appStore'
import { ui } from '@/store/uiStore'
import { DraggableEntry, payloadOf, useDragContainer } from './DraggableEntry'

/**
 * Panneau droit « Non planifiées » (calendrier.md l. 59) : tâches visibles sans aucune date,
 * regroupées par catégorie (inspiration Glendale), à glisser dans le calendrier.
 */
export function UnscheduledPanel({ filters, onClose }: { filters: CalendarFilters; onClose: () => void }) {
  const data = useApp((s) => s.data)
  const ref = useDragContainer()
  const groups = useMemo(() => {
    const lookup = buildLookup(data)
    const byGroup = new Map<string, { name: string; color?: string; items: { task: Task; entry: Entry }[] }>()
    for (const task of unscheduledTasks(data, filters)) {
      const cat = task.primaryCategoryId ? lookup.categories.get(task.primaryCategoryId) : undefined
      const source = task.source ? lookup.sources.get(task.source.sourceId) : undefined
      const key = source ? `n:${source.id}` : (cat?.id ?? 'other')
      const name = source ? `${source.icon} ${source.name}` : (cat?.name ?? 'Autre')
      if (!byGroup.has(key)) byGroup.set(key, { name, color: cat?.color, items: [] })
      byGroup.get(key)!.items.push({ task, entry: unscheduledEntry(task, lookup) })
    }
    return [...byGroup.values()]
  }, [data, filters])
  const count = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-l border-line bg-[#fbfbfa] max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-20 max-md:w-[min(300px,85vw)] max-md:shadow-pop">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Inbox size={15} className="text-ink-2" />
        <span className="text-sm font-semibold">Non planifiées</span>
        <span className="text-xs text-ink-3">{count}</span>
        <button type="button" onClick={onClose} className="ml-auto rounded p-0.5 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Fermer le panneau">
          <X size={15} />
        </button>
      </div>
      <p className="px-3 pb-2 text-xs text-ink-3">Glisse une tâche dans le calendrier pour lui donner une date.</p>
      <div ref={ref} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pb-4">
        {groups.map((g) => (
          <div key={g.name}>
            <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase">
              {g.color && <span className="size-2 rounded-full" style={{ background: g.color }} />}
              {g.name}
            </div>
            <div className="space-y-1">
              {g.items.map(({ task, entry }) => (
                <DraggableEntry key={task.id} entry={entry} payload={payloadOf(entry, data.settings.defaultDurationMin)} />
              ))}
            </div>
          </div>
        ))}
        {count === 0 && <p className="px-2 pt-6 text-center text-[13px] text-ink-3">Tout est planifié 🎉</p>}
      </div>
    </aside>
  )
}

/**
 * Panneau gauche ouvert par « ⋯ » dans la ligne « journée » de la vue semaine (calendrier.md l. 68) :
 * il ne se ferme que par le X, et ses tâches peuvent être glissées dans la grille.
 */
export function AllDayOverflowPanel({ day, entries }: { day: Date; entries: Entry[] }) {
  const defaultMinutes = useApp((s) => s.data.settings.defaultDurationMin)
  const ref = useDragContainer()
  const items = entriesOfDay(
    entries.filter((e) => e.allDay),
    day,
  )
  return (
    <div className="absolute top-2 bottom-2 left-2 z-20 flex w-[260px] animate-pop flex-col rounded-xl bg-white shadow-pop">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <span className="text-sm font-semibold first-letter:uppercase">{fmtDayLong(day)}</span>
        <span className="text-xs whitespace-nowrap text-ink-3">{items.length} sans heure</span>
        <button type="button" onClick={() => ui.set({ overflowDay: null })} className="ml-auto rounded p-0.5 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Fermer">
          <X size={15} />
        </button>
      </div>
      <div ref={ref} className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((e) => (
          <DraggableEntry key={e.key} entry={e} payload={payloadOf(e, defaultMinutes)} />
        ))}
      </div>
      <p className="border-t border-line px-3 py-2 text-xs text-ink-3">Glisse une tâche dans la grille pour lui donner une heure.</p>
    </div>
  )
}

/** Vue jour : colonne gauche avec toutes les tâches sans heure du jour (calendrier.md l. 69). */
export function DayNoTimeColumn({ day, entries }: { day: Date; entries: Entry[] }) {
  const defaultMinutes = useApp((s) => s.data.settings.defaultDurationMin)
  const ref = useDragContainer()
  const items = entriesOfDay(
    entries.filter((e) => e.allDay),
    day,
  )
  return (
    <aside className="flex w-[150px] shrink-0 flex-col border-r border-line md:w-[240px]">
      <div className="px-3 pt-3 pb-1 text-sm font-semibold">Sans heure</div>
      <p className="px-3 pb-2 text-xs text-ink-3">À glisser dans la journée.</p>
      <div ref={ref} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {items.map((e) => (
          <DraggableEntry key={e.key} entry={e} payload={payloadOf(e, defaultMinutes)} />
        ))}
        {items.length === 0 && <p className="px-2 pt-4 text-[13px] text-ink-3">Rien sans heure aujourd'hui.</p>}
      </div>
    </aside>
  )
}
