import { addMinutes } from 'date-fns'
import { X } from 'lucide-react'
import { useState } from 'react'
import { atTime, clampToDay, toHHmm, toKey } from '@/domain/dates'
import type { Slot } from '@/domain/types'
import { cn } from '@/lib/utils'
import { inputClass, Segmented } from './ui/controls'

const dateInput = cn(inputClass, 'w-[136px]')
const timeInput = cn(inputClass, 'w-[92px]')

export function slotError(slot: Slot): string | null {
  if (slot.allDay) return slot.endsOn < slot.startsOn ? 'La fin est avant le début.' : null
  return new Date(slot.end) <= new Date(slot.start) ? 'La fin doit être après le début.' : null
}

/** Conversion journée entière ⇄ horaire, en gardant la date. */
export function convertSlot(slot: Slot, allDay: boolean, durationMin: number): Slot {
  if (slot.allDay === allDay) return slot
  if (slot.allDay) {
    const start = atTime(slot.startsOn, '09:00')
    return { id: slot.id, allDay: false, start: start.toISOString(), end: addMinutes(start, durationMin).toISOString() }
  }
  const day = toKey(new Date(slot.start))
  return { id: slot.id, allDay: true, startsOn: day, endsOn: day }
}

interface Props {
  slot: Slot
  onChange: (slot: Slot) => void
  onRemove?: () => void
  durationMin: number
  /** Tâches : une seule date, et des heures facultatives ce jour-là. */
  singleDay?: boolean
}

/** Un créneau : date(s) seule(s), ou date + heure de début / fin. */
export function SlotEditor(props: Props) {
  if (props.singleDay) return <SingleDaySlotEditor {...props} />
  const { slot, onChange, onRemove, durationMin } = props
  const error = slotError(slot)
  const startDate = slot.allDay ? slot.startsOn : toKey(new Date(slot.start))
  const endDate = slot.allDay ? slot.endsOn : toKey(new Date(slot.end))

  const setTimed = (sDate: string, sTime: string, eDate: string, eTime: string) => {
    if (!sDate || !eDate || !sTime || !eTime) return
    onChange({ id: slot.id, allDay: false, start: atTime(sDate, sTime).toISOString(), end: atTime(eDate, eTime).toISOString() })
  }

  return (
    <div className="rounded-md border border-line bg-[#fbfbfa] p-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={slot.allDay ? 'day' : 'time'}
          onChange={(v) => onChange(convertSlot(slot, v === 'day', durationMin))}
          options={[
            { value: 'day', label: 'Journée' },
            { value: 'time', label: 'Avec heure' },
          ]}
        />
        {onRemove && (
          <button type="button" onClick={onRemove} className="ml-auto rounded p-1 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Retirer ce créneau">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]">
        {slot.allDay ? (
          <>
            <input type="date" className={dateInput} value={startDate} onChange={(e) => e.target.value && onChange({ ...slot, startsOn: e.target.value, endsOn: e.target.value > slot.endsOn ? e.target.value : slot.endsOn })} />
            <span className="text-ink-3">→</span>
            <input type="date" className={dateInput} value={endDate} onChange={(e) => e.target.value && onChange({ ...slot, endsOn: e.target.value })} />
          </>
        ) : (
          <>
            <input type="date" className={dateInput} value={startDate} onChange={(e) => setTimed(e.target.value, toHHmm(new Date(slot.start)), e.target.value > endDate ? e.target.value : endDate, toHHmm(new Date(slot.end)))} />
            <input type="time" className={timeInput} value={toHHmm(new Date(slot.start))} onChange={(e) => setTimed(startDate, e.target.value, endDate, toHHmm(new Date(slot.end)))} />
            <span className="text-ink-3">→</span>
            <input type="date" className={dateInput} value={endDate} onChange={(e) => setTimed(startDate, toHHmm(new Date(slot.start)), e.target.value, toHHmm(new Date(slot.end)))} />
            <input type="time" className={timeInput} value={toHHmm(new Date(slot.end))} onChange={(e) => setTimed(startDate, toHHmm(new Date(slot.start)), endDate, e.target.value)} />
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

/**
 * Créneau de tâche : une date, puis une heure de début → fin facultative (« --:-- »).
 * Pas d'heure de début = journée entière ; une heure de début sans fin prend la durée par défaut.
 */
function SingleDaySlotEditor({ slot, onChange, onRemove, durationMin }: Props) {
  // Heure de fin tapée avant le début (ou gardée quand on efface le début pour le retaper) :
  // le créneau reste « journée » tant qu'il n'y a pas d'heure de début, mais la fin n'est pas perdue.
  const [pendingEnd, setPendingEnd] = useState('')
  const day = slot.allDay ? slot.startsOn : toKey(new Date(slot.start))
  const start = slot.allDay ? '' : toHHmm(new Date(slot.start))
  const end = slot.allDay ? pendingEnd : toHHmm(new Date(slot.end))
  const error = slotError(slot)

  const timed = (d: string, from: string, to: string): Slot => {
    const s = atTime(d, from)
    // Fin absente, ou avant le début alors qu'on vient de choisir le début : durée par défaut (sans passer minuit).
    const e = to && to > from ? atTime(d, to) : addMinutes(s, durationMin)
    return clampToDay({ id: slot.id, allDay: false, start: s.toISOString(), end: e.toISOString() })
  }

  const setDay = (d: string) => {
    if (!d) return
    onChange(slot.allDay ? { ...slot, startsOn: d, endsOn: d } : { ...slot, start: atTime(d, start).toISOString(), end: atTime(d, end).toISOString() })
  }

  const setStart = (from: string) => {
    if (from) return onChange(timed(day, from, end))
    setPendingEnd(end)
    onChange({ id: slot.id, allDay: true, startsOn: day, endsOn: day })
  }

  const setEnd = (to: string) => {
    if (slot.allDay) return setPendingEnd(to)
    // Fin effacée : on garde l'ancienne (pour revenir à « journée », on efface l'heure de début).
    if (to) onChange({ ...slot, end: atTime(day, to).toISOString() })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
        <input type="date" className={dateInput} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Date" />
        <input type="time" className={timeInput} value={start} onChange={(e) => setStart(e.target.value)} aria-label="Heure de début" />
        <span className="text-ink-3">→</span>
        <input type="time" className={timeInput} value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Heure de fin" />
        {onRemove && (
          <button type="button" onClick={onRemove} className="rounded p-1 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Retirer ce créneau">
            <X size={14} />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}
