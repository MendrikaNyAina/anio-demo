import { addDays } from 'date-fns'
import { Calendar, CheckSquare, Flag, Layers, Plus, Repeat, Shapes, Siren } from 'lucide-react'
import type { ReactNode } from 'react'
import { fmtDay, fmtDuration, KIND_LABEL, PRIORITY_COLOR, PRIORITY_LABEL } from '@/domain/display'
import { fromKey, slotBounds, toKey } from '@/domain/dates'
import { nextHabitDates } from '@/domain/habits'
import type { Priority, Recurrence, Slot } from '@/domain/types'
import { cn, newId } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import type { TaskDraft } from '@/store/uiStore'
import { CategoryMultiSelect } from './CategoryMultiSelect'
import { SlotEditor, slotError } from './SlotEditor'
import { Button } from './ui/button'
import { Checkbox, inputClass, PropertyRow } from './ui/controls'
import { TagSelect, type TagOption } from './ui/TagSelect'

// Propriétés d'une tâche, partagées par le formulaire de création et la page de la tâche (où elles s'éditent en direct).

const WEEKDAYS = [
  { n: 1, short: 'L', long: 'Lundi' },
  { n: 2, short: 'M', long: 'Mardi' },
  { n: 3, short: 'M', long: 'Mercredi' },
  { n: 4, short: 'J', long: 'Jeudi' },
  { n: 5, short: 'V', long: 'Vendredi' },
  { n: 6, short: 'S', long: 'Samedi' },
  { n: 7, short: 'D', long: 'Dimanche' },
]

const URGENCY_OPTIONS: TagOption<'yes' | 'no'>[] = [
  { value: 'yes', label: 'Urgent', color: '#D44C47' },
  { value: 'no', label: 'Pas urgent', color: '#787774' },
]

const PRIORITY_OPTIONS: TagOption<Priority>[] = (['high', 'medium', 'low'] as const).map((p) => ({ value: p, label: PRIORITY_LABEL[p], color: PRIORITY_COLOR[p] }))

