import { Draggable } from '@fullcalendar/interaction'
import { useEffect, useRef, type RefObject } from 'react'
import { CalendarEntry } from '@/components/CalendarEntry'
import { minutesBetween } from '@/domain/dates'
import type { Entry } from '@/domain/entries'
import { openEntry } from '@/store/entryActions'

/** Ce que transporte un élément glissé depuis un panneau vers la grille du calendrier. */
export interface DragPayload {
  title: string
  minutes: number
  taskId?: string
  slotId?: string
  /** Occurrence d'habitude (date de l'occurrence). */
  date?: string
  eventId?: string
}

export function payloadOf(entry: Entry, defaultMinutes: number): DragPayload {
  return {
    title: entry.title,
    minutes: entry.allDay ? defaultMinutes : minutesBetween(entry.start, entry.end) || defaultMinutes,
    taskId: entry.taskId,
    slotId: entry.slotId,
    date: entry.occurrenceDate,
    eventId: entry.eventId,
  }
}

/** Rend les éléments `[data-drag]` d'un conteneur glissables dans FullCalendar. */
export function useExternalDrag(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ref.current) return
    const draggable = new Draggable(ref.current, {
      itemSelector: '[data-drag]',
      minDistance: 5,
      eventData: (el) => {
        const payload = JSON.parse((el as HTMLElement).dataset.drag!) as DragPayload
        // `create: false` : le calendrier ne crée rien lui-même, c'est `drop` qui met à jour les données.
        return { title: payload.title, duration: { minutes: payload.minutes }, create: false }
      },
    })
    return () => draggable.destroy()
  }, [ref])
}

export function DraggableEntry({ entry, payload }: { entry: Entry; payload: DragPayload }) {
  return (
    <div data-drag={JSON.stringify(payload)} onClick={() => openEntry(entry)} className="cursor-grab active:cursor-grabbing" title="Glisse-moi dans le calendrier">
      <CalendarEntry entry={entry} variant="row" />
    </div>
  )
}

export function useDragContainer() {
  const ref = useRef<HTMLDivElement>(null)
  useExternalDrag(ref)
  return ref
}
