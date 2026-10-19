import { addDays } from 'date-fns'
import { CalendarClock, Layers, Repeat, Circle } from 'lucide-react'
import { clampToDay, fromKey, splitByDay, toKey } from '@/domain/dates'
import type { Slot, TaskKind } from '@/domain/types'
import { newId } from '@/lib/utils'
import { useApp, withUndo } from '@/store/appStore'
import { entryMenuItems } from '@/store/entryActions'
import { emptyDraft, ui, useUi, type CreateChooserState } from '@/store/uiStore'
import { ColorPicker } from './ColorPicker'
import { EventFormDialog } from './EventForm'
import { TaskFormDialog } from './TaskForm'
import { TaskPeek } from './TaskPeek'
import { Button } from './ui/button'
import { Modal } from './ui/dialog'
import { ActionMenu } from './ui/menu'
import { AnchoredPopover } from './ui/popover'
import { CategorySheet } from '@/features/categories/CategorySheet'
import { NotionIntegrationDialog } from '@/features/notion/NotionIntegrationDialog'

/** Tous les dialogs ouvrables depuis n'importe quel écran, montés une seule fois. */
export function GlobalDialogs() {
  return (
    <>
      <TaskFormDialog />
      <EventFormDialog />
      <TaskPeek />
      <CreateTypeChooser />
      <DeleteChoiceDialog />
      <ConfirmDialog />
      <EntryContextMenu />
      <StyleEditor />
      <NotionIntegrationDialog />
      <CategorySheet />
    </>
  )
}

const CHOICES: { kind: TaskKind | 'event'; label: string; hint: string; icon: typeof Circle }[] = [
  { kind: 'simple', label: 'Tâche simple', hint: 'Une date, avec ou sans heure', icon: Circle },
  { kind: 'spread', label: 'Tâche étalée', hint: 'Plusieurs créneaux, cochés ensemble', icon: Layers },
  { kind: 'habit', label: 'Habitude', hint: 'Se répète certains jours', icon: Repeat },
  { kind: 'event', label: 'Événement', hint: 'Sans case à cocher', icon: CalendarClock },
]

/**
 * Création depuis le calendrier :
 * - flux `form` (mois) : formulaire avec la date de la case, sans heure ni catégorie ;
 * - flux `quick` (semaine / jour) : simple et événement sont créés directement avec le titre à saisir
 *   sur place ; étalée et habitude ouvrent le formulaire (calendrier.md l. 68).
 */
export function startCreation(kind: TaskKind | 'event', c: CreateChooserState) {
  const app = useApp.getState()
  const slot: Slot = c.allDay
    ? { id: newId(), allDay: true, startsOn: toKey(c.start), endsOn: toKey(addDays(c.end, -1) < c.start ? c.start : addDays(c.end, -1)) }
    : { id: newId(), allDay: false, start: c.start.toISOString(), end: c.end.toISOString() }
  // Une sélection sur plusieurs jours : un créneau par jour pour une tâche étalée, le premier jour pour une tâche simple.
  const taskSlots = kind === 'spread' ? splitByDay(slot, newId) : [clampToDay(slot)]

  if (c.flow === 'quick' && (kind === 'simple' || kind === 'event')) {
    const id =
      kind === 'event'
        ? app.createEvent({ title: '', color: app.data.settings.defaultEventColor, slot })
        : app.createTask(emptyDraft('simple', { slots: taskSlots }))
    ui.set({ editingKey: id })
    return
  }

  if (kind === 'event') {
    ui.openEventForm({ mode: 'create', draft: { title: '', color: app.data.settings.defaultEventColor, slot } })
    return
  }
  const startKey = toKey(c.start)
  ui.openTaskForm({
    draft:
      kind === 'habit'
        ? emptyDraft('habit', {
            recurrence: c.allDay
              ? { weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: startKey, durationMin: app.data.settings.defaultDurationMin }
              : {
                  weekdays: [1, 2, 3, 4, 5, 6, 7],
                  startDate: startKey,
                  startTime: c.start.toTimeString().slice(0, 5),
                  durationMin: Math.max(15, Math.round((+c.end - +c.start) / 60000)),
                },
          })
        : emptyDraft(kind, { slots: taskSlots }),
  })
}

