import frLocale from '@fullcalendar/core/locales/fr'
import type {
  DateSelectArg,
  DatesSetArg,
  DayCellContentArg,
  DayHeaderContentArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
  MoreLinkArg,
  MoreLinkSimpleAction,
} from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DateClickArg, type DropArg, type EventResizeDoneArg } from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { addDays, addMinutes, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react'
import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { CalendarEntry } from '@/components/CalendarEntry'
import { Button } from '@/components/ui/button'
import { MatrixPage } from './MatrixPage'
import { ModeSwitch } from './ModeSwitch'
import { clampToDay, isSingleDay, toKey, type Range } from '@/domain/dates'
import { buildEntries, type Entry } from '@/domain/entries'
import type { CalendarMode, Slot } from '@/domain/types'
import { cn, newId } from '@/lib/utils'
import { activeView, useApp, useTheme } from '@/store/appStore'
import { openEntry } from '@/store/entryActions'
import { ui, useUi } from '@/store/uiStore'
import type { DragPayload } from './DraggableEntry'
import { FiltersBar } from './FiltersBar'
import { DateJumpPicker } from './DateJumpPicker'
import { AllDayOverflowPanel, DayNoTimeColumn, UnscheduledPanel } from './Panels'
import { PeriodProgress } from './PeriodProgress'
import { TypeLegend } from './TypeLegend'
import { ViewTabs } from './ViewTabs'

const VIEW_TYPE: Record<CalendarMode, string> = { month: 'dayGridMonth', week: 'timeGridWeek', day: 'timeGridDay' }
const MODES: CalendarMode[] = ['month', 'week', 'day']

/** Construit le créneau correspondant à une position dans le calendrier. */
function slotAt(id: string, start: Date, end: Date | null, allDay: boolean, defaultMinutes: number): Slot {
  if (allDay) {
    const lastDay = end ? addDays(end, -1) : start
    return { id, allDay: true, startsOn: toKey(start), endsOn: toKey(lastDay < start ? start : lastDay) }
  }
  return { id, allDay: false, start: start.toISOString(), end: (end ?? addMinutes(start, defaultMinutes)).toISOString() }
}

export function CalendarPage() {
  const { mode: rawMode } = useParams()
  if (rawMode === 'matrix') return <MatrixPage />
  const mode = MODES.includes(rawMode as CalendarMode) ? (rawMode as CalendarMode) : null
  if (!mode) return <Navigate to="/calendar/week" replace />
  return <CalendarScreen key={mode} mode={mode} />
}

function CalendarScreen({ mode }: { mode: CalendarMode }) {
  const data = useApp((s) => s.data)
  const prefs = useApp((s) => s.prefs)
  const app = useApp.getState()
  const view = activeView(data, prefs, mode)
  const editingKey = useUi((s) => s.editingKey)
  const journal = useTheme() === 'journal'
  const overflowDay = useUi((s) => s.overflowDay)
  const calendarRef = useRef<FullCalendar>(null)
  const lastClick = useRef<{ at: number; date: Date; allDay: boolean } | null>(null)
  const pendingDouble = useRef<{ at: number; x: number; y: number } | null>(null)
  const [range, setRange] = useState<Range | null>(null)
  const [title, setTitle] = useState('')
  const [initialDate] = useState(() => new Date(prefs.calendarDate))
  const defaultMinutes = data.settings.defaultDurationMin

  const entries = useMemo(() => (range ? buildEntries(data, { range, filters: view.filters }) : []), [data, range, view.filters])

  const events = useMemo<EventInput[]>(
    () =>
      entries.map((e) => ({
        id: e.key,
        title: e.title,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
        editable: editingKey !== (e.taskId ?? e.eventId),
        // Une tâche « journée » tient sur un seul jour : pas de poignée pour l'étirer sur les suivants.
        durationEditable: e.allDay && e.type !== 'event' ? false : undefined,
        extendedProps: { entry: e, weight: e.weight },
      })),
    [entries, editingKey],
  )

  const api = () => calendarRef.current?.getApi()

  // ── Déplacements ─────────────────────────────────────────────
  /** Applique un déplacement / redimensionnement à la donnée sous-jacente de l'entrée. */
  const moveEntry = (entry: Entry, start: Date, end: Date | null, allDay: boolean, revert?: () => void) => {
    if (entry.eventId) return app.updateEvent(entry.eventId, { slot: slotAt(entry.eventId, start, end, allDay, defaultMinutes) })
    if (!entry.taskId) return
    if (entry.type === 'habit' && entry.occurrenceDate) {
      // Une occurrence déplacée devient une exception pour ce jour-là.
      if (allDay) {
        if (!isSameDay(start, entry.start)) {
          revert?.()
          toast('Une habitude sans heure reste sur son jour', { description: "Glisse-la dans la grille horaire pour lui donner une heure." })
          return
        }
        return app.setOccurrence(entry.taskId, entry.occurrenceDate, { start: undefined, end: undefined })
      }
      const task = data.tasks.find((t) => t.id === entry.taskId)
      const minutes = task?.recurrence?.durationMin ?? defaultMinutes
      return app.setOccurrence(entry.taskId, entry.occurrenceDate, { start: start.toISOString(), end: (end ?? addMinutes(start, minutes)).toISOString() })
    }
    if (entry.slotId) app.setSlot(entry.taskId, clampToDay(slotAt(entry.slotId, start, end, allDay, defaultMinutes)))
  }

  const onEventDrop = (info: EventDropArg) => {
    const entry = info.event.extendedProps.entry as Entry
    // Passage « journée » → grille : pas encore de fin, on applique la durée par défaut.
    const end = info.oldEvent.allDay && !info.event.allDay ? null : info.event.end
    moveEntry(entry, info.event.start!, end, info.event.allDay, info.revert)
  }

  const onEventResize = (info: EventResizeDoneArg) => moveEntry(info.event.extendedProps.entry as Entry, info.event.start!, info.event.end, info.event.allDay, info.revert)

  /** Dépôt depuis un panneau (non planifiées, « ⋯ », colonne « sans heure »). */
  const onDrop = (info: DropArg) => {
    const payload = JSON.parse(info.draggedEl.dataset.drag ?? '{}') as DragPayload
    const start = info.date
    const end = info.allDay ? null : addMinutes(start, payload.minutes)
    if (payload.eventId) return app.updateEvent(payload.eventId, { slot: slotAt(payload.eventId, start, end, info.allDay, defaultMinutes) })
    if (!payload.taskId) return
    if (payload.date) {
      if (info.allDay) return
      return app.setOccurrence(payload.taskId, payload.date, { start: start.toISOString(), end: end!.toISOString() })
    }
    if (payload.slotId) return app.setSlot(payload.taskId, clampToDay(slotAt(payload.slotId, start, end, info.allDay, defaultMinutes)))
    app.addSlot(payload.taskId, clampToDay(slotAt(newId(), start, end, info.allDay, defaultMinutes)))
  }

  // ── Création ─────────────────────────────────────────────────
  const openChooser = (x: number, y: number, start: Date, end: Date, allDay: boolean, flow: 'quick' | 'form') =>
    ui.set({ createChooser: { x, y, start, end, allDay, flow } })

  const onSelect = (info: DateSelectArg) => {
    const x = info.jsEvent?.clientX ?? window.innerWidth / 2
    const y = info.jsEvent?.clientY ?? window.innerHeight / 3
    openChooser(x, y, info.start, info.end, info.allDay, 'quick')
    api()?.unselect()
  }

  // Double-clic dans la grille → entrée de la durée par défaut (décision 7).
  // FullCalendar n'a pas de double-clic : on combine son `dateClick` (qui donne la case)
  // et l'événement natif `dblclick`. Selon la vitesse du geste, l'un ou l'autre arrive en premier.
  const createAt = (date: Date, allDay: boolean, x: number, y: number) =>
    openChooser(x, y, date, allDay ? addDays(date, 1) : addMinutes(date, defaultMinutes), allDay, 'quick')

  const onDateClick = (info: DateClickArg) => {
    const dbl = pendingDouble.current
    if (dbl && Date.now() - dbl.at < 600) {
      pendingDouble.current = null
      return createAt(info.date, info.allDay, dbl.x, dbl.y)
    }
    lastClick.current = { at: Date.now(), date: info.date, allDay: info.allDay }
  }

  const onGridDoubleClick = (e: MouseEvent) => {
    if (mode === 'month' || (e.target as HTMLElement).closest('.fc-event, .fc-more-link')) return
    const last = lastClick.current
    lastClick.current = null
    if (last && Date.now() - last.at < 800) return createAt(last.date, last.allDay, e.clientX, e.clientY)
    pendingDouble.current = { x: e.clientX, y: e.clientY, at: Date.now() }
  }

  /**
   * Clic droit sur une entrée. FullCalendar redessine l'entrée au `mousedown`, si bien que le
   * `contextmenu` vise son conteneur `.fc-event` : on l'intercepte donc au niveau de la grille.
   */
  const onGridContextMenu = (e: MouseEvent) => {
    const key = (e.target as HTMLElement).closest<HTMLElement>('[data-entry-key]')?.dataset.entryKey
    const entry = key ? entries.find((x) => x.key === key) : undefined
    if (!entry) return
    e.preventDefault()
    ui.set({ entryMenu: { x: e.clientX, y: e.clientY, entry } })
  }

  const commitQuickTitle = (entry: Entry, title: string) => {
    ui.set({ editingKey: null })
    if (entry.eventId) app.updateEvent(entry.eventId, { title })
    else if (entry.taskId) app.updateTask(entry.taskId, { title })
    // Réglage : ouvrir ou non la page (tâche) ou le formulaire (événement) après une création rapide.
    if (useApp.getState().data.settings.openFormAfterQuickCreate) openEntry({ ...entry, title })
  }

  const cancelQuick = (entry: Entry) => {
    ui.set({ editingKey: null })
    if (entry.eventId) app.deleteEvent(entry.eventId)
    else if (entry.taskId) app.deleteTask(entry.taskId, { permanent: true })
  }

  // ── Rendu ────────────────────────────────────────────────────
  const renderEvent = (arg: EventContentArg) => {
    const entry = arg.event.extendedProps.entry as Entry | undefined
    if (!entry) return null
    const editing = !!editingKey && (entry.taskId === editingKey || entry.eventId === editingKey)
    const variant = arg.view.type.startsWith('timeGrid') && !arg.event.allDay ? 'block' : 'pill'
    return <CalendarEntry entry={entry} variant={variant} editing={editing} onCommitTitle={(t) => commitQuickTitle(entry, t)} onCancelTitle={() => cancelQuick(entry)} />
  }

  // En-tête des vues semaine / jour (inspiration 7.jpg) : nom du jour, puis numéro ; aujourd'hui en pastille.
  const renderDayHeader = (arg: DayHeaderContentArg) => (
    <div className="flex flex-col items-center gap-1 py-1">
      <span className={cn('text-xs', arg.isToday ? 'font-semibold text-ink' : 'font-medium text-ink-3')}>{arg.text}</span>
      <span className={cn('flex size-8 items-center justify-center rounded-[10px] text-base', arg.isToday ? 'bg-accent font-semibold text-white' : 'text-ink-3')}>
        {arg.date.getDate()}
      </span>
    </div>
  )

  // Journal : « + » à gauche, date à droite (vue mois façon 6.jpg). Notion : date à gauche, « + » à droite.
  const renderDayCell = (arg: DayCellContentArg) => (
    <div className={cn('flex w-full items-center justify-between px-1.5 pt-1', !journal && 'flex-row-reverse')}>
      <button
        type="button"
        title="Ajouter"
        aria-label="Ajouter"
        onClick={(e) => {
          e.stopPropagation()
          openChooser(e.clientX, e.clientY, arg.date, addDays(arg.date, 1), true, 'form')
        }}
        className={cn('day-add flex size-5 items-center justify-center rounded text-ink-3 opacity-0 transition-opacity hover:text-ink', journal ? 'hover:bg-white' : 'hover:bg-hover')}
      >
        <Plus size={14} />
      </button>
      <span className={cn('flex size-6 items-center justify-center rounded-full text-xs', arg.isToday ? 'bg-accent font-semibold text-white' : arg.isOther ? (journal ? 'text-[#b8b7c4]' : 'text-ink-3') : 'text-ink-2')}>
        {arg.date.getDate()}
      </span>
    </div>
  )

  const onMoreLinkClick = (arg: MoreLinkArg) => {
    if (mode === 'month') return 'popover' as MoreLinkSimpleAction
    ui.set({ overflowDay: arg.date })
    // Valeur non textuelle : FullCalendar n'ouvre alors ni popover ni autre vue.
    return true as unknown as MoreLinkSimpleAction
  }

  const isWeek = mode === 'week'
  const anchor = range ? (mode === 'day' ? range.start : new Date((+range.start + +range.end) / 2)) : new Date()
  const unscheduledOpen = view.unscheduledOpen
  const toggleUnscheduled = () => app.updateView(view.id, { unscheduledOpen: !unscheduledOpen })

  // Morceaux de l'en-tête, placés différemment selon le thème.
  const modeSwitch = <ModeSwitch value={mode} />
  const unscheduledButton = journal ? (
    <button
      type="button"
      onClick={toggleUnscheduled}
      title="Tâches non planifiées"
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-full border-2 border-[#A3A8EE] px-3 font-plate text-[13px] font-semibold text-[#2F2B6E] shadow-[0_3px_0_#DCDDFF] transition-colors hover:bg-[#DCDDFF]',
        unscheduledOpen ? 'bg-[#DCDDFF]' : 'bg-[#F4F3FF]',
      )}
    >
      <Inbox size={14} /> {unscheduledOpen ? 'Masquer' : 'Non planifiées'}
    </button>
  ) : (
    <Button size="sm" variant={unscheduledOpen ? 'subtle' : 'outline'} onClick={toggleUnscheduled} title="Tâches non planifiées">
      <Inbox size={14} /> {unscheduledOpen ? 'Masquer' : 'Non planifiées'}
    </Button>
  )
  const datePicker = <DateJumpPicker mode={mode} title={title} current={anchor} onPick={(date) => api()?.gotoDate(date)} />
  const dateNav = (
    <div className="flex items-center gap-0.5">
      <Button size="icon" variant="subtle" onClick={() => api()?.prev()} aria-label="Précédent">
        <ChevronLeft size={17} />
      </Button>
      <Button size="sm" variant="outline" onClick={() => api()?.today()}>
        Aujourd'hui
      </Button>
      <Button size="icon" variant="subtle" onClick={() => api()?.next()} aria-label="Suivant">
        <ChevronRight size={17} />
      </Button>
    </div>
  )
  const filtersBar = <FiltersBar filters={view.filters} onChange={(filters) => app.updateView(view.id, { filters })} />
  // En haut à droite de l'en-tête : la vue et « Non planifiées », la légende des types juste dessous
  // (journal : la pilule « légende » s'aligne sur le bord gauche du sélecteur Mois / Semaine / Jour).
  const headerActions = (
    <div className={cn('flex flex-col gap-1', journal ? 'items-start' : 'items-end')}>
      <div className="flex items-center gap-2">
        {modeSwitch}
        {unscheduledButton}
      </div>
      <TypeLegend theme={journal ? 'journal' : 'notion'} />
    </div>
  )
  const monthBlocks = journal && mode === 'month'

  return (
    // Téléphone : la page défile, pour que la grille garde une hauteur utilisable sous l'en-tête.
    <div className="flex h-full flex-col max-md:overflow-y-auto">
      {journal ? (
        <>
          <div className="flex justify-end px-4 pt-4 pb-3 sm:px-6">{headerActions}</div>

          <ViewTabs mode={mode} active={view} />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-3 pb-3 sm:px-6">
            <div className="flex items-center gap-3">
              {datePicker}
              {dateNav}
            </div>
            <div className="ml-auto">{filtersBar}</div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end px-4 pt-4 pb-2 sm:px-8">{headerActions}</div>

          <div className="pl-2 sm:pl-8">
            <ViewTabs mode={mode} active={view} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3 pb-2 sm:px-6">
            {datePicker}
            {dateNav}
          </div>

          <div className="flex flex-wrap items-center gap-3 px-4 pb-3 sm:px-6">{filtersBar}</div>
        </>
      )}

      {mode !== 'month' && <PeriodProgress entries={entries} period={mode} />}

      {/* `relative` : sur téléphone, le panneau « Non planifiées » se pose par-dessus la grille. */}
      <div className={cn('relative flex min-h-0 flex-1 max-md:min-h-[560px]', !monthBlocks && 'border-t border-line')}>
        {mode === 'day' && <DayNoTimeColumn day={anchor} entries={entries} />}
        <div className={cn('relative min-w-0 flex-1', monthBlocks ? 'px-2 pt-2 pb-4 sm:px-4' : 'pl-1')} onDoubleClick={onGridDoubleClick} onContextMenu={onGridContextMenu}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={VIEW_TYPE[mode]}
            initialDate={initialDate}
            locale={frLocale}
            firstDay={1}
            headerToolbar={false}
            height="100%"
            nowIndicator
            editable
            eventResizableFromStart
            // Déplacer ou redimensionner une tâche ne doit pas la faire passer minuit (un créneau = un jour).
            eventAllow={(span, moving) => (moving?.extendedProps.entry as Entry | undefined)?.type === 'event' || isSingleDay(span)}
            droppable
            selectable={mode !== 'month'}
            selectMinDistance={6}
            selectMirror
            dayMaxEvents={3}
            eventOrder="-weight,title"
            eventOrderStrict
            scrollTime="07:00:00"
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            allDaySlot={mode !== 'day'}
            allDayText="Journée"
            defaultTimedEventDuration={{ minutes: defaultMinutes }}
            dayHeaderFormat={mode === 'month' || journal ? { weekday: 'short' } : { weekday: 'short', day: 'numeric' }}
            dayHeaderContent={mode !== 'month' && journal ? renderDayHeader : undefined}
            events={events}
            eventContent={renderEvent}
            eventDidMount={(info) => {
              info.el.dataset.entryKey = info.event.id
            }}
            dayCellContent={mode === 'month' ? renderDayCell : undefined}
            moreLinkClick={onMoreLinkClick}
            moreLinkContent={(arg) => (mode === 'month' ? `+${arg.num} autre${arg.num > 1 ? 's' : ''}` : `⋯ +${arg.num}`)}
            datesSet={(arg: DatesSetArg) => {
              setRange({ start: arg.start, end: arg.end })
              setTitle(arg.view.title)
              app.setPrefs({ calendarDate: arg.view.calendar.getDate().toISOString() })
              if (useUi.getState().overflowDay) ui.set({ overflowDay: null })
            }}
            eventClick={(info: EventClickArg) => {
              const entry = info.event.extendedProps.entry as Entry
              if (editingKey && (entry.taskId === editingKey || entry.eventId === editingKey)) return
              openEntry(entry)
            }}
            eventDrop={onEventDrop}
            eventResize={onEventResize}
            drop={onDrop}
            select={onSelect}
            dateClick={mode === 'month' ? undefined : onDateClick}
          />
          {isWeek && overflowDay && <AllDayOverflowPanel day={overflowDay} entries={entries} />}
        </div>
        {unscheduledOpen && <UnscheduledPanel filters={view.filters} onClose={toggleUnscheduled} />}
      </div>
    </div>
  )
}
