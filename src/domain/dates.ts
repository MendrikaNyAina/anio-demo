import { addDays, addMinutes, differenceInMinutes, format, getISODay, parse, startOfDay } from 'date-fns'
import type { DateKey, Slot } from './types'

export interface Range {
  start: Date
  /** Exclusive. */
  end: Date
}

export const toKey = (d: Date): DateKey => format(d, 'yyyy-MM-dd')
export const fromKey = (key: DateKey): Date => parse(key, 'yyyy-MM-dd', new Date())
export const isoDay = (d: Date) => getISODay(d) // 1 = lundi … 7 = dimanche

/** `2026-10-13` + `14:30` → Date locale. */
export function atTime(key: DateKey, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = fromKey(key)
  d.setHours(h, m, 0, 0)
  return d
}

export const toHHmm = (d: Date) => format(d, 'HH:mm')

/** Début / fin (exclusive) d'un créneau sous forme de Date. */
export function slotBounds(slot: Slot): Range {
  if (slot.allDay) return { start: fromKey(slot.startsOn), end: addDays(fromKey(slot.endsOn), 1) }
  return { start: new Date(slot.start), end: new Date(slot.end) }
}

export const overlaps = (a: Range, b: Range) => a.start < b.end && b.start < a.end

export const minutesBetween = (start: Date, end: Date) => Math.max(0, differenceInMinutes(end, start))

/** Créneau horaire d'une durée donnée à partir d'une date. */
export function timedSlot(id: string, start: Date, durationMin: number): Slot {
  return { id, allDay: false, start: start.toISOString(), end: addMinutes(start, durationMin).toISOString() }
}

// Une tâche se planifie jour par jour (calendrier.md l. 9) : une tâche étalée a plusieurs créneaux,
// mais aucun créneau de tâche ne déborde sur le lendemain. Les événements, eux, peuvent durer plusieurs jours.

/** Vrai si la plage tient dans une seule journée (fin exclusive). */
export const isSingleDay = (range: Range) => toKey(range.start) === toKey(new Date(+range.end - 1))

/** Ramène un créneau sur son premier jour : journée seule, ou fin à 23:59 au plus tard. */
export function clampToDay(slot: Slot): Slot {
  if (slot.allDay) return slot.endsOn === slot.startsOn ? slot : { ...slot, endsOn: slot.startsOn }
  if (isSingleDay(slotBounds(slot))) return slot
  return { ...slot, end: atTime(toKey(new Date(slot.start)), '23:59').toISOString() }
}

/** Découpe une journée entière de plusieurs jours en un créneau par jour (le premier garde son id). */
export function splitByDay(slot: Slot, newId: () => string): Slot[] {
  if (!slot.allDay) return [clampToDay(slot)]
  const out: Slot[] = []
  for (let d = fromKey(slot.startsOn); toKey(d) <= slot.endsOn; d = addDays(d, 1)) {
    const key = toKey(d)
    out.push({ id: out.length === 0 ? slot.id : newId(), allDay: true, startsOn: key, endsOn: key })
  }
  return out
}

export function dayRange(d: Date): Range {
  const start = startOfDay(d)
  return { start, end: addDays(start, 1) }
}
