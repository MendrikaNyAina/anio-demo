import { Calendar, CheckSquare, ExternalLink, MoreHorizontal, Plus, Shapes, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KIND_LABEL, taskDisplayRange } from '@/domain/display'
import { buildLookup } from '@/domain/lookup'
import { resolveTaskStyle } from '@/domain/style'
import type { Task } from '@/domain/types'
import { cn, newId } from '@/lib/utils'
import { useApp, withUndo } from '@/store/appStore'
import { ui, useUi, type TaskDraft } from '@/store/uiStore'
import { InlineEditableText } from './InlineEditableText'
import { PeekControls, PeekShell } from './PeekShell'
import { RichEditor } from './RichEditor'
import { scheduleError, TaskPropertyFields } from './TaskFields'
import { TypeIndicator } from './TypeIndicator'
import { Button } from './ui/button'
import { Checkbox, PropertyRow } from './ui/controls'
import { useActionMenu } from './ui/menu'

type Schedule = Pick<TaskDraft, 'slots' | 'recurrence'>

/**
 * Page d'une tâche, en panneau latéral (« side peek ») ou en fenêtre centrée selon le réglage.
 * Tout s'y modifie directement, comme une page Notion : il n'y a pas de formulaire de modification à part.
 */
export function TaskPeek() {
  const id = useUi((s) => s.peekTaskId)
  const task = useApp((s) => s.data.tasks.find((t) => t.id === id))
  const close = () => ui.set({ peekTaskId: null })

  return (
    <PeekShell open={!!task} onClose={close} label={task ? `Tâche « ${task.title} »` : 'Tâche'}>
      {task && <PeekBody key={task.id} task={task} onClose={close} />}
    </PeekShell>
  )
}

