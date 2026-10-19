import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Inbox, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { CalendarEntry } from '@/components/CalendarEntry'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/controls'
import { taskDisplayRange } from '@/domain/display'
import { buildMatrix, periodRange, QUADRANTS, quadrantPatch, shiftPeriod } from '@/domain/eisenhower'
import { unscheduledEntry } from '@/domain/entries'
import { buildLookup, type Lookup } from '@/domain/lookup'
import { tint } from '@/domain/style'
import type { CalendarMode, Quadrant, Task } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
import { ui } from '@/store/uiStore'
import { ModeSwitch } from './ModeSwitch'

// Vue « Matrice d'Eisenhower » du calendrier (comme dans TickTick) : les tâches de la période
// rangées par urgence × importance. Celles qui ne sont pas encore classées attendent à droite,
// dans « À classer » ; on les glisse dans un quadrant (ou d'un quadrant à l'autre).

const UNCLASSIFIED = 'unclassified'

const PERIOD_LABEL = (mode: CalendarMode, anchor: Date) => {
  const { start, end } = periodRange(mode, anchor)
  if (mode === 'day') return format(start, 'EEEE d MMMM yyyy', { locale: fr })
  if (mode === 'month') return format(start, 'MMMM yyyy', { locale: fr })
  const last = new Date(+end - 1)
  return start.getMonth() === last.getMonth()
    ? `${format(start, 'd', { locale: fr })} – ${format(last, 'd MMMM yyyy', { locale: fr })}`
    : `${format(start, 'd MMM', { locale: fr })} – ${format(last, 'd MMM yyyy', { locale: fr })}`
}

export function MatrixPage() {
  const data = useApp((s) => s.data)
  const period: CalendarMode = useApp((s) => s.prefs.matrixPeriod) ?? 'week'
  const setPrefs = useApp((s) => s.setPrefs)
  const updateTask = useApp((s) => s.updateTask)
  const journal = useTheme() === 'journal'
  const [anchor, setAnchor] = useState(() => new Date())
  const [panelOpen, setPanelOpen] = useState(true)
  const [dragging, setDragging] = useState<Task | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const lookup = useMemo(() => buildLookup(data), [data])
  const matrix = useMemo(() => buildMatrix(data, periodRange(period, anchor)), [data, period, anchor])
  const colors = data.settings.eisenhowerColors

  const onDragStart = (e: DragStartEvent) => setDragging(data.tasks.find((t) => t.id === e.active.id) ?? null)
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const target = e.over?.id
    if (!target) return
    const taskId = String(e.active.id)
    if (target === UNCLASSIFIED) updateTask(taskId, { urgent: undefined })
    else updateTask(taskId, quadrantPatch(target as Quadrant, data.tasks.find((t) => t.id === taskId)?.priority))
  }

  const panelButton = journal ? (
    <button
      type="button"
      onClick={() => setPanelOpen((v) => !v)}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-full border-2 border-[#A3A8EE] px-3 font-plate text-[13px] font-semibold text-[#2F2B6E] shadow-[0_3px_0_#DCDDFF] transition-colors hover:bg-[#DCDDFF]',
        panelOpen ? 'bg-[#DCDDFF]' : 'bg-[#F4F3FF]',
      )}
    >
      <Inbox size={14} /> {panelOpen ? 'Masquer' : `À classer · ${matrix.unclassified.length}`}
    </button>
  ) : (
    <Button size="sm" variant={panelOpen ? 'subtle' : 'outline'} onClick={() => setPanelOpen((v) => !v)}>
      <Inbox size={14} /> {panelOpen ? 'Masquer' : `À classer · ${matrix.unclassified.length}`}
    </Button>
  )
  const headerActions = (
    <div className={cn('flex items-center gap-2', !journal && 'flex-wrap justify-end')}>
      <ModeSwitch value="matrix" />
      {panelButton}
    </div>
  )

  const periodBar = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Segmented<CalendarMode>
        value={period}
        onChange={(matrixPeriod) => setPrefs({ matrixPeriod })}
        options={[
          { value: 'day', label: 'Jour' },
          { value: 'week', label: 'Semaine' },
          { value: 'month', label: 'Mois' },
        ]}
      />
      <div className="flex items-center gap-0.5">
        <Button size="icon" variant="subtle" onClick={() => setAnchor((a) => shiftPeriod(period, a, -1))} aria-label="Période précédente">
          <ChevronLeft size={17} />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAnchor(new Date())}>
          Aujourd'hui
        </Button>
        <Button size="icon" variant="subtle" onClick={() => setAnchor((a) => shiftPeriod(period, a, 1))} aria-label="Période suivante">
          <ChevronRight size={17} />
        </Button>
      </div>
      <span className={cn('text-[15px] font-semibold first-letter:uppercase', journal && 'font-plate text-[#2F2B6E]')}>{PERIOD_LABEL(period, anchor)}</span>
    </div>
  )

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="flex h-full flex-col max-md:overflow-y-auto">
        <div className="flex flex-wrap-reverse items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-6">
          {periodBar}
          {headerActions}
        </div>

        <div className={cn('relative flex min-h-0 flex-1 max-md:min-h-[640px]', !journal && 'border-t border-line')}>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:p-4 md:grid-cols-2 md:grid-rows-2">
            {QUADRANTS.map((q) => (
              <QuadrantBox key={q.id} id={q.id} title={q.title} hint={q.hint} color={colors[q.id]} count={matrix.quadrants[q.id].length} journal={journal}>
                {matrix.quadrants[q.id].map((t) => (
                  <MatrixTask key={t.id} task={t} lookup={lookup} />
                ))}
              </QuadrantBox>
            ))}
          </div>
          {panelOpen && <UnclassifiedPanel tasks={matrix.unclassified} lookup={lookup} journal={journal} onClose={() => setPanelOpen(false)} />}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{dragging && <div className="w-[260px] rotate-2 opacity-90">{<TaskRow task={dragging} lookup={lookup} />}</div>}</DragOverlay>
    </DndContext>
  )
}

