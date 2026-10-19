import { CheckSquare, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { toKey } from '@/domain/dates'
import type { Entry } from '@/domain/entries'
import type { MenuItem } from '@/components/ui/menu'
import { useApp, withUndo } from './appStore'
import { ui } from './uiStore'

// Actions communes à toutes les entrées, où qu'elles soient affichées
// (calendrier, panneaux, Bilan) : un seul endroit pour les règles par type.

const app = () => useApp.getState()

export function toggleEntryDone(entry: Entry) {
  if (!entry.taskId) return
  if (entry.type === 'habit' && entry.occurrenceDate) app().toggleOccurrenceDone(entry.taskId, entry.occurrenceDate)
  else app().toggleTaskDone(entry.taskId)
}

export function openEntry(entry: Entry) {
  if (entry.taskId) return ui.openPeek(entry.taskId)
  const event = app().data.events.find((e) => e.id === entry.eventId)
  if (event) ui.openEventForm({ mode: 'edit', eventId: event.id, draft: structuredClone({ title: event.title, color: event.color, slot: event.slot }) })
}

/**
 * Suppression depuis le calendrier (décisions 3 et 4) :
 * étalée → « ce créneau » ou « toute la tâche » ; habitude → « à partir d'aujourd'hui » ou « toute ».
 */
export function deleteEntry(entry: Entry) {
  if (entry.eventId) return withUndo('Événement supprimé', () => app().deleteEvent(entry.eventId!))
  if (!entry.taskId) return
  if (entry.type === 'spread') return ui.set({ deleteChoice: { taskId: entry.taskId, slotId: entry.slotId } })
  if (entry.type === 'habit') return ui.set({ deleteChoice: { taskId: entry.taskId, date: toKey(new Date()) } })
  withUndo('Tâche mise à la poubelle', () => app().deleteTask(entry.taskId!))
}

export function entryMenuItems(entry: Entry): MenuItem[] {
  const isNotion = !!entry.notionSource
  return [
    ...(entry.taskId ? [{ label: 'Ouvrir', icon: <ExternalLink />, onSelect: () => openEntry(entry) }] : []),
    ...(entry.done !== undefined
      ? [{ label: entry.done ? 'Marquer non fait' : 'Marquer fait', icon: <CheckSquare />, onSelect: () => toggleEntryDone(entry) }]
      : []),
    // Une tâche se modifie dans sa page (« Ouvrir ») ; un événement garde son formulaire.
    ...(entry.eventId ? [{ label: 'Modifier', icon: <Pencil />, onSelect: () => openEntry(entry) }] : []),
    'separator',
    {
      label: 'Supprimer',
      icon: <Trash2 />,
      danger: true,
      disabled: isNotion,
      hint: isNotion ? 'dans Notion' : undefined,
      onSelect: () => deleteEntry(entry),
    },
  ]
}
