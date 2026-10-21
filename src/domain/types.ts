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
  | { id: ID; allDay: false; start: ISODateTime; end: ISODateTime; done?: boolean }
  | { id: ID; allDay: true; startsOn: DateKey; endsOn: DateKey; done?: boolean }

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
  /** Matrice d'Eisenhower (l'importance vient de la priorité). Absent = pas encore classée. */
  urgent?: boolean
  done: boolean
  /** Date à laquelle la tâche a été cochée (effacée quand on la décoche). */
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

/** Répétition d'un événement : jamais, ou chaque semaine / mois / année à partir de son créneau. */
export type EventRepeat = 'none' | 'weekly' | 'monthly' | 'yearly'

export interface CalendarEvent {
  id: ID
  title: string
  color: string
  /** Premier créneau. S'il se répète, les suivants sont calculés (`expandEvent`), jamais stockés. */
  slot: Slot
  /** Absent = `none`. */
  repeat?: EventRepeat
  /** Bornes facultatives de la répétition, incluses. Sans début : dès le créneau ; sans fin : pour toujours. */
  repeatStart?: DateKey
  repeatEnd?: DateKey
}

/** Modèle d'événement : un nom, une couleur et une répétition appliqués d'un clic dans le formulaire. */
export interface EventTemplate {
  id: ID
  name: string
  color: string
  repeat: EventRepeat
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

/** Quadrants de la matrice d'Eisenhower : q1 urgent et important, q2 important, q3 urgent, q4 ni l'un ni l'autre. */
export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4'

export interface PomodoroSettings {
  workMin: number
  shortBreakMin: number
  longBreakMin: number
  /** Sessions de travail avant une pause longue. */
  cyclesBeforeLong: number
  sound: boolean
}

export interface PomodoroSession {
  id: ID
  taskId?: ID
  startedAt: ISODateTime
  minutes: number
}

/** Phrases de la mascotte, avec des codes `{restantes}`… remplacés au moment de parler. */
export interface MascotLines {
  idle: string[]
  clickTodo: string[]
  clickDone: string[]
  clickEmpty: string[]
}

/** Élément de la poubelle, gardé 30 jours. Une catégorie emporte ses sous-catégories et les liens de ses tâches. */
export interface TrashItem {
  id: ID
  kind: 'task' | 'category' | 'subcategory'
  deletedAt: ISODateTime
  task?: Task
  category?: Category
  subcategories?: Subcategory[]
  /** Liens des tâches avant la suppression, pour les recréer à la restauration. */
  links?: TaskLinkSnapshot[]
}

export interface TaskLinkSnapshot {
  taskId: ID
  categoryIds: ID[]
  primaryCategoryId?: ID
  subcategoryIds: ID[]
  primarySubcategoryId?: ID
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
  /** Couleur des tâches : celle de leur catégorie, ou celle de leur quadrant d'Eisenhower. */
  colorMode: 'category' | 'eisenhower'
  eisenhowerColors: Record<Quadrant, string>
  pomodoro: PomodoroSettings
  mascot: MascotLines
}

export interface DataState {
  categories: Category[]
  subcategories: Subcategory[]
  tasks: Task[]
  events: CalendarEvent[]
  eventTemplates: EventTemplate[]
  icons: IconAsset[]
  notionSources: NotionSource[]
  views: CalendarView[]
  settings: Settings
  trash: TrashItem[]
  pomodoroSessions: PomodoroSession[]
}

export const DEFAULT_EISENHOWER_COLORS: Record<Quadrant, string> = { q1: '#D44C47', q2: '#337EA9', q3: '#D9730D', q4: '#787774' }

/** Modèles proposés au premier lancement. Ce sont des données comme les autres : on peut les supprimer. */
export const DEFAULT_EVENT_TEMPLATES: EventTemplate[] = [
  { id: 'tpl-birthday', name: 'Anniversaire', color: '#337EA9', repeat: 'yearly' },
  { id: 'tpl-family', name: 'Réunion de famille', color: '#CB912F', repeat: 'none' },
  { id: 'tpl-rent', name: 'Loyer', color: '#D9730D', repeat: 'monthly' },
  { id: 'tpl-class', name: 'Cours', color: '#448361', repeat: 'weekly' },
]

export const DEFAULT_POMODORO: PomodoroSettings = { workMin: 25, shortBreakMin: 5, longBreakMin: 15, cyclesBeforeLong: 4, sound: true }

export const DEFAULT_MASCOT_LINES: MascotLines = {
  idle: ['Tu gères, {prenom} ! ✨', 'Une petite pause ? ☕', 'Pense à boire de l’eau 💧', 'On avance bien 🐾', 'Coucou ! 👋', 'Je surveille le calendrier 👀', 'Bouh ! 👻'],
  clickTodo: ['Encore {restantes} chose(s) à faire aujourd’hui 💪', '{faites} sur {total} : continue comme ça !'],
  clickDone: ['Tout est fait aujourd’hui ! 🎉'],
  clickEmpty: ['Rien de prévu aujourd’hui 🌿'],
}

export const EMPTY_FILTERS: CalendarFilters = {
  categoryIds: [],
  subcategoryIds: [],
  priorities: [],
  status: 'all',
  kinds: [],
}
