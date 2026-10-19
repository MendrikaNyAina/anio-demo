import { ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ColorPicker } from '@/components/ColorPicker'
import { InlineEditableText } from '@/components/InlineEditableText'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useActionMenu } from '@/components/ui/menu'
import { Popover } from '@/components/ui/popover'
import { slotBounds, toKey } from '@/domain/dates'
import { fmtSlot } from '@/domain/display'
import { tint } from '@/domain/style'
import type { CalendarEvent } from '@/domain/types'
import { Page } from '@/features/layout/AppShell'
import { cn, newId } from '@/lib/utils'
import { useApp, withUndo } from '@/store/appStore'
import { ui } from '@/store/uiStore'

/** Page Événements (calendrier.md l. 49-51) : liste façon Notion, à venir puis passés. */
export function EventsPage() {
  const events = useApp((s) => s.data.events)
  const defaultColor = useApp((s) => s.data.settings.defaultEventColor)
  const [showPast, setShowPast] = useState(false)

  const { upcoming, past } = useMemo(() => {
    const now = new Date()
    const sorted = [...events].sort((a, b) => +slotBounds(a.slot).start - +slotBounds(b.slot).start)
    return {
      upcoming: sorted.filter((e) => slotBounds(e.slot).end >= now),
      past: sorted.filter((e) => slotBounds(e.slot).end < now).reverse(),
    }
  }, [events])

  const add = () => {
    const today = toKey(new Date())
    ui.openEventForm({ mode: 'create', draft: { title: '', color: defaultColor, slot: { id: newId(), allDay: true, startsOn: today, endsOn: today } } })
  }

  return (
    <Page>
      <PageHeader
        icon="✨"
        title="Événements"
        description="Ce qui arrive, sans case à cocher. Clique sur le carré pour changer la couleur."
        actions={
          <Button variant="primary" onClick={add}>
            <Plus size={15} /> Événement
          </Button>
        }
      />
      <div className="mb-1 grid grid-cols-[28px_1fr_auto_28px] items-center gap-3 border-b border-line px-2 pb-1.5 text-xs font-medium text-ink-3">
        <span />
        <span>Nom</span>
        <span>Date</span>
        <span />
      </div>
      {upcoming.map((e) => (
        <EventRow key={e.id} event={e} />
      ))}
      {upcoming.length === 0 && <p className="px-2 py-4 text-sm text-ink-3">Aucun événement à venir.</p>}

      {past.length > 0 && (
        <div className="mt-6">
          <button type="button" onClick={() => setShowPast(!showPast)} className="flex items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-ink-2 hover:bg-hover">
            <ChevronRight size={15} className={cn('transition-transform', showPast && 'rotate-90')} /> Passés ({past.length})
          </button>
          {showPast && (
            <div className="opacity-70">
              {past.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </Page>
  )
}

function EventRow({ event }: { event: CalendarEvent }) {
  const app = useApp.getState()
  const edit = () => ui.openEventForm({ mode: 'edit', eventId: event.id, draft: structuredClone({ title: event.title, color: event.color, slot: event.slot }) })
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
      <span className="text-xs text-ink-2 tabular-nums max-sm:col-start-2 max-sm:row-start-2 sm:text-[13px]">{fmtSlot(event.slot)}</span>
      <button type="button" onClick={menu.openFromButton} className="rounded p-1 text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-press hover:text-ink max-sm:col-start-3 max-sm:row-start-1" aria-label="Actions">
        <MoreHorizontal size={16} />
      </button>
      {menu.element}
    </div>
  )
}
