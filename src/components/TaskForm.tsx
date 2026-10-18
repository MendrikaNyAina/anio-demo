import { useState } from 'react'
import { KIND_LABEL } from '@/domain/display'
import { useApp } from '@/store/appStore'
import { ui, useUi, type TaskDraft, type TaskFormState } from '@/store/uiStore'
import { scheduleError, TaskPropertyFields } from './TaskFields'
import { TypeIndicator } from './TypeIndicator'
import { Button } from './ui/button'
import { Modal } from './ui/dialog'

export function TaskFormDialog() {
  const form = useUi((s) => s.taskForm)
  if (!form) return null
  return <TaskForm form={form} />
}

/**
 * Formulaire de création des 3 types de tâches (calendrier.md l. 42).
 * Une tâche existante se modifie directement dans sa page (TaskPeek).
 */
function TaskForm({ form }: { form: TaskFormState }) {
  const [draft, setDraft] = useState<TaskDraft>(form.draft)
  const createTask = useApp((s) => s.createTask)
  const patch = (p: Partial<TaskDraft>) => setDraft((d) => ({ ...d, ...p }))
  const close = () => ui.set({ taskForm: null })
  const error = scheduleError(draft)

  const save = () => {
    if (error) return
    createTask({ ...draft, title: draft.title.trim() || 'Sans titre' })
    close()
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && close()}
      dismissable={false}
      className="w-[min(600px,calc(100vw-32px))]"
      title={
        <span className="flex items-center gap-2">
          <TypeIndicator type={draft.kind} size={14} />
          Nouvelle {KIND_LABEL[draft.kind].toLowerCase()}
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Annuler
          </Button>
          <Button variant="primary" onClick={save} disabled={!!error}>
            Créer
          </Button>
        </>
      }
    >
      <input
        autoFocus
        value={draft.title}
        onChange={(e) => patch({ title: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="Sans titre"
        className="mb-3 w-full text-[22px] font-bold outline-none placeholder:text-[#d3d1cb]"
      />
      <TaskPropertyFields value={draft} onChange={patch} />
    </Modal>
  )
}
