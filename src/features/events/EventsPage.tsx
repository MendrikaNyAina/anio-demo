import { ChevronRight, MoreHorizontal, Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ColorPicker } from '@/components/ColorPicker'
import { EventTemplatePicker } from '@/components/EventTemplatePicker'
import { InlineEditableText } from '@/components/InlineEditableText'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useActionMenu } from '@/components/ui/menu'
import { Popover } from '@/components/ui/popover'
import { slotBounds, toKey } from '@/domain/dates'
import { fmtRepeat, fmtSlot } from '@/domain/display'
import { nextOccurrence } from '@/domain/events'
import { tint } from '@/domain/style'
import type { CalendarEvent, EventTemplate, Slot } from '@/domain/types'
import { Page } from '@/features/layout/AppShell'
import { cn, newId } from '@/lib/utils'
import { useApp, withUndo } from '@/store/appStore'
import { ui } from '@/store/uiStore'

/** Page Événements (calendrier.md l. 49-51) : liste façon Notion, à venir puis passés. */
export function EventsPage() {
  const events = useApp((s) => s.data.events)
  const defaultColor = useApp((s) => s.data.settings.defaultEventColor)
  const [showPast, setShowPast] = useState(false)

  // Un événement répété n'est jamais « passé » : il est rangé à sa prochaine occurrence.
  const { upcoming, past } = useMemo(() => {
    const now = new Date()
    const rows = events.map((event) => ({ event, next: nextOccurrence(event, now) }))
    const start = (r: (typeof rows)[number]) => +slotBounds(r.next ?? r.event.slot).start
    return {
      upcoming: rows.filter((r) => r.next).sort((a, b) => start(a) - start(b)),
      past: rows.filter((r) => !r.next).sort((a, b) => start(b) - start(a)),
    }
  }, [events])

  /** Formulaire de création pour aujourd'hui, prérempli par un modèle s'il y en a un. */
  const add = (template?: EventTemplate) => {
    const today = toKey(new Date())
    const slot: Slot = { id: newId(), allDay: true, startsOn: today, endsOn: today }
    ui.openEventForm({ mode: 'create', draft: { title: template?.name ?? '', color: template?.color ?? defaultColor, repeat: template?.repeat, slot } })
  }

  return (
    <Page>
      <PageHeader
        icon="✨"
        title="Événements"
        description="Ce qui arrive, sans case à cocher. Clique sur le carré pour changer la couleur."
        actions={
          <Button variant="primary" onClick={() => add()}>
            <Plus size={15} /> Événement
          </Button>
        }
      />
      <EventTemplatePicker label="Créer depuis un modèle" onPick={add} className="mb-4" />
      <div className="mb-1 grid grid-cols-[28px_1fr_auto_28px] items-center gap-3 border-b border-line px-2 pb-1.5 text-xs font-medium text-ink-3">
        <span />
        <span>Nom</span>
        <span>Date</span>
        <span />
      </div>
      {upcoming.map((r) => (
        <EventRow key={r.event.id} event={r.event} next={r.next} />
      ))}
      {upcoming.length === 0 && <p className="px-2 py-4 text-sm text-ink-3">Aucun événement à venir.</p>}

      {past.length > 0 && (
        <div className="mt-6">
          <button type="button" onClick={() => setShowPast(!showPast)} className="flex items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-ink-2 hover:bg-hover">
            <ChevronRight size={15} className={cn('transition-transform', showPast && 'rotate-90')} /> Passés ({past.length})
          </button>
          {showPast && (
            <div className="opacity-70">
              {past.map((r) => (
                <EventRow key={r.event.id} event={r.event} />
              ))}
            </div>
          )}
        </div>
      )}
    </Page>
  )
}

/** `next` : occurrence affichée (la prochaine pour un événement répété). */
function EventRow({ event, next }: { event: CalendarEvent; next?: Slot | null }) {
  const app = useApp.getState()
  const repeat = fmtRepeat(event)
  const edit = () => ui.editEvent(event)
  const menu = useActionMenu([
    { label: 'Modifier', icon: <Pencil />, onSelect: edit },
    'separator',
    { label: 'Supprimer', icon: <Trash2 />, danger: true, onSelect: () => withUndo('Événement supprimé', () => app.deleteEvent(event.id)) },
  ])

  return (
    <div onContextMenu={menu.onContextMenu} className={cn('group grid grid-cols-[28px_1fr_28px] items-center gap-x-3 rounded-md px-2 py-1.5 hover:bg-hover sm:h-10 sm:grid-cols-[28px_1fr_auto_28px] sm:py-0', menu.isOpen && 'bg-hover')}>
      <Popover
        trigger={
          <button
            type="button"
            title="Changer la couleur"
            className="size-5 rounded-[5px] border-2 border-dotted transition-transform hover:scale-110"
            style={{ borderColor: event.color, background: tint(event.color, 23) }}
          />
        }
      >
        <ColorPicker color={event.color} onColorChange={(color) => app.updateEvent(event.id, { color })} />
      </Popover>
      <InlineEditableText value={event.title} onSave={(title) => app.updateEvent(event.id, { title })} className="text-sm font-medium" inputClassName="text-sm" />
      {/* Téléphone : la date passe sous le titre (2e ligne de la grille). */}
      <span className="flex items-center gap-1.5 text-xs text-ink-2 tabular-nums max-sm:col-start-2 max-sm:row-start-2 sm:text-[13px]">
        {repeat && (
          <span className="flex items-center gap-1 text-ink-3" title="Événement répété">
            <Repeat size={13} /> {repeat} ·
          </span>
        )}
        {fmtSlot(next ?? event.slot)}
      </span>
      <button type="button" onClick={menu.openFromButton} className="rounded p-1 text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-press hover:text-ink max-sm:col-start-3 max-sm:row-start-1" aria-label="Actions">
        <MoreHorizontal size={16} />
      </button>
      {menu.element}
    </div>
  )
}
