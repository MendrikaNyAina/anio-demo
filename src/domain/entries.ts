import { addDays } from 'date-fns'
import { expandHabit } from './habits'
import { buildLookup, type Lookup } from './lookup'
import { minutesBetween, overlaps, slotBounds, toKey, type Range } from './dates'
import { resolveTaskStyle, type ResolvedStyle } from './style'
import { isTaskVisible, passesKind, passesStatus } from './visibility'
import type { CalendarFilters, DataState, DateKey, EntryType, ID, Priority, Slot, Task } from './types'

/**
 * Une entrée affichable : un créneau de tâche, une occurrence d'habitude ou un événement.
 * C'est le modèle unique consommé par le calendrier, les panneaux et le Bilan.
 */
export interface Entry {
  key: string
  type: EntryType
  title: string
  start: Date
  /** Exclusive. Pour une journée entière : lendemain minuit. */
  end: Date
  allDay: boolean
  /** `undefined` pour un événement (pas de checkbox). */
  done?: boolean
  style: ResolvedStyle | null
  eventColor?: string
  priority?: Priority
  subtitle?: string
  /** Sert au tri « les plus longues d'abord » de la vue mois. */
  weight: number
  taskId?: ID
  slotId?: ID
  occurrenceDate?: DateKey
  eventId?: ID
  notionSource?: string
}

export interface BuildOptions {
  range: Range
  filters?: CalendarFilters
  /** Respecter les switchs « afficher dans le calendrier ». Faux pour le Bilan. */
  respectSwitches?: boolean
}

function subtitleOf(task: Task, lookup: Lookup): string | undefined {
  if (task.source) return lookup.sources.get(task.source.sourceId)?.name
  const sub = task.primarySubcategoryId ? lookup.subcategories.get(task.primarySubcategoryId) : undefined
  if (sub) return sub.name
  const cat = task.primaryCategoryId ? lookup.categories.get(task.primaryCategoryId) : undefined
  return cat?.name
}

function slotEntry(task: Task, slot: Slot, base: Omit<Entry, 'key' | 'start' | 'end' | 'allDay' | 'weight'>, defaultDuration: number): Entry {
  const { start, end } = slotBounds(slot)
  return {
    ...base,
    key: `${task.id}::${slot.id}`,
    slotId: slot.id,
    start,
    end,
    allDay: slot.allDay,
    // Une tâche « sans heure » n'a pas de durée connue : on lui donne la durée par défaut.
    weight: slot.allDay ? defaultDuration : minutesBetween(start, end),
  }
}

export function buildEntries(data: DataState, options: BuildOptions): Entry[] {
  const { range, filters, respectSwitches = true } = options
  const lookup = buildLookup(data)
  const defaultDuration = data.settings.defaultDurationMin
  const out: Entry[] = []

  for (const task of data.tasks) {
    if (!isTaskVisible(task, data, lookup, filters, respectSwitches)) continue
    const base = {
      type: task.kind,
      title: task.title,
      style: task.source ? null : resolveTaskStyle(task, lookup),
      priority: task.priority,
      subtitle: subtitleOf(task, lookup),
      taskId: task.id,
      notionSource: task.source ? lookup.sources.get(task.source.sourceId)?.name : undefined,
    } as const

    if (task.kind === 'habit') {
      for (const occ of expandHabit(task, range)) {
        if (filters && !passesStatus(occ.done, filters)) continue
        const allDay = !occ.start
        const start = occ.start ?? new Date(`${occ.date}T00:00:00`)
        const end = occ.end ?? addDays(start, 1)
        out.push({
          ...base,
          key: `${task.id}::occ::${occ.date}`,
          occurrenceDate: occ.date,
          done: occ.done,
          start,
          end,
          allDay,
          weight: allDay ? defaultDuration : minutesBetween(start, end),
        })
      }
      continue
    }

    if (filters && !passesStatus(task.done, filters)) continue
    for (const slot of task.slots) {
      if (!overlaps(slotBounds(slot), range)) continue
      out.push(slotEntry(task, slot, { ...base, done: task.done }, defaultDuration))
    }
  }

  if (!respectSwitches || data.settings.showPlatformTasks) {
    for (const ev of data.events) {
      if (filters && !passesKind('event', filters)) continue
      const bounds = slotBounds(ev.slot)
      if (!overlaps(bounds, range)) continue
      out.push({
        key: `ev::${ev.id}`,
        type: 'event',
        title: ev.title,
        start: bounds.start,
        end: bounds.end,
        allDay: ev.slot.allDay,
        style: null,
        eventColor: ev.color,
        weight: ev.slot.allDay ? defaultDuration : minutesBetween(bounds.start, bounds.end),
        eventId: ev.id,
      })
    }
  }

  return out
}

/** Tâches sans aucune date (panneau « non planifiées »). Les habitudes ont toujours des dates. */
export function unscheduledTasks(data: DataState, filters: CalendarFilters | undefined): Task[] {
  const lookup = buildLookup(data)
  return data.tasks.filter(
    (t) =>
      t.kind !== 'habit' &&
      t.slots.length === 0 &&
      isTaskVisible(t, data, lookup, filters, true) &&
      (!filters || passesStatus(t.done, filters)),
  )
}

/** Une tâche non planifiée présentée comme une entrée (pour les panneaux). */
export function unscheduledEntry(task: Task, lookup: Lookup): Entry {
  const now = new Date()
  return {
    key: `${task.id}::unscheduled`,
    type: task.kind,
    title: task.title,
    start: now,
    end: now,
    allDay: true,
    done: task.done,
    style: task.source ? null : resolveTaskStyle(task, lookup),
    priority: task.priority,
    subtitle: subtitleOf(task, lookup),
    weight: 0,
    taskId: task.id,
    notionSource: task.source ? lookup.sources.get(task.source.sourceId)?.name : undefined,
  }
}

/** Entrées qui touchent un jour donné. */
export const entriesOfDay = (entries: Entry[], day: Date) => {
  const key = toKey(day)
  return entries.filter((e) => toKey(e.start) === key || (toKey(e.start) < key && key < toKey(e.end)))
}
