import { create } from 'zustand'
import type { Entry } from '@/domain/entries'
import type { CalendarEvent, ID, Task } from '@/domain/types'

/** Brouillon de tâche : formulaire de création, et propriétés éditées dans la page de la tâche. */
export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'occurrences' | 'subtasks' | 'content' | 'source'> &
  Partial<Pick<Task, 'occurrences' | 'subtasks' | 'content'>>

/** Formulaire de création (une tâche existante se modifie dans sa page). */
export interface TaskFormState {
  draft: TaskDraft
}

export interface EventFormState {
  mode: 'create' | 'edit'
  eventId?: ID
  draft: Omit<CalendarEvent, 'id'>
}

export interface CreateChooserState {
  x: number
  y: number
  start: Date
  end: Date
  allDay: boolean
  /** `quick` : semaine / jour (création directe). `form` : mois (formulaire). */
  flow: 'quick' | 'form'
}

export interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
}

/** État d'interface éphémère (non sauvegardé). */
interface UiState {
  peekTaskId: ID | null
  taskForm: TaskFormState | null
  eventForm: EventFormState | null
  createChooser: CreateChooserState | null
  deleteChoice: { taskId: ID; slotId?: ID; date?: string } | null
  confirm: ConfirmState | null
  entryMenu: { x: number; y: number; entry: Entry } | null
  styleEditor: { kind: 'category' | 'subcategory'; id: ID; x: number; y: number } | null
  /** Fiche (façon page Notion) d'une catégorie ou sous-catégorie ouverte par « Modifier… ». */
  categorySheet: { kind: 'category' | 'subcategory'; id: ID } | null
  /** Élément dont le titre est en cours de saisie (nouvelle ligne, entrée créée au calendrier…). */
  editingKey: string | null
  notionPending: Record<ID, true>
  overflowDay: Date | null
  notionDialogOpen: boolean
}

export const useUi = create<UiState>(() => ({
  peekTaskId: null,
  taskForm: null,
  eventForm: null,
  createChooser: null,
  deleteChoice: null,
  confirm: null,
  entryMenu: null,
  styleEditor: null,
  categorySheet: null,
  editingKey: null,
  notionPending: {},
  overflowDay: null,
  notionDialogOpen: false,
}))

export const ui = {
  set: (patch: Partial<UiState>) => useUi.setState(patch),
  openPeek: (taskId: ID) => useUi.setState({ peekTaskId: taskId }),
  confirm: (state: ConfirmState) => useUi.setState({ confirm: state }),
  openTaskForm: (form: TaskFormState) => useUi.setState({ taskForm: form }),
  openEventForm: (form: EventFormState) => useUi.setState({ eventForm: form }),
}

export function emptyDraft(kind: Task['kind'], patch: Partial<TaskDraft> = {}): TaskDraft {
  return {
    kind,
    title: '',
    done: false,
    categoryIds: [],
    subcategoryIds: [],
    slots: [],
    ...patch,
  }
}

