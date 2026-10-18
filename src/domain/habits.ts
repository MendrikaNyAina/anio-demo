import { addDays, addMinutes, max, min } from 'date-fns'
import { atTime, fromKey, isoDay, toKey, type Range } from './dates'
import type { DateKey, Task } from './types'

export interface HabitOccurrence {
  date: DateKey
  done: boolean
  /** Absents = occurrence sans heure (affichée en journée entière). */
  start?: Date
  end?: Date
}

/**
 * Occurrences d'une habitude dans une période. Elles sont calculées, jamais stockées :
 * seules les exceptions (cochée, heure choisie ce jour-là) sont dans `task.occurrences`.
 */
export function expandHabit(task: Task, range: Range): HabitOccurrence[] {
  const rec = task.recurrence
  if (task.kind !== 'habit' || !rec || rec.weekdays.length === 0) return []

  const first = max([fromKey(rec.startDate), range.start])
  const lastExclusive = rec.endDate ? min([addDays(fromKey(rec.endDate), 1), range.end]) : range.end
  const out: HabitOccurrence[] = []

  // Itération jour par jour en heure locale : `atTime` recalcule l'heure chaque jour,
  // donc une habitude à 8 h reste à 8 h après un changement d'heure.
  for (let day = first; day < lastExclusive; day = addDays(day, 1)) {
    if (!rec.weekdays.includes(isoDay(day))) continue
    const date = toKey(day)
    const exception = task.occurrences[date]
    const occ: HabitOccurrence = { date, done: exception?.done ?? false }
    if (exception?.start && exception.end) {
      occ.start = new Date(exception.start)
      occ.end = new Date(exception.end)
    } else if (rec.startTime) {
      occ.start = atTime(date, rec.startTime)
      occ.end = addMinutes(occ.start, rec.durationMin)
    }
    out.push(occ)
  }
  return out
}

/** Prochaines dates d'une habitude, pour l'aperçu du formulaire. */
export function nextHabitDates(weekdays: number[], from: Date, count: number): Date[] {
  if (weekdays.length === 0) return []
  const out: Date[] = []
  for (let d = from; out.length < count; d = addDays(d, 1)) {
    if (weekdays.includes(isoDay(d))) out.push(d)
  }
  return out
}
