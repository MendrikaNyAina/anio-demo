import { BookmarkPlus, Calendar, CalendarRange, Palette, Repeat, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { fmtRepeat, REPEAT_LABEL } from '@/domain/display'
import { repeatError } from '@/domain/events'
import type { CalendarEvent, DateKey, EventRepeat, EventTemplate } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { ui, useUi, type EventFormState } from '@/store/uiStore'
import { ColorPicker } from './ColorPicker'
import { EventTemplatePicker } from './EventTemplatePicker'
import { SlotEditor, slotError } from './SlotEditor'
import { Button } from './ui/button'
import { inputClass, PropertyRow, Segmented } from './ui/controls'
import { Modal } from './ui/dialog'
import { Popover } from './ui/popover'

type Draft = Omit<CalendarEvent, 'id'>

const REPEAT_OPTIONS = (Object.keys(REPEAT_LABEL) as EventRepeat[]).map((value) => ({ value, label: REPEAT_LABEL[value] }))

export function EventFormDialog() {
  const form = useUi((s) => s.eventForm)
  if (!form) return null
  return <EventForm key={form.eventId ?? 'new'} form={form} />
}

/** Formulaire d'événement : nom, début / fin, couleur (calendrier.md l. 51), répétition et modèles. */
function EventForm({ form }: { form: EventFormState }) {
  const [draft, setDraft] = useState<Draft>(form.draft)
  const defaultDuration = useApp((s) => s.data.settings.defaultDurationMin)
  const templates = useApp((s) => s.data.eventTemplates)
  const createEvent = useApp((s) => s.createEvent)
  const updateEvent = useApp((s) => s.updateEvent)
  const createEventTemplate = useApp((s) => s.createEventTemplate)
  const close = () => ui.set({ eventForm: null })
  const repeat = draft.repeat ?? 'none'
  const boundsError = repeatError(draft)
  const error = slotError(draft.slot) ?? boundsError
  const name = draft.title.trim()
  const alreadySaved = templates.some((t) => t.name === name && t.color === draft.color && t.repeat === repeat)

  const save = () => {
    if (error) return
    const clean = { ...draft, title: name || 'Sans titre' }
    // Des bornes sans répétition n'ont pas de sens : on ne les garde pas.
    if (repeat === 'none') clean.repeatStart = clean.repeatEnd = undefined
    if (form.mode === 'create') createEvent(clean)
    else if (form.eventId) updateEvent(form.eventId, clean)
    close()
  }

  // Le nom du modèle ne remplace pas un titre déjà saisi (« Anniversaire de Hery » reste tel quel).
  const applyTemplate = (t: EventTemplate) => setDraft({ ...draft, title: draft.title || t.name, color: t.color, repeat: t.repeat })

  const saveAsTemplate = () => {
    createEventTemplate({ name, color: draft.color, repeat })
    toast(`Modèle « ${name} » enregistré`)
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && close()}
      dismissable={false}
      title={form.mode === 'create' ? 'Nouvel événement' : "Modifier l'événement"}
      footer={
        <>
          <Button
            variant="subtle"
            className="mr-auto"
            onClick={saveAsTemplate}
            disabled={!name || alreadySaved}
            title={!name ? "Donne d'abord un nom à l'événement" : alreadySaved ? 'Ce modèle existe déjà' : 'Réutiliser ce nom, cette couleur et cette répétition'}
          >
            <BookmarkPlus size={15} /> Enregistrer comme modèle
          </Button>
          <Button variant="outline" onClick={close}>
            Annuler
          </Button>
          <Button variant="primary" onClick={save} disabled={!!error}>
            {form.mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      {form.mode === 'create' && <EventTemplatePicker label="Modèles" onPick={applyTemplate} className="mb-3" />}
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
              <span className="size-4 rounded border-2 border-dotted" style={{ borderColor: draft.color, background: `color-mix(in srgb, ${draft.color} 16%, white)` }} />
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
      <PropertyRow label="Répéter" icon={<Repeat />}>
        <Segmented value={repeat} options={REPEAT_OPTIONS} onChange={(value) => setDraft({ ...draft, repeat: value })} />
        {repeat !== 'none' && (
          <p className="mt-1 px-0.5 text-xs text-ink-3">
            {fmtRepeat(draft)}
            {!draft.repeatEnd && ', sans date de fin'}
          </p>
        )}
      </PropertyRow>
      {repeat !== 'none' && (
        <PropertyRow label="Période" icon={<CalendarRange />}>
          <div className="flex flex-wrap items-center gap-1.5">
            <OptionalDate label="Début de la répétition" value={draft.repeatStart} onChange={(repeatStart) => setDraft({ ...draft, repeatStart })} />
            <span className="text-ink-3">→</span>
            <OptionalDate label="Fin de la répétition" value={draft.repeatEnd} onChange={(repeatEnd) => setDraft({ ...draft, repeatEnd })} />
          </div>
          {boundsError ? (
            <p className="mt-1 text-xs text-danger">{boundsError}</p>
          ) : (
            <p className="mt-1 px-0.5 text-xs text-ink-3">Facultatif. Sans début : dès la date de l'événement. Sans fin : pour toujours.</p>
          )}
        </PropertyRow>
      )}
    </Modal>
  )
}

/** Date facultative, avec une croix pour la vider. */
function OptionalDate({ label, value, onChange }: { label: string; value?: DateKey; onChange: (value: DateKey | undefined) => void }) {
  return (
    <span className="flex items-center">
      <input type="date" aria-label={label} className={cn(inputClass, 'w-[136px]')} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} />
      {value && (
        <Button size="icon-sm" variant="subtle" aria-label={`Vider : ${label.toLowerCase()}`} onClick={() => onChange(undefined)}>
          <X size={13} />
        </Button>
      )}
    </span>
  )
}