function PeekBody({ task, onClose }: { task: Task; onClose: () => void }) {
  const data = useApp((s) => s.data)
  const updateTask = useApp((s) => s.updateTask)
  const toggleTaskDone = useApp((s) => s.toggleTaskDone)
  const editingKey = useUi((s) => s.editingKey)
  const lookup = useMemo(() => buildLookup(data), [data])
  const isNotion = !!task.source
  const style = isNotion ? null : resolveTaskStyle(task, lookup)
  const firstCategory = task.categoryIds.map((id) => lookup.categories.get(id)).find(Boolean)

  // Dates en cours de saisie mais invalides (fin avant début, aucun jour…) : affichées avec leur erreur,
  // enregistrées seulement une fois corrigées, pour ne jamais mettre une tâche impossible dans le calendrier.
  const [pendingSchedule, setPendingSchedule] = useState<Schedule | null>(null)
  const value: TaskDraft = pendingSchedule ? { ...task, ...pendingSchedule } : task

  const change = (patch: Partial<TaskDraft>) => {
    const { slots, recurrence, done, ...rest } = patch
    // `toggleTaskDone` plutôt qu'un simple `done` : il tient aussi à jour la date de fin (Bilan).
    if (done !== undefined && done !== task.done) toggleTaskDone(task.id)
    if (Object.keys(rest).length > 0) updateTask(task.id, rest)
    if ('slots' in patch || 'recurrence' in patch) {
      const schedule: Schedule = { slots: slots ?? value.slots, recurrence: 'recurrence' in patch ? recurrence : value.recurrence }
      if (scheduleError({ kind: rest.kind ?? task.kind, ...schedule })) return setPendingSchedule(schedule)
      updateTask(task.id, schedule)
      setPendingSchedule(null)
    }
  }

  const menu = useActionMenu([
    {
      label: 'Supprimer',
      icon: <Trash2 />,
      danger: true,
      disabled: isNotion,
      hint: isNotion ? 'dans Notion' : undefined,
      onSelect: () => {
        onClose()
        withUndo('Tâche supprimée', () => useApp.getState().deleteTask(task.id))
      },
    },
  ])

  const addSubtask = () => {
    const sub = { id: newId(), title: '', done: false }
    updateTask(task.id, { subtasks: [...task.subtasks, sub] })
    ui.set({ editingKey: sub.id })
  }

  return (
    <>
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        <PeekControls onClose={onClose} />
        <span className="ml-1 truncate text-[13px] text-ink-2">{isNotion ? `Notion · ${lookup.sources.get(task.source!.sourceId)?.name}` : (firstCategory?.name ?? 'Autre')}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="subtle" onClick={menu.openFromButton} aria-label="Plus d'actions">
            <MoreHorizontal size={16} />
          </Button>
        </div>
        {menu.element}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-10 pt-8 pb-16">
        <div className="mb-4 flex items-start gap-3">
          {task.kind !== 'habit' && <Checkbox checked={task.done} onChange={() => toggleTaskDone(task.id)} className="mt-2.5 size-5" label="Fait" />}
          <InlineEditableText
            value={task.title}
            onSave={(title) => updateTask(task.id, { title })}
            className={cn('text-[28px] leading-tight font-bold', task.done && 'text-ink-3 line-through')}
            inputClassName="text-[28px] leading-tight font-bold"
          />
        </div>

        {isNotion ? (
          // Une tâche Notion se coche et se déplace dans le calendrier ; le reste se modifie dans Notion.
          <>
            <PropertyRow label="Type" icon={<Shapes />}>
              <span className="flex items-center gap-1.5 pt-1 text-sm">
                <TypeIndicator type={task.kind} notion size={16} /> {KIND_LABEL[task.kind]}
              </span>
            </PropertyRow>
            <PropertyRow label="Statut" icon={<CheckSquare />}>
              <span className="inline-block pt-1 text-sm">{task.done ? 'Fait' : 'À faire'}</span>
            </PropertyRow>
            <PropertyRow label="Date" icon={<Calendar />}>
              <span className={cn('inline-block pt-1 text-sm', task.slots.length === 0 && 'text-ink-3')}>{taskDisplayRange(task)}</span>
            </PropertyRow>
          </>
        ) : (
          <TaskPropertyFields value={value} onChange={change} typeIcon={<TypeIndicator type={task.kind} icon={style?.icon} color={style?.color} size={16} />} />
        )}

        <div className="mt-6 border-t border-line pt-4">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sous-tâches</h3>
            {task.subtasks.length > 0 && (
              <span className="text-xs text-ink-3">
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
              </span>
            )}
          </div>
          {task.subtasks.map((sub) => (
            <div key={sub.id} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-hover">
              <Checkbox checked={sub.done} onChange={(done) => updateTask(task.id, { subtasks: task.subtasks.map((s) => (s.id === sub.id ? { ...s, done } : s)) })} />
              <InlineEditableText
                value={sub.title}
                startEditing={editingKey === sub.id}
                placeholder="Sous-tâche"
                className={cn('flex-1 text-sm', sub.done && 'text-ink-3 line-through')}
                onSave={(title) => {
                  ui.set({ editingKey: null })
                  updateTask(task.id, { subtasks: task.subtasks.map((s) => (s.id === sub.id ? { ...s, title } : s)) })
                }}
                onCancel={() => {
                  ui.set({ editingKey: null })
                  updateTask(task.id, { subtasks: task.subtasks.filter((s) => s.id !== sub.id) })
                }}
              />
              <button
                type="button"
                onClick={() => updateTask(task.id, { subtasks: task.subtasks.filter((s) => s.id !== sub.id) })}
                className="text-ink-3 opacity-0 group-hover:opacity-100 hover:text-ink"
                aria-label="Supprimer la sous-tâche"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addSubtask} className="mt-0.5 flex items-center gap-2 rounded-md px-1 py-1 text-sm text-ink-3 hover:bg-hover hover:text-ink">
            <Plus size={15} /> Ajouter une sous-tâche
          </button>
        </div>

        <div className="mt-6 border-t border-line pt-3">
          {isNotion ? (
            <div className="rounded-lg bg-sidebar p-4 text-sm text-ink-2">
              Le contenu de cette page est dans Notion. Ici, tu peux la cocher et changer ses dates (en la déplaçant dans le calendrier) : la modification est renvoyée à Notion.
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={() => window.open('https://www.notion.so', '_blank')}>
                  <ExternalLink size={13} /> Ouvrir dans Notion
                </Button>
              </div>
            </div>
          ) : (
            <RichEditor content={task.content} onChange={(content) => updateTask(task.id, { content })} />
          )}
        </div>
      </div>
    </>
  )
}
