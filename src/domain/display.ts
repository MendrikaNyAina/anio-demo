import { differenceInCalendarDays, format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { fromKey, slotBounds } from './dates'
import type { CalendarEvent, DateKey, EventRepeat, Priority, Slot, Task, TaskKind } from './types'

const f = (d: Date, pattern: string) => format(d, pattern, { locale: fr })

export const fmtDay = (d: Date) => f(d, 'd MMM')
export const fmtDayLong = (d: Date) => f(d, 'EEEE d MMMM')
export const fmtTime = (d: Date) => f(d, 'HH:mm')
export const fmtDateTime = (d: Date) => f(d, 'd MMM HH:mm')
export const fmtKey = (key: DateKey) => fmtDay(fromKey(key))

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/** Version compacte pour les pastilles du calendrier : « 30m », « 2h », « 1h30 ». */
export function fmtDurationShort(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** « 13 oct. 14:00 → 15:00 », « 13 → 15 oct. », « 13 oct. ». */
export function fmtSlot(slot: Slot): string {
  if (slot.allDay) {
    return slot.startsOn === slot.endsOn ? fmtKey(slot.startsOn) : `${fmtKey(slot.startsOn)} → ${fmtKey(slot.endsOn)}`
  }
  const { start, end } = slotBounds(slot)
  return isSameDay(start, end) ? `${fmtDateTime(start)} → ${fmtTime(end)}` : `${fmtDateTime(start)} → ${fmtDateTime(end)}`
}

function edgeLabel(slot: Slot, edge: 'start' | 'end'): string {
  if (slot.allDay) return fmtKey(edge === 'start' ? slot.startsOn : slot.endsOn)
  return fmtDateTime(new Date(edge === 'start' ? slot.start : slot.end))
}

/**
 * Dates d'une ligne de tâche (calendrier.md l. 42) :
 * simple → début et fin ; étalée → premier début et dernière fin ; habitude → début → fin ou « … ».
 */
export function taskDisplayRange(task: Task): string {
  if (task.kind === 'habit') {
    const rec = task.recurrence
    if (!rec) return ''
    return `${fmtKey(rec.startDate)} → ${rec.endDate ? fmtKey(rec.endDate) : '…'}`
  }
  if (task.slots.length === 0) return 'Non planifiée'
  if (task.slots.length === 1) return fmtSlot(task.slots[0])
  const sorted = [...task.slots].sort((a, b) => +slotBounds(a).start - +slotBounds(b).start)
  const last = [...task.slots].sort((a, b) => +slotBounds(b).end - +slotBounds(a).end)[0]
  return `${edgeLabel(sorted[0], 'start')} → ${edgeLabel(last, 'end')}`
}

/** Non finies d'abord, puis les plus récentes en haut (la nouvelle ligne apparaît sous le « + »). */
export function sortTasks(tasks: Task[], doneOverride: Record<string, boolean> = {}): Task[] {
  const done = (t: Task) => (t.kind === 'habit' ? false : (doneOverride[t.id] ?? t.done))
  return [...tasks].sort((a, b) => Number(done(a)) - Number(done(b)) || b.createdAt.localeCompare(a.createdAt))
}

export function deadlineLabel(deadline: string, hasTime: boolean, now = new Date()): { text: string; tone: 'late' | 'soon' | 'ok' } {
  const date = hasTime ? new Date(deadline) : fromKey(deadline)
  const days = differenceInCalendarDays(date, now)
  const when = hasTime ? fmtDateTime(date) : fmtDay(date)
  if (days < 0) return { text: `${when} · en retard`, tone: 'late' }
  if (days === 0) return { text: `${when} · aujourd'hui`, tone: 'soon' }
  return { text: `${when} · J-${days}`, tone: days <= 7 ? 'soon' : 'ok' }
}

export const KIND_LABEL: Record<TaskKind | 'event', string> = {
  simple: 'Tâche simple',
  spread: 'Tâche étalée',
  habit: 'Habitude',
  event: 'Événement',
}

export const REPEAT_LABEL: Record<EventRepeat, string> = { none: 'Jamais', weekly: 'Semaine', monthly: 'Mois', yearly: 'Année' }

/**
 * « Chaque lundi », « Le 14 de chaque mois », « Chaque 14 octobre, jusqu'au 3 mars 2027 » ;
 * vide si l'événement ne se répète pas.
 */
export function fmtRepeat({ slot, repeat = 'none', repeatStart, repeatEnd }: Pick<CalendarEvent, 'slot' | 'repeat' | 'repeatStart' | 'repeatEnd'>): string {
  if (repeat === 'none') return ''
  const start = slotBounds(slot).start
  const rule = repeat === 'weekly' ? `Chaque ${f(start, 'EEEE')}` : repeat === 'monthly' ? `Le ${f(start, 'd')} de chaque mois` : `Chaque ${f(start, 'd MMMM')}`
  const year = (key: DateKey) => f(fromKey(key), 'd MMM yyyy')
  const bounds = [repeatStart && `à partir du ${year(repeatStart)}`, repeatEnd && `jusqu'au ${year(repeatEnd)}`].filter(Boolean)
  return bounds.length ? `${rule}, ${bounds.join(' ')}` : rule
}

export const PRIORITY_LABEL: Record<Priority, string> = { high: 'Haute', medium: 'Moyenne', low: 'Basse' }
export const PRIORITY_COLOR: Record<Priority, string> = { high: '#D44C47', medium: '#D9730D', low: '#337EA9' }
