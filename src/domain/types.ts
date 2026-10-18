// Formes des données. Elles suivent les tables prévues dans plan.md (section 3),
// en version « dénormalisée » pratique pour le front (liens et créneaux embarqués).

import type { JSONContent } from '@tiptap/react'

export type ID = string
/** Date seule, format `yyyy-MM-dd`. */
export type DateKey = string
/** Date + heure, ISO 8601. */
export type ISODateTime = string

export type StyleTarget = 'label' | 'background' | 'border'
export type TaskKind = 'simple' | 'spread' | 'habit'
export type EntryType = TaskKind | 'event'
export type Priority = 'low' | 'medium' | 'high'
export type CalendarMode = 'month' | 'week' | 'day'
/** Style des barres de progression : pilules (10.jpg), fiole (11.jpg) ou ruban (12.jpg). */
export type ProgressStyle = 'pills' | 'potion' | 'ribbon'
/** Thème : « journal » (titres en étiquette, lavande, stickers) ou « notion » (sobre, comme Notion). */
export type AppTheme = 'journal' | 'notion'

/** Id réservé à la catégorie virtuelle « Autre » (n'existe pas en base). */
export const OTHER = 'other'

/** Emoji, image de la page Icônes, ou icône Hugeicons (par son nom d'export, ex. « Home01Icon »). */
export type IconRef = { type: 'emoji'; value: string } | { type: 'image'; iconId: ID } | { type: 'hugeicon'; name: string }

export interface Category {
  id: ID
  name: string
  color: string
  styleTarget: StyleTarget
  icon?: IconRef
  position: number
}

export interface Subcategory extends Category {
  categoryId: ID
  isProject: boolean
  description?: string
  /** Date seule ou date + heure selon `deadlineHasTime`. */
  deadline?: string
  deadlineHasTime: boolean
}

/** Un créneau : soit horaire, soit en journée(s) entière(s) (fin incluse). */
export type Slot =
  | { id: ID; allDay: false; start: ISODateTime; end: ISODateTime }
  | { id: ID; allDay: true; startsOn: DateKey; endsOn: DateKey }

export interface Recurrence {
  /** Jours ISO : 1 = lundi … 7 = dimanche. Le vrai projet sérialisera ça en RRULE. */
  weekdays: number[]
  startDate: DateKey
  endDate?: DateKey
  /** `HH:mm`. Absent = habitude sans heure (heure choisie jour par jour). */
  startTime?: string
  durationMin: number
}

/** Exception d'une occurrence d'habitude (cochée, ou heure choisie ce jour-là). */
export interface Occurrence {
  done: boolean
  start?: ISODateTime
  end?: ISODateTime
}

export interface Subtask {
  id: ID
  title: string
  done: boolean
}

export interface Task {
  id: ID
  kind: TaskKind
  title: string
  priority?: Priority
  done: boolean
  doneAt?: ISODateTime
  content?: JSONContent
  subtasks: Subtask[]
  createdAt: ISODateTime
  categoryIds: ID[]
  primaryCategoryId?: ID
  subcategoryIds: ID[]
  primarySubcategoryId?: ID
  /** Simple : 0 ou 1 créneau. Étalée : N créneaux. Aucun = « non planifiée ». */
  slots: Slot[]
  recurrence?: Recurrence
  occurrences: Record<DateKey, Occurrence>
  /** Présent si la tâche vient d'une base Notion (lue en direct, jamais importée). */
  source?: { kind: 'notion'; sourceId: ID }
}

export interface CalendarEvent {
  id: ID
  title: string
  color: string
  slot: Slot
}

export interface IconAsset {
  id: ID
  name: string
  dataUrl: string
  createdAt: ISODateTime
}

export interface NotionSource {
  id: ID
  name: string
  icon: string
  showInCalendar: boolean
}

export interface CalendarFilters {
  /** Vide = toutes. Peut contenir `OTHER`. */
  categoryIds: ID[]
  subcategoryIds: ID[]
  /** Vide = toutes. `none` = sans priorité. */
  priorities: (Priority | 'none')[]
  status: 'all' | 'todo' | 'done'
  /** Vide = tous. */
  kinds: EntryType[]
}

export interface CalendarView {
  id: ID
  mode: CalendarMode
  name: string
  filters: CalendarFilters
  unscheduledOpen: boolean
  position: number
}

export interface Settings {
  openFormAfterQuickCreate: boolean
  defaultDurationMin: number
  defaultCategoryColor: string
  defaultEventColor: string
  showMascot: boolean
  doneStyle: 'faded' | 'hatched'
  peekMode: 'side' | 'center'
  progressStyle: ProgressStyle
  theme: AppTheme
  showPlatformTasks: boolean
  simulateNotionFailure: boolean
  bilanSubcategoryIds: ID[]
}

export interface DataState {
  categories: Category[]
  subcategories: Subcategory[]
  tasks: Task[]
  events: CalendarEvent[]
  icons: IconAsset[]
  notionSources: NotionSource[]
  views: CalendarView[]
  settings: Settings
}

export const EMPTY_FILTERS: CalendarFilters = {
  categoryIds: [],
  subcategoryIds: [],
  priorities: [],
  status: 'all',
  kinds: [],
}
