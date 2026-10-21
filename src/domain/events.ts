import { addDays, addMinutes, addMonths, addWeeks, addYears, differenceInCalendarDays, differenceInCalendarMonths, differenceInCalendarYears, differenceInMinutes, differenceInMonths, differenceInWeeks, differenceInYears } from 'date-fns'
import { fromKey, overlaps, slotBounds, toKey, type Range } from './dates'
import type { CalendarEvent, EventRepeat, Slot } from './types'

type Step = Exclude<EventRepeat, 'none'>

const add: Record<Step, (d: Date, n: number) => Date> = { weekly: addWeeks, monthly: addMonths, yearly: addYears }
const diff: Record<Step, (later: Date, earlier: Date) => number> = { weekly: differenceInWeeks, monthly: differenceInMonths, yearly: differenceInYears }

/**
 * N-ième occurrence, calculée depuis le premier créneau et pas de proche en proche :
 * un événement du 31 janvier tombe le 28 février puis revient au 31 mars, un anniversaire
 * du 29 février tombe le 28 les années non bissextiles.
 */
function nth(slot: Slot, repeat: Step, n: number): Slot {
  if (slot.allDay) {
    const start = add[repeat](fromKey(slot.startsOn), n)
    const days = differenceInCalendarDays(fromKey(slot.endsOn), fromKey(slot.startsOn))
    return { ...slot, startsOn: toKey(start), endsOn: toKey(addDays(start, days)) }
  }
  // date-fns calcule en heure locale : un événement à 18 h reste à 18 h après un changement d'heure.
  const start = add[repeat](new Date(slot.start), n)
  const minutes = differenceInMinutes(new Date(slot.end), new Date(slot.start))
  return { ...slot, start: start.toISOString(), end: addMinutes(start, minutes).toISOString() }
}

/**
 * Créneaux d'un événement qui touchent une période. Comme pour les habitudes,
 * les répétitions sont calculées, jamais stockées.
 */
export function expandEvent(event: CalendarEvent, range: Range): Slot[] {
  const repeat = event.repeat ?? 'none'
  if (repeat === 'none') return overlaps(slotBounds(event.slot), range) ? [event.slot] : []

  const first = slotBounds(event.slot).start
  // On saute directement près de la période (un anniversaire de 1990 ne boucle pas sur 36 ans).
  // Le « - 1 » rattrape une occurrence de plusieurs jours commencée juste avant la période.
  const out: Slot[] = []
  for (let n = Math.max(0, diff[repeat](range.start, first) - 1); ; n++) {
    const occ = nth(event.slot, repeat, n)
    const bounds = slotBounds(occ)
    const day = toKey(bounds.start)
    if (bounds.start >= range.end || (event.repeatEnd && day > event.repeatEnd)) break
    if (bounds.end > range.start && !(event.repeatStart && day < event.repeatStart)) out.push(occ)
  }
  return out
}

// En périodes « calendaires » : le 28 février, occurrence d'un événement du 31 janvier, est bien à 1 mois.
const periodsBetween: Record<Step, (later: Date, earlier: Date) => number> = {
  weekly: (later, earlier) => Math.round(differenceInCalendarDays(later, earlier) / 7),
  monthly: differenceInCalendarMonths,
  yearly: differenceInCalendarYears,
}

/** Seules les répétitions mensuelles et annuelles se déplacent en glissant une occurrence. */
export const canDragOccurrence = (repeat: EventRepeat = 'none') => repeat === 'monthly' || repeat === 'yearly'

/**
 * Nouveau premier créneau quand on glisse une occurrence à `moved` : toute la série prend le même décalage
 * (un anniversaire glissé du 14 au 16 octobre 2027 tombe le 16 octobre toutes les années).
 */
export function moveSeries(event: CalendarEvent, occurrenceStart: Date, moved: Slot): Slot {
  const repeat = event.repeat ?? 'none'
  if (repeat === 'none') return moved
  return nth(moved, repeat, -periodsBetween[repeat](occurrenceStart, slotBounds(event.slot).start))
}

/** Message d'erreur des bornes de répétition, ou `null` si elles sont valides. */
export function repeatError(event: Pick<CalendarEvent, 'slot' | 'repeat' | 'repeatStart' | 'repeatEnd'>): string | null {
  if ((event.repeat ?? 'none') === 'none' || !event.repeatEnd) return null
  const start = event.repeatStart ?? toKey(slotBounds(event.slot).start)
  return event.repeatEnd < start ? 'La fin de la répétition est avant son début.' : null
}

/** Occurrence en cours ou à venir (`null` si l'événement est passé). Sert à la page Événements. */
export function nextOccurrence(event: CalendarEvent, now: Date): Slot | null {
  if ((event.repeat ?? 'none') === 'none') return slotBounds(event.slot).end > now ? event.slot : null
  // Une répétition au plus annuelle a toujours une occurrence dans l'année qui vient
  // (ou dans l'année qui suit son début, s'il est plus tard).
  const from = event.repeatStart && fromKey(event.repeatStart) > now ? fromKey(event.repeatStart) : now
  return expandEvent(event, { start: now, end: addDays(addYears(from, 1), 1) })[0] ?? null
}
