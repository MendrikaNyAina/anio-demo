import { fromKey, isoDay, toKey } from './dates'
import type { Task } from './types'

/**
 * État d'une case du suivi d'habitude (calendrier.md, « Page Suivi des habitudes ») :
 * - `none`   : aucun moment prévu ce jour-là (jour non coché, avant le début, après la fin) → blanc ;
 * - `future` : prévu, mais encore à venir → blanc ;
 * - `today`  : prévu aujourd'hui, pas encore fait ;
 * - `done`   : fait → couleur de la (sous-)catégorie ;
 * - `missed` : prévu dans le passé et pas fait → grisé.
 */
export type HabitCellState = 'none' | 'future' | 'today' | 'done' | 'missed'

/** Une habitude n'est plus en cours quand sa date de fin est passée. Sans date de fin, elle l'est toujours. */
export function isHabitEnded(task: Task, today = new Date()): boolean {
  const end = task.recurrence?.endDate
  return !!end && end < toKey(today)
}

export function isHabitScheduled(task: Task, date: Date): boolean {
  const rec = task.recurrence
  if (task.kind !== 'habit' || !rec) return false
  const key = toKey(date)
  if (key < rec.startDate || (rec.endDate && key > rec.endDate)) return false
  return rec.weekdays.includes(isoDay(date))
}

export function habitCellState(task: Task, date: Date, today = new Date()): HabitCellState {
  if (!isHabitScheduled(task, date)) return 'none'
  const key = toKey(date)
  if (task.occurrences[key]?.done) return 'done'
  const todayKey = toKey(today)
  if (key > todayKey) return 'future'
  return key === todayKey ? 'today' : 'missed'
}

export interface HabitYearStats {
  done: number
  missed: number
  /** Occurrences prévues jusqu'à aujourd'hui inclus (faites + ratées + aujourd'hui). */
  due: number
}

/** Bilan d'une habitude sur une année civile. */
export function habitYearStats(task: Task, year: number, today = new Date()): HabitYearStats {
  const stats: HabitYearStats = { done: 0, missed: 0, due: 0 }
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const state = habitCellState(task, d, today)
    if (state === 'done') stats.done++
    if (state === 'missed') stats.missed++
    if (state === 'done' || state === 'missed' || state === 'today') stats.due++
  }
  return stats
}

/** Années que couvre une habitude, pour la navigation (du début à la fin, ou à l'année en cours). */
export function habitYears(task: Task, today = new Date()): { first: number; last: number } {
  const rec = task.recurrence
  const first = rec ? fromKey(rec.startDate).getFullYear() : today.getFullYear()
  const last = rec?.endDate ? fromKey(rec.endDate).getFullYear() : Math.max(first, today.getFullYear())
  return { first, last }
}

export interface Tally {
  done: number
  /** Occurrences prévues et déjà commencées (faites + ratées + aujourd'hui). */
  due: number
}

export const rate = (t: Tally) => (t.due === 0 ? 0 : Math.round((t.done / t.due) * 100))

/** Parcourt chaque jour prévu de l'habitude, du début jusqu'à aujourd'hui (ou sa fin si elle est passée). */
function forEachDueDay(task: Task, today: Date, fn: (date: Date, state: HabitCellState) => void) {
  const rec = task.recurrence
  if (!rec) return
  const todayKey = toKey(today)
  const last = rec.endDate && rec.endDate < todayKey ? rec.endDate : todayKey
  for (let d = fromKey(rec.startDate); toKey(d) <= last; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const state = habitCellState(task, d, today)
    if (state === 'done' || state === 'missed' || state === 'today') fn(d, state)
  }
}

/**
 * Séries, comptées en occurrences prévues (un « lun, mer, ven » fait 3 fois d'affilée = série de 3).
 * Aujourd'hui pas encore coché ne casse pas la série en cours : la journée n'est pas finie.
 */
export function habitStreaks(task: Task, today = new Date()): { current: number; best: number } {
  let run = 0
  let best = 0
  forEachDueDay(task, today, (_, state) => {
    if (state === 'done') run++
    else if (state === 'missed') run = 0
    best = Math.max(best, run)
  })
  return { current: run, best }
}

/** Réussite mois par mois sur une année (12 entrées). */
export function habitMonthTallies(task: Task, year: number, today = new Date()): Tally[] {
  const months: Tally[] = Array.from({ length: 12 }, () => ({ done: 0, due: 0 }))
  forEachDueDay(task, today, (d, state) => {
    if (d.getFullYear() !== year) return
    months[d.getMonth()].due++
    if (state === 'done') months[d.getMonth()].done++
  })
  return months
}

/** Réussite par jour de la semaine (index 0 = lundi … 6 = dimanche), sur tout l'historique. */
export function habitWeekdayTallies(task: Task, today = new Date()): Tally[] {
  const days: Tally[] = Array.from({ length: 7 }, () => ({ done: 0, due: 0 }))
  forEachDueDay(task, today, (d, state) => {
    const i = isoDay(d) - 1
    days[i].due++
    if (state === 'done') days[i].done++
  })
  return days
}