const fmtDoneAt =(iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

/** Erreur des dates d'une tâche (créneaux ou récurrence), `null` si tout est valide. */
export function scheduleError(draft: Pick<TaskDraft, 'kind' | 'slots' | 'recurrence'>): string | null {
  if (draft.kind === 'habit') {
    const rec = draft.recurrence
    if (!rec) return "L'habitude n'a pas de récurrence."
    if (rec.weekdays.length === 0) return 'Choisis au moins un jour.'
    if (rec.endDate && rec.endDate < rec.startDate) return 'La date de fin est avant la date de début.'
    return null
  }
  return draft.slots.map(slotError).find(Boolean) ?? null
}

/** Nouveau créneau : le lendemain du dernier, aux mêmes heures (aujourd'hui s'il n'y en a pas). */
function nextSlot(slots: Slot[]): Slot {
  const last = [...slots].sort((a, b) => +slotBounds(b).start - +slotBounds(a).start)[0]
  if (!last) return { id: newId(), allDay: true, startsOn: toKey(new Date()), endsOn: toKey(new Date()) }
  if (last.allDay) {
    const next = toKey(addDays(fromKey(last.endsOn), 1))
    return { id: newId(), allDay: true, startsOn: next, endsOn: next }
  }
  return { id: newId(), allDay: false, start: addDays(new Date(last.start), 1).toISOString(), end: addDays(new Date(last.end), 1).toISOString() }
}

/**
 * Type, statut, priorité, urgence, importance, catégories et dates (calendrier.md l. 42).
 * Dans la page d'une tâche existante : `onToggleSlot` (cocher un créneau d'une tâche étalée)
 * et `onConvertToHabit` (tâche simple → habitude).
 */
export function TaskPropertyFields({
  value,
  onChange,
  typeIcon,
  onToggleSlot,
  onConvertToHabit,
}: {
  value: TaskDraft
  onChange: (patch: Partial<TaskDraft>) => void
  typeIcon?: ReactNode
  onToggleSlot?: (slotId: string) => void
  onConvertToHabit?: () => void
}) {
  const durationMin = useApp((s) => s.data.settings.defaultDurationMin)
  const error = scheduleError(value)
  const habitError = value.kind === 'habit' ? error : null
  const checkSlots = value.kind === 'spread' && !!onToggleSlot

  return (
    <>
      <PropertyRow label="Type" icon={<Shapes />}>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="flex items-center gap-1.5 text-sm">
            {typeIcon}
            {KIND_LABEL[value.kind]}
          </span>
          {value.kind === 'simple' && (
            <Button size="sm" variant="outline" onClick={() => onChange({ kind: 'spread' })}>
              <Layers size={13} /> Transformer en tâche étalée
            </Button>
          )}
          {value.kind === 'simple' && onConvertToHabit && (
            <Button size="sm" variant="outline" onClick={onConvertToHabit}>
              <Repeat size={13} /> Transformer en habitude
            </Button>
          )}
        </div>
      </PropertyRow>

      {value.kind !== 'habit' && (
        <PropertyRow label="Statut" icon={<CheckSquare />}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox checked={value.done} onChange={(done) => onChange({ done })} />
              {value.done ? 'Fait' : 'À faire'}
            </label>
            {value.done && value.doneAt && <span className="text-xs text-ink-3">terminée le {fmtDoneAt(value.doneAt)}</span>}
          </div>
        </PropertyRow>
      )}

      {/* Urgence × priorité placent la tâche dans la matrice d'Eisenhower (priorité haute ou moyenne = importante). */}
      {value.kind !== 'habit' && (
        <PropertyRow label="Urgence" icon={<Siren />}>
          <TagSelect<'yes' | 'no'>
            label="Urgence"
            value={value.urgent === undefined ? undefined : value.urgent ? 'yes' : 'no'}
            onChange={(v) => onChange({ urgent: v === undefined ? undefined : v === 'yes' })}
            options={URGENCY_OPTIONS}
          />
        </PropertyRow>
      )}

      <PropertyRow label="Priorité" icon={<Flag />}>
        <TagSelect<Priority> label="Priorité" value={value.priority} onChange={(priority) => onChange({ priority })} options={PRIORITY_OPTIONS} />
      </PropertyRow>

      <CategoryMultiSelect value={value} onChange={(links) => onChange(links)} />

      <PropertyRow label={value.kind === 'spread' ? 'Créneaux' : value.kind === 'habit' ? 'Récurrence' : 'Date'} icon={value.kind === 'habit' ? <Repeat /> : <Calendar />}>
        {value.kind === 'habit' ? (
          <HabitEditor recurrence={value.recurrence!} onChange={(recurrence) => onChange({ recurrence })} />
        ) : (
          <div className="space-y-2">
            {value.slots.map((slot) => {
              const editor = (
                <SlotEditor
                  key={slot.id}
                  slot={slot}
                  singleDay
                  durationMin={durationMin}
                  onChange={(next) => onChange({ slots: value.slots.map((s) => (s.id === slot.id ? { ...next, done: slot.done } : s)) })}
                  onRemove={() => onChange({ slots: value.slots.filter((s) => s.id !== slot.id) })}
                />
              )
              if (!checkSlots) return editor
              // Tâche étalée : chaque créneau se coche ; la tâche est faite quand ils le sont tous.
              return (
                <div key={slot.id} className={cn('flex items-start gap-2', slot.done && 'opacity-60')}>
                  <Checkbox checked={!!slot.done} onChange={() => onToggleSlot!(slot.id)} label="Créneau fait" className="mt-2" />
                  <div className="min-w-0 flex-1">{editor}</div>
                </div>
              )
            })}
            {checkSlots && value.slots.length > 0 && (
              <p className="text-xs text-ink-3">
                {value.slots.filter((s) => s.done).length} / {value.slots.length} créneaux faits · la tâche est terminée quand tous sont cochés.
              </p>
            )}
            {(value.kind === 'spread' || value.slots.length === 0) && (
              <Button size="sm" variant="subtle" onClick={() => onChange({ slots: [...value.slots, nextSlot(value.slots)] })}>
                <Plus size={14} /> {value.kind === 'spread' ? 'Ajouter un créneau' : 'Ajouter une date'}
              </Button>
            )}
            {value.kind === 'simple' && value.slots.length === 0 && <p className="text-xs text-ink-3">Sans date, la tâche apparaît dans « Non planifiées ».</p>}
          </div>
        )}
        {/* Les créneaux affichent leur propre erreur ; la récurrence a besoin de celle-ci. */}
        {habitError && <p className="mt-1 text-xs text-danger">{habitError}</p>}
      </PropertyRow>
    </>
  )
}

function HabitEditor({ recurrence, onChange }: { recurrence: Recurrence; onChange: (r: Recurrence) => void }) {
  const set = (p: Partial<Recurrence>) => onChange({ ...recurrence, ...p })
  const everyDay = recurrence.weekdays.length === 7
  const preview = nextHabitDates(recurrence.weekdays, fromKey(recurrence.startDate) > new Date() ? fromKey(recurrence.startDate) : new Date(), 4)

  return (
    <div className="space-y-2.5 rounded-md border border-line bg-[#fbfbfa] p-2.5 text-[13px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-10 text-ink-2">Du</span>
        <input type="date" className={cn(inputClass, 'w-[136px]')} value={recurrence.startDate} onChange={(e) => e.target.value && set({ startDate: e.target.value })} />
        <span className="text-ink-2">au</span>
        {recurrence.endDate !== undefined ? (
          <input type="date" className={cn(inputClass, 'w-[136px]')} value={recurrence.endDate} onChange={(e) => set({ endDate: e.target.value || undefined })} />
        ) : (
          <span className="px-1 text-ink-3">…</span>
        )}
        <label className="ml-1 flex items-center gap-1.5 text-ink-2">
          <Checkbox checked={recurrence.endDate === undefined} onChange={(noEnd) => set({ endDate: noEnd ? undefined : toKey(addDays(fromKey(recurrence.startDate), 90)) })} />
          Sans fin
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-10 text-ink-2">Jours</span>
        {WEEKDAYS.map((d) => {
          const on = recurrence.weekdays.includes(d.n)
          return (
            <button
              key={d.n}
              type="button"
              title={d.long}
              onClick={() => set({ weekdays: on ? recurrence.weekdays.filter((x) => x !== d.n) : [...recurrence.weekdays, d.n].sort() })}
              className={cn('size-7 rounded-full text-xs font-semibold transition-colors', on ? 'bg-accent text-white' : 'bg-hover text-ink-2 hover:bg-press')}
            >
              {d.short}
            </button>
          )
        })}
        <Button size="sm" variant="subtle" onClick={() => set({ weekdays: everyDay ? [] : [1, 2, 3, 4, 5, 6, 7] })}>
          {everyDay ? 'Aucun' : 'Tous les jours'}
        </Button>
      </div>
      {preview.length > 0 && (
        <p className="pl-[46px] text-xs text-ink-3">
          Prochaines : {preview.map((d) => `${WEEKDAYS[(d.getDay() + 6) % 7].long.toLowerCase()} ${fmtDay(d)}`).join(', ')}…
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-10 text-ink-2">Heure</span>
        <label className="flex items-center gap-1.5">
          <Checkbox checked={!!recurrence.startTime} onChange={(fixed) => set({ startTime: fixed ? '08:00' : undefined })} />
          À heure fixe
        </label>
        {recurrence.startTime && (
          <>
            <input type="time" className={cn(inputClass, 'w-[92px]')} value={recurrence.startTime} onChange={(e) => e.target.value && set({ startTime: e.target.value })} />
            <select className={cn(inputClass, 'w-[100px]')} value={recurrence.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) })}>
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {fmtDuration(m)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      {!recurrence.startTime && <p className="pl-[46px] text-xs text-ink-3">Sans heure : l'habitude apparaît en « journée » et tu choisis l'heure jour par jour en la glissant dans la grille.</p>}
    </div>
  )
}
