import { Calendar, Palette } from 'lucide-react'
import { useState } from 'react'
import type { CalendarEvent } from '@/domain/types'
import { useApp } from '@/store/appStore'
import { ui, useUi, type EventFormState } from '@/store/uiStore'
import { ColorPicker } from './ColorPicker'
import { SlotEditor, slotError } from './SlotEditor'
import { Button } from './ui/button'
import { PropertyRow } from './ui/controls'
import { Modal } from './ui/dialog'
import { Popover } from './ui/popover'

export function EventFormDialog() {
  const form = useUi((s) => s.eventForm)
  if (!form) return null
  return <EventForm key={form.eventId ?? 'new'} form={form} />
}

/** Formulaire d'événement : nom, début / fin, couleur (calendrier.md l. 51). */
function EventForm({ form }: { form: EventFormState }) {
  const [draft, setDraft] = useState<Omit<CalendarEvent, 'id'>>(form.draft)
  const defaultDuration = useApp((s) => s.data.settings.defaultDurationMin)
  const createEvent = useApp((s) => s.createEvent)
  const updateEvent = useApp((s) => s.updateEvent)
  const close = () => ui.set({ eventForm: null })
  const error = slotError(draft.slot)

  const save = () => {
    if (error) return
    const clean = { ...draft, title: draft.title.trim() || 'Sans titre' }
    if (form.mode === 'create') createEvent(clean)
    else if (form.eventId) updateEvent(form.eventId, clean)
    close()
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && close()}
      dismissable={false}
      title={form.mode === 'create' ? 'Nouvel événement' : "Modifier l'événement"}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Annuler
          </Button>
          <Button variant="primary" onClick={save} disabled={!!error}>
            {form.mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <input
        autoFocus
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="Nom de l'événement"
        className="mb-3 w-full text-[22px] font-bold outline-none placeholder:text-[#d3d1cb]"
      />
      <PropertyRow label="Couleur" icon={<Palette />}>
        <Popover
          trigger={
            <button type="button" className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-hover">
              <span className="size-4 rounded border-2 border-dotted" style={{ borderColor: draft.color, background: `color-mix(in srgb, ${draft.color} 12%, white)` }} />
              <span className="font-mono text-xs uppercase">{draft.color}</span>
            </button>
          }
        >
          <ColorPicker color={draft.color} onColorChange={(color) => setDraft({ ...draft, color })} />
        </Popover>
      </PropertyRow>
      <PropertyRow label="Date" icon={<Calendar />}>
        <SlotEditor slot={draft.slot} durationMin={defaultDuration} onChange={(slot) => setDraft({ ...draft, slot })} />
      </PropertyRow>
    </Modal>
  )
}