function QuadrantBox({ id, title, hint, color, count, journal, children }: { id: Quadrant; title: string; hint: string; color: string; count: number; journal: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={cn(
        'flex min-h-[220px] flex-col overflow-hidden transition-shadow',
        journal ? 'rounded-[20px] border-2 bg-white shadow-[0_4px_0_#DCDDFF]' : 'rounded-lg border bg-white',
        isOver && 'ring-2 ring-offset-2',
      )}
      style={{ borderColor: journal ? tint(color, 45) : tint(color, 35), ['--tw-ring-color' as string]: color }}
    >
      <header className={cn('flex items-center gap-2 px-3 py-2', journal && 'font-plate')} style={{ background: tint(color, journal ? 18 : 10) }}>
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <h3 className={cn('min-w-0 flex-1 truncate text-sm font-semibold', journal && 'text-[#2F2B6E]')}>{title}</h3>
        <span className="shrink-0 text-xs text-ink-2">{hint}</span>
        <span className="shrink-0 rounded-full bg-white/80 px-1.5 text-xs font-semibold tabular-nums">{count}</span>
      </header>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {children}
        {count === 0 && <p className="px-2 pt-6 text-center text-[13px] text-ink-3">Glisse une tâche ici</p>}
      </div>
    </section>
  )
}

function UnclassifiedPanel({ tasks, lookup, journal, onClose }: { tasks: Task[]; lookup: Lookup; journal: boolean; onClose: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNCLASSIFIED })
  return (
    <aside
      ref={setNodeRef}
      className={cn(
        'flex w-[264px] shrink-0 flex-col border-l border-line max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-20 max-md:w-[min(300px,85vw)] max-md:shadow-pop',
        journal ? 'bg-[#F4F3FF] font-plate' : 'bg-[#fbfbfa]',
        isOver && 'bg-accent-soft',
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Inbox size={15} className="text-ink-2" />
        <span className={cn('text-sm font-semibold', journal && 'text-[#2F2B6E]')}>À classer</span>
        <span className="text-xs text-ink-3">{tasks.length}</span>
        <button type="button" onClick={onClose} className="ml-auto rounded p-0.5 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Fermer le panneau">
          <X size={15} />
        </button>
      </div>
      <p className="px-3 pb-2 text-xs text-ink-3">Tâches de la période sans urgence ou sans importance. Glisse-les dans un quadrant.</p>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 pb-4">
        {tasks.map((t) => (
          <MatrixTask key={t.id} task={t} lookup={lookup} />
        ))}
        {tasks.length === 0 && <p className="px-2 pt-6 text-center text-[13px] text-ink-3">Tout est classé 🎉</p>}
      </div>
    </aside>
  )
}

/** Tâche glissable : même rendu que dans les panneaux du calendrier, avec ses dates en sous-titre. */
function MatrixTask({ task, lookup }: { task: Task; lookup: Lookup }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => ui.openPeek(task.id)}
      className={cn('cursor-grab touch-none active:cursor-grabbing', isDragging && 'opacity-30')}
    >
      <TaskRow task={task} lookup={lookup} />
    </div>
  )
}

function TaskRow({ task, lookup }: { task: Task; lookup: Lookup }) {
  const base = unscheduledEntry(task, lookup)
  const entry = { ...base, subtitle: [taskDisplayRange(task), base.subtitle].filter(Boolean).join(' · ') }
  return <CalendarEntry entry={entry} variant="row" />
}