function CreateTypeChooser() {
  const chooser = useUi((s) => s.createChooser)
  const close = () => ui.set({ createChooser: null })
  return (
    <AnchoredPopover x={chooser?.x ?? 0} y={chooser?.y ?? 0} open={!!chooser} onOpenChange={(open) => !open && close()} className="w-[260px] p-1.5">
      <div className="px-1.5 pt-0.5 pb-1 text-xs font-medium text-ink-2">Créer…</div>
      {CHOICES.map(({ kind, label, hint, icon: Icon }) => (
        <button
          key={kind}
          type="button"
          onClick={() => {
            close()
            if (chooser) startCreation(kind, chooser)
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-hover"
        >
          <span className="flex size-7 items-center justify-center rounded-md border border-line text-ink-2">
            <Icon size={14} fill={kind === 'simple' ? 'currentColor' : 'none'} className={kind === 'simple' ? 'scale-50' : undefined} />
          </span>
          <span>
            <span className="block text-sm font-medium">{label}</span>
            <span className="block text-xs text-ink-3">{hint}</span>
          </span>
        </button>
      ))}
    </AnchoredPopover>
  )
}

function DeleteChoiceDialog() {
  const choice = useUi((s) => s.deleteChoice)
  const task = useApp((s) => s.data.tasks.find((t) => t.id === choice?.taskId))
  const close = () => ui.set({ deleteChoice: null })
  if (!choice || !task) return null
  const app = useApp.getState()
  const isHabit = task.kind === 'habit'

  const run = (message: string, action: () => void) => {
    close()
    withUndo(message, action)
  }

  return (
    <Modal open onOpenChange={(open) => !open && close()} title={isHabit ? "Supprimer l'habitude" : 'Supprimer la tâche étalée'} description={`« ${task.title} »`}>
      <div className="grid gap-2 pt-1">
        {isHabit ? (
          <Button variant="outline" className="h-auto justify-start py-2 text-left" onClick={() => run('Habitude arrêtée', () => app.endHabitFrom(task.id, choice.date!))}>
            <span>
              <span className="block">À partir d'aujourd'hui</span>
              <span className="block text-xs font-normal text-ink-2">Les jours passés et leur historique sont conservés (fin au {fmtYesterday(choice.date!)}).</span>
            </span>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-auto justify-start py-2 text-left"
            onClick={() => run('Créneau supprimé', () => app.deleteSlot(task.id, choice.slotId!))}
            disabled={!choice.slotId}
          >
            <span>
              <span className="block">Ce créneau</span>
              <span className="block text-xs font-normal text-ink-2">
                {task.slots.length > 1 ? `Les ${task.slots.length - 1} autres créneaux restent.` : 'C’est le dernier : la tâche deviendra « non planifiée ».'}
              </span>
            </span>
          </Button>
        )}
        <Button variant="outline" className="h-auto justify-start py-2 text-left text-danger" onClick={() => run(isHabit ? 'Habitude mise à la poubelle' : 'Tâche mise à la poubelle', () => app.deleteTask(task.id))}>
          <span>
            <span className="block">{isHabit ? "Toute l'habitude" : 'Toute la tâche'}</span>
            <span className="block text-xs font-normal text-ink-2">{isHabit ? 'Toutes les occurrences, passées et futures.' : 'Tous ses créneaux.'}</span>
          </span>
        </Button>
      </div>
    </Modal>
  )
}

const fmtYesterday = (key: string) => addDays(fromKey(key), -1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

function ConfirmDialog() {
  const confirm = useUi((s) => s.confirm)
  const close = () => ui.set({ confirm: null })
  if (!confirm) return null
  return (
    <Modal
      open
      onOpenChange={(open) => !open && close()}
      title={confirm.title}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Annuler
          </Button>
          <Button
            variant="danger"
            autoFocus
            onClick={() => {
              close()
              confirm.onConfirm()
            }}
          >
            {confirm.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-2">{confirm.message}</p>
    </Modal>
  )
}

/** Menu clic droit d'une entrée du calendrier (ou d'un panneau). */
function EntryContextMenu() {
  const menu = useUi((s) => s.entryMenu)
  return <ActionMenu at={menu} items={menu ? entryMenuItems(menu.entry) : []} onClose={() => ui.set({ entryMenu: null })} />
}

/** « Couleur et style » d'une catégorie ou sous-catégorie, avec aperçu en direct sur les tâches. */
function StyleEditor() {
  const editor = useUi((s) => s.styleEditor)
  const item = useApp((s) =>
    editor?.kind === 'category' ? s.data.categories.find((c) => c.id === editor.id) : s.data.subcategories.find((c) => c.id === editor?.id),
  )
  const app = useApp.getState()
  const update = (patch: { color?: string; styleTarget?: 'label' | 'background' | 'border' }) =>
    editor?.kind === 'category' ? app.updateCategory(editor.id, patch) : editor && app.updateSubcategory(editor.id, patch)
  return (
    <AnchoredPopover x={editor?.x ?? 0} y={editor?.y ?? 0} open={!!editor && !!item} onOpenChange={(open) => !open && ui.set({ styleEditor: null })} className="p-0">
      {item && (
        <>
          <div className="border-b border-line px-3 py-2 text-xs font-medium text-ink-2">Couleur de « {item.name || 'Sans titre'} »</div>
          <ColorPicker color={item.color} target={item.styleTarget} onColorChange={(color) => update({ color })} onTargetChange={(styleTarget) => update({ styleTarget })} />
        </>
      )}
    </AnchoredPopover>
  )
}

