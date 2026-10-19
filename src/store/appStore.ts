import { addDays } from 'date-fns'
import { current, isDraft, type Draft } from 'immer'
import { toast } from 'sonner'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { fromKey, isoDay, slotBounds, splitByDay, toHHmm, toKey } from '@/domain/dates'
import { normalizeLinks } from '@/domain/grouping'
import { keepRecent } from '@/domain/trash'
import {
  DEFAULT_EISENHOWER_COLORS,
  DEFAULT_MASCOT_LINES,
  DEFAULT_POMODORO,
  EMPTY_FILTERS,
  type CalendarEvent,
  type CalendarMode,
  type CalendarView,
  type Category,
  type DataState,
  type DateKey,
  type ID,
  type Occurrence,
  type Settings,
  type Slot,
  type StyleTarget,
  type Subcategory,
  type Task,
  type TaskLinkSnapshot,
} from '@/domain/types'
import { newId } from '@/lib/utils'
import { NOTION_CATALOG, notionTasks } from '@/mock/notionCatalog'
import { createSeed } from '@/mock/seed'
import { useUi, type TaskDraft } from './uiStore'

// Le store joue le rôle de la future couche de données (plan.md, « Couche données ») :
// une action par intention utilisateur. Dans le vrai projet, ces actions appelleront
// les repositories Supabase au lieu de modifier un état local.

export interface Prefs {
  sidebarOpen: boolean
  calendarDate: string
  activeViewByMode: Partial<Record<CalendarMode, ID>>
  /** Accordéons ouverts (page Catégories et menu du calendrier). */
  expanded: Record<string, boolean>
  /** Affichage de la page Catégories (exploration de styles). */
  categoriesLayout?: 'notion' | 'soft' | 'pixel'
  /** Suivi des habitudes : onglet ouvert, et habitudes terminées cochées pour rester dans les onglets. */
  habitActiveId?: ID
  habitShownEnded?: ID[]
  /** Vue matrice d'Eisenhower : période affichée. */
  matrixPeriod?: CalendarMode
}

/** Suppression définitive (annulation d'une création, par exemple) au lieu de la poubelle. */
type DeleteOptions = { permanent?: boolean }

interface AppState {
  data: DataState
  session: { name: string; email: string } | null
  prefs: Prefs

  login(): void
  logout(): void
  resetDemo(): void
  restore(data: DataState): void
  setPrefs(patch: Partial<Prefs>): void
  toggleExpanded(key: string, value?: boolean): void

  createCategory(patch?: Partial<Category>): ID
  updateCategory(id: ID, patch: Partial<Category>): void
  deleteCategory(id: ID, options?: DeleteOptions): void
  reorderCategories(ids: ID[]): void
  createSubcategory(categoryId: ID, patch?: Partial<Subcategory>): ID
  updateSubcategory(id: ID, patch: Partial<Subcategory>): void
  deleteSubcategory(id: ID, options?: DeleteOptions): void
  reorderSubcategories(ids: ID[]): void
  /** Même présentation (label / fond / bordure) pour toutes les catégories et sous-catégories. */
  setAllStyleTargets(target: StyleTarget): void

  createTask(draft: TaskDraft): ID
  updateTask(id: ID, patch: Partial<Task>): void
  toggleTaskDone(id: ID): void
  deleteTask(id: ID, options?: DeleteOptions): void
  /** Tâche simple → habitude, avec une récurrence déduite de son créneau. */
  convertToHabit(id: ID): void
  setSlot(taskId: ID, slot: Slot): void
  addSlot(taskId: ID, slot: Slot): void
  deleteSlot(taskId: ID, slotId: ID): void
  toggleSlotDone(taskId: ID, slotId: ID): void

  restoreTrash(id: ID): void
  purgeTrash(id: ID): void
  emptyTrash(): void

  addPomodoroSession(minutes: number, taskId?: ID): void
  setOccurrence(taskId: ID, date: DateKey, patch: Partial<Occurrence>): void
  toggleOccurrenceDone(taskId: ID, date: DateKey): void
  endHabitFrom(taskId: ID, date: DateKey): void

  createEvent(event: Omit<CalendarEvent, 'id'>): ID
  updateEvent(id: ID, patch: Partial<CalendarEvent>): void
  deleteEvent(id: ID): void

  addIcon(name: string, dataUrl: string): ID
  renameIcon(id: ID, name: string): void
  deleteIcon(id: ID): void

  integrateNotion(catalogId: string): void
  setNotionVisible(id: ID, visible: boolean): void
  removeNotionSource(id: ID): void

  createView(mode: CalendarMode, from?: CalendarView): ID
  updateView(id: ID, patch: Partial<CalendarView>): void
  deleteView(id: ID): void
  moveView(id: ID, direction: -1 | 1): void
  setActiveView(mode: CalendarMode, id: ID): void

  updateSettings(patch: Partial<Settings>): void
}

const initialPrefs = (data: DataState): Prefs => ({
  sidebarOpen: true,
  calendarDate: new Date().toISOString(),
  activeViewByMode: {},
  expanded: { [data.categories[0]?.id]: true, [data.subcategories[0]?.id]: true },
})

const nextPosition = (items: { position: number }[]) => items.reduce((max, i) => Math.max(max, i.position + 1), 0)

/** Copie simple d'un objet de l'état (un brouillon Immer ne peut pas être cloné tel quel). */
const plain = <T,>(value: T): T => (isDraft(value) ? (current(value as Draft<T>) as T) : structuredClone(value))

/**
 * Seul endroit qui coche / décoche une tâche : tient à jour la date de fin (Bilan)
 * et, pour une tâche étalée, coche ou décoche tous ses créneaux.
 */
function setDone(task: Task, done: boolean) {
  if (task.done !== done) task.doneAt = done ? new Date().toISOString() : undefined
  task.done = done
  if (task.kind === 'spread') for (const slot of task.slots) slot.done = done
}

/** Tâche étalée : faite quand tous ses créneaux sont cochés. */
function syncSpreadDone(task: Task) {
  if (task.kind !== 'spread' || task.slots.length === 0) return
  const all = task.slots.every((s) => s.done)
  if (all !== task.done) {
    task.done = all
    task.doneAt = all ? new Date().toISOString() : undefined
  }
}

const linkSnapshot = (t: Task): TaskLinkSnapshot => ({
  taskId: t.id,
  categoryIds: [...t.categoryIds],
  primaryCategoryId: t.primaryCategoryId,
  subcategoryIds: [...t.subcategoryIds],
  primarySubcategoryId: t.primarySubcategoryId,
})

/** Remet les liens d'avant la suppression, sans perdre ceux ajoutés depuis. */
function relink(task: Task, snap: TaskLinkSnapshot, data: DataState) {
  const categories = new Set(data.categories.map((c) => c.id))
  const subs = new Set(data.subcategories.map((s) => s.id))
  task.categoryIds = [...new Set([...task.categoryIds, ...snap.categoryIds.filter((id) => categories.has(id))])]
  task.subcategoryIds = [...new Set([...task.subcategoryIds, ...snap.subcategoryIds.filter((id) => subs.has(id))])]
  if (snap.primaryCategoryId && categories.has(snap.primaryCategoryId)) task.primaryCategoryId = snap.primaryCategoryId
  if (snap.primarySubcategoryId && subs.has(snap.primarySubcategoryId)) task.primarySubcategoryId = snap.primarySubcategoryId
  normalizeLinks(task, data.subcategories)
}

/** Valeurs par défaut des réglages ajoutés après coup (migration et données anciennes). */
const SETTINGS_DEFAULTS = {
  colorMode: 'category',
  eisenhowerColors: DEFAULT_EISENHOWER_COLORS,
  pomodoro: DEFAULT_POMODORO,
  mascot: DEFAULT_MASCOT_LINES,
} satisfies Partial<Settings>

/** Stockage du navigateur protégé : une démo ne doit pas planter si le quota est atteint. */
let warnedQuota = false
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      if (!warnedQuota) toast.error('Le stockage du navigateur est plein : les dernières modifications ne seront pas conservées.')
      warnedQuota = true
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      /* rien à faire */
    }
  },
}

export const useApp = create<AppState>()(
  persist(
    immer((set, get) => {
      /**
       * Toute modification de tâche passe par ici. Pour une tâche Notion, on simule
       * l'écriture via l'API : l'écran change tout de suite, puis Notion confirme
       * (ou refuse, et on revient en arrière).
       */
      const changeTask = (id: ID, recipe: (task: Task, data: DataState) => void) => {
        const before = get().data.tasks.find((t) => t.id === id)
        if (!before) return
        set((s) => {
          const task = s.data.tasks.find((t) => t.id === id)
          if (task) recipe(task, s.data)
        })
        if (before.source) simulateNotionWrite(id, before)
      }

      const simulateNotionWrite = (id: ID, before: Task) => {
        useUi.setState((u) => ({ notionPending: { ...u.notionPending, [id]: true } }))
        setTimeout(() => {
          if (get().data.settings.simulateNotionFailure) {
            set((s) => {
              const index = s.data.tasks.findIndex((t) => t.id === id)
              if (index >= 0) s.data.tasks[index] = before
            })
            toast.error("Notion n'a pas pu être mis à jour", { description: 'La modification a été annulée.' })
          }
          useUi.setState((u) => {
            const pending = { ...u.notionPending }
            delete pending[id]
            return { notionPending: pending }
          })
        }, 900)
      }

      return {
        data: createSeed(),
        session: null,
        prefs: { sidebarOpen: true, calendarDate: new Date().toISOString(), activeViewByMode: {}, expanded: {} },

        login: () => set({ session: { name: 'Mendrika', email: 'demo@mon-calendrier.app' } }),
        logout: () => set({ session: null }),
        resetDemo: () => {
          const data = createSeed()
          set({ data, prefs: initialPrefs(data) })
        },
        restore: (data) => set({ data }),
        setPrefs: (patch) => set((s) => void Object.assign(s.prefs, patch)),
        toggleExpanded: (key, value) =>
          set((s) => {
            s.prefs.expanded[key] = value ?? !s.prefs.expanded[key]
          }),

        // ── Catégories ─────────────────────────────────────────────
        createCategory: (patch = {}) => {
          const id = newId()
          set((s) => {
            s.data.categories.push({
              id,
              name: '',
              color: s.data.settings.defaultCategoryColor,
              styleTarget: 'background',
              position: nextPosition(s.data.categories),
              ...patch,
            })
          })
          return id
        },
        updateCategory: (id, patch) =>
          set((s) => {
            const c = s.data.categories.find((c) => c.id === id)
            if (c) Object.assign(c, patch)
          }),
        deleteCategory: (id, options = {}) =>
          set((s) => {
            const category = s.data.categories.find((c) => c.id === id)
            if (!category) return
            const subIds = new Set(s.data.subcategories.filter((sc) => sc.categoryId === id).map((sc) => sc.id))
            if (!options.permanent) {
              s.data.trash.unshift({
                id: newId(),
                kind: 'category',
                deletedAt: new Date().toISOString(),
                category: plain(category),
                subcategories: s.data.subcategories.filter((sc) => subIds.has(sc.id)).map(plain),
                links: s.data.tasks.filter((t) => t.categoryIds.includes(id)).map(linkSnapshot),
              })
            }
            s.data.categories = s.data.categories.filter((c) => c.id !== id)
            s.data.subcategories = s.data.subcategories.filter((sc) => sc.categoryId !== id)
            // Décision 9 : les tâches perdent le lien ; sans autre catégorie, elles passent dans « Autre ».
            for (const t of s.data.tasks) {
              t.categoryIds = t.categoryIds.filter((c) => c !== id)
              t.subcategoryIds = t.subcategoryIds.filter((sc) => !subIds.has(sc))
              normalizeLinks(t, s.data.subcategories)
            }
            s.data.settings.bilanSubcategoryIds = s.data.settings.bilanSubcategoryIds.filter((sc) => !subIds.has(sc))
            for (const v of s.data.views) {
              v.filters.categoryIds = v.filters.categoryIds.filter((c) => c !== id)
              v.filters.subcategoryIds = v.filters.subcategoryIds.filter((sc) => !subIds.has(sc))
            }
          }),
        reorderCategories: (ids) =>
          set((s) => {
            ids.forEach((id, position) => {
              const c = s.data.categories.find((c) => c.id === id)
              if (c) c.position = position
            })
          }),
        createSubcategory: (categoryId, patch = {}) => {
          const id = newId()
          set((s) => {
            const parent = s.data.categories.find((c) => c.id === categoryId)
            if (!parent) return
            // La couleur et sa présentation sont copiées depuis la catégorie mère.
            s.data.subcategories.push({
              id,
              categoryId,
              name: '',
              color: parent.color,
              styleTarget: parent.styleTarget,
              position: nextPosition(s.data.subcategories.filter((sc) => sc.categoryId === categoryId)),
              isProject: false,
              deadlineHasTime: false,
              ...patch,
            })
          })
          return id
        },
        updateSubcategory: (id, patch) =>
          set((s) => {
            const sc = s.data.subcategories.find((sc) => sc.id === id)
            if (sc) Object.assign(sc, patch)
          }),
        deleteSubcategory: (id, options = {}) =>
          set((s) => {
            const sub = s.data.subcategories.find((sc) => sc.id === id)
            if (!sub) return
            if (!options.permanent) {
              s.data.trash.unshift({
                id: newId(),
                kind: 'subcategory',
                deletedAt: new Date().toISOString(),
                subcategories: [plain(sub)],
                links: s.data.tasks.filter((t) => t.subcategoryIds.includes(id)).map(linkSnapshot),
              })
            }
            s.data.subcategories = s.data.subcategories.filter((sc) => sc.id !== id)
            for (const t of s.data.tasks) {
              t.subcategoryIds = t.subcategoryIds.filter((sc) => sc !== id)
              normalizeLinks(t, s.data.subcategories)
            }
            s.data.settings.bilanSubcategoryIds = s.data.settings.bilanSubcategoryIds.filter((sc) => sc !== id)
            for (const v of s.data.views) v.filters.subcategoryIds = v.filters.subcategoryIds.filter((sc) => sc !== id)
          }),
        reorderSubcategories: (ids) =>
          set((s) => {
            ids.forEach((id, position) => {
              const sc = s.data.subcategories.find((sc) => sc.id === id)
              if (sc) sc.position = position
            })
          }),
        setAllStyleTargets: (target) =>
          set((s) => {
            for (const c of [...s.data.categories, ...s.data.subcategories]) c.styleTarget = target
          }),

        // ── Tâches ────────────────────────────────────────────────
        createTask: (draft) => {
          const id = newId()
          set((s) => {
            const task: Task = {
              ...structuredClone(draft),
              id,
              createdAt: new Date().toISOString(),
              occurrences: draft.occurrences ?? {},
              subtasks: draft.subtasks ?? [],
            }
            normalizeLinks(task, s.data.subcategories)
            s.data.tasks.push(task)
          })
          return id
        },
        updateTask: (id, patch) =>
          changeTask(id, (t, data) => {
            const { done, ...rest } = patch
            Object.assign(t, rest)
            if (done !== undefined) setDone(t, done)
            // Devenue étalée : ses créneaux prennent l'état de la tâche.
            if (patch.kind === 'spread') for (const slot of t.slots) slot.done = t.done
            normalizeLinks(t, data.subcategories)
          }),
        toggleTaskDone: (id) =>
          // La case de la tâche (calendrier, liste, page) coche aussi tous les créneaux d'une tâche étalée.
          changeTask(id, (t) => setDone(t, !t.done)),
        deleteTask: (id, options = {}) =>
          set((s) => {
            const task = s.data.tasks.find((t) => t.id === id)
            if (!task) return
            if (!options.permanent) s.data.trash.unshift({ id: newId(), kind: 'task', deletedAt: new Date().toISOString(), task: plain(task) })
            s.data.tasks = s.data.tasks.filter((t) => t.id !== id)
          }),
        convertToHabit: (id) =>
          changeTask(id, (t) => {
            if (t.kind !== 'simple') return
            // Le jour (et l'heure) du créneau donnent la récurrence ; sans créneau, chaque jour à partir d'aujourd'hui.
            const slot = t.slots[0]
            const start = slot ? slotBounds(slot).start : new Date()
            t.kind = 'habit'
            t.recurrence = {
              weekdays: slot ? [isoDay(start)] : [1, 2, 3, 4, 5, 6, 7],
              startDate: toKey(start),
              startTime: slot && !slot.allDay ? toHHmm(start) : undefined,
              durationMin: slot && !slot.allDay ? Math.max(15, Math.round((+new Date(slot.end) - +start) / 60000)) : get().data.settings.defaultDurationMin,
            }
            t.slots = []
            t.done = false
            t.doneAt = undefined
            t.urgent = undefined
          }),
        setSlot: (taskId, slot) =>
          changeTask(taskId, (t) => {
            const index = t.slots.findIndex((x) => x.id === slot.id)
            if (index >= 0) t.slots[index] = slot
          }),
        addSlot: (taskId, slot) => changeTask(taskId, (t) => void t.slots.push(t.kind === 'spread' ? { ...slot, done: t.done } : slot)),
        deleteSlot: (taskId, slotId) =>
          changeTask(taskId, (t) => {
            // Le dernier créneau supprimé laisse la tâche « non planifiée ».
            t.slots = t.slots.filter((x) => x.id !== slotId)
            syncSpreadDone(t)
          }),
        toggleSlotDone: (taskId, slotId) =>
          changeTask(taskId, (t) => {
            const slot = t.slots.find((x) => x.id === slotId)
            if (!slot) return
            slot.done = !slot.done
            syncSpreadDone(t)
          }),
        setOccurrence: (taskId, date, patch) =>
          changeTask(taskId, (t) => {
            t.occurrences[date] = { ...(t.occurrences[date] ?? { done: false }), ...patch }
          }),
        toggleOccurrenceDone: (taskId, date) =>
          changeTask(taskId, (t) => {
            const occ = t.occurrences[date] ?? { done: false }
            t.occurrences[date] = { ...occ, done: !occ.done }
          }),
        endHabitFrom: (taskId, date) =>
          set((s) => {
            const t = s.data.tasks.find((t) => t.id === taskId)
            if (!t?.recurrence) return
            const lastDay = toKey(addDays(fromKey(date), -1))
            // Si l'habitude n'a pas encore commencé, « à partir d'aujourd'hui » revient à tout supprimer.
            if (t.recurrence.startDate > lastDay) {
              s.data.trash.unshift({ id: newId(), kind: 'task', deletedAt: new Date().toISOString(), task: plain(t) })
              s.data.tasks = s.data.tasks.filter((x) => x.id !== taskId)
              return
            }
            if (!t.recurrence.endDate || t.recurrence.endDate > lastDay) t.recurrence.endDate = lastDay
            for (const key of Object.keys(t.occurrences)) if (key > lastDay) delete t.occurrences[key]
          }),

        // ── Poubelle ──────────────────────────────────────────────
        restoreTrash: (id) =>
          set((s) => {
            const item = s.data.trash.find((x) => x.id === id)
            if (!item) return
            s.data.trash = s.data.trash.filter((x) => x.id !== id)
            if (item.kind === 'task' && item.task) {
              const task = item.task
              // Ses catégories ont pu disparaître entre-temps : elle repasse alors dans « Autre ».
              const categories = new Set(s.data.categories.map((c) => c.id))
              task.categoryIds = task.categoryIds.filter((c) => categories.has(c))
              normalizeLinks(task, s.data.subcategories)
              s.data.tasks.push(task)
              return
            }
            if (item.category && !s.data.categories.some((c) => c.id === item.category!.id)) s.data.categories.push(item.category)
            const subs = item.subcategories ?? []
            // Une sous-catégorie dont la catégorie est aussi dans la poubelle ramène sa catégorie.
            for (const sub of subs) {
              if (s.data.categories.some((c) => c.id === sub.categoryId)) continue
              const parent = s.data.trash.find((x) => x.kind === 'category' && x.category?.id === sub.categoryId)
              if (!parent?.category) continue
              s.data.categories.push(parent.category)
              s.data.trash = s.data.trash.filter((x) => x.id !== parent.id)
              for (const snap of parent.links ?? []) {
                const t = s.data.tasks.find((x) => x.id === snap.taskId)
                if (t) relink(t, { ...snap, subcategoryIds: [], primarySubcategoryId: undefined }, s.data)
              }
            }
            for (const sub of subs) {
              if (s.data.categories.some((c) => c.id === sub.categoryId) && !s.data.subcategories.some((x) => x.id === sub.id)) s.data.subcategories.push(sub)
            }
            for (const snap of item.links ?? []) {
              const t = s.data.tasks.find((x) => x.id === snap.taskId)
              if (t) relink(t, snap, s.data)
            }
          }),
        purgeTrash: (id) =>
          set((s) => {
            s.data.trash = s.data.trash.filter((x) => x.id !== id)
          }),
        emptyTrash: () => set((s) => void (s.data.trash = [])),

        // ── Pomodoro ──────────────────────────────────────────────
        addPomodoroSession: (minutes, taskId) =>
          set((s) => void s.data.pomodoroSessions.push({ id: newId(), taskId, startedAt: new Date(Date.now() - minutes * 60000).toISOString(), minutes })),

        // ── Événements ────────────────────────────────────────────
        createEvent: (event) => {
          const id = newId()
          set((s) => void s.data.events.push({ ...structuredClone(event), id }))
          return id
        },
        updateEvent: (id, patch) =>
          set((s) => {
            const e = s.data.events.find((e) => e.id === id)
            if (e) Object.assign(e, patch)
          }),
        deleteEvent: (id) =>
          set((s) => {
            s.data.events = s.data.events.filter((e) => e.id !== id)
          }),

        // ── Icônes ────────────────────────────────────────────────
        addIcon: (name, dataUrl) => {
          const id = newId()
          set((s) => void s.data.icons.unshift({ id, name, dataUrl, createdAt: new Date().toISOString() }))
          return id
        },
        renameIcon: (id, name) =>
          set((s) => {
            const icon = s.data.icons.find((i) => i.id === id)
            if (icon) icon.name = name
          }),
        deleteIcon: (id) =>
          set((s) => {
            s.data.icons = s.data.icons.filter((i) => i.id !== id)
            // Les catégories qui l'utilisaient repassent sans icône.
            for (const c of [...s.data.categories, ...s.data.subcategories]) {
              if (c.icon?.type === 'image' && c.icon.iconId === id) c.icon = undefined
            }
          }),

        // ── Notion ────────────────────────────────────────────────
        integrateNotion: (catalogId) =>
          set((s) => {
            const db = NOTION_CATALOG.find((d) => d.id === catalogId)
            if (!db || s.data.notionSources.some((src) => src.id === db.id)) return
            s.data.notionSources.push({ id: db.id, name: db.name, icon: db.icon, showInCalendar: true })
            s.data.tasks.push(...notionTasks(db))
          }),
        setNotionVisible: (id, visible) =>
          set((s) => {
            const src = s.data.notionSources.find((x) => x.id === id)
            if (src) src.showInCalendar = visible
          }),
        removeNotionSource: (id) =>
          set((s) => {
            s.data.notionSources = s.data.notionSources.filter((x) => x.id !== id)
            s.data.tasks = s.data.tasks.filter((t) => t.source?.sourceId !== id)
          }),

        // ── Vues ──────────────────────────────────────────────────
        createView: (mode, from) => {
          const id = newId()
          set((s) => {
            s.data.views.push({
              id,
              mode,
              name: from ? `${from.name} (copie)` : 'Nouvelle vue',
              filters: structuredClone(from?.filters ?? EMPTY_FILTERS),
              unscheduledOpen: from?.unscheduledOpen ?? true,
              position: nextPosition(s.data.views.filter((v) => v.mode === mode)),
            })
            s.prefs.activeViewByMode[mode] = id
          })
          return id
        },
        updateView: (id, patch) =>
          set((s) => {
            const v = s.data.views.find((v) => v.id === id)
            if (v) Object.assign(v, patch)
          }),
        deleteView: (id) =>
          set((s) => {
            const view = s.data.views.find((v) => v.id === id)
            if (!view || s.data.views.filter((v) => v.mode === view.mode).length <= 1) return
            s.data.views = s.data.views.filter((v) => v.id !== id)
            if (s.prefs.activeViewByMode[view.mode] === id) delete s.prefs.activeViewByMode[view.mode]
          }),
        moveView: (id, direction) =>
          set((s) => {
            const view = s.data.views.find((v) => v.id === id)
            if (!view) return
            const siblings = s.data.views.filter((v) => v.mode === view.mode).sort((a, b) => a.position - b.position)
            const index = siblings.indexOf(view)
            const other = siblings[index + direction]
            if (!other) return
            ;[view.position, other.position] = [other.position, view.position]
          }),
        setActiveView: (mode, id) =>
          set((s) => {
            s.prefs.activeViewByMode[mode] = id
          }),

        updateSettings: (patch) => set((s) => void Object.assign(s.data.settings, patch)),
      }
    }),
    {
      name: 'mon-calendrier-demo',
      version: 6,
      // v2 : style des barres de progression. v3 : thème. v4 : un créneau de tâche tient sur un seul jour.
      // v5 : poubelle, pomodoro, mascotte, couleurs d'Eisenhower, créneaux cochés.
      // v6 : l'importance n'est plus un champ, elle vient de la priorité.
      migrate: (persisted, version) => {
        const state = persisted as { data?: Partial<DataState> & { settings?: Partial<Settings>; tasks?: Task[] } }
        if (version < 6) {
          for (const task of (state?.data?.tasks ?? []) as (Task & { important?: boolean })[]) {
            if (task.important !== undefined && task.priority === undefined) task.priority = task.important ? 'high' : 'low'
            delete task.important
          }
        }
        if (version < 5 && state?.data) {
          state.data.trash ??= []
          state.data.pomodoroSessions ??= []
          if (state.data.settings) Object.assign(state.data.settings, { ...SETTINGS_DEFAULTS, ...state.data.settings })
          for (const task of state.data.tasks ?? []) if (task.kind === 'spread') for (const slot of task.slots) slot.done ??= task.done
        }
        if (version < 2 && state?.data?.settings) state.data.settings.progressStyle ??= 'pills'
        if (version < 3 && state?.data?.settings) state.data.settings.theme ??= 'journal'
        if (version < 4 && state?.data?.tasks) {
          for (const task of state.data.tasks) {
            if (task.kind === 'habit') continue
            task.slots = task.slots.flatMap((slot) => splitByDay(slot, newId))
            // Une tâche simple qui couvrait plusieurs jours devient étalée (un créneau par jour).
            if (task.kind === 'simple' && task.slots.length > 1) task.kind = 'spread'
          }
        }
        return state as never
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ data: s.data, session: s.session, prefs: s.prefs }),
      // Premier lancement : accordéons ouverts sur des exemples parlants.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (Object.keys(state.prefs.expanded).length === 0) state.setPrefs(initialPrefs(state.data))
        // Ce qui est dans la poubelle depuis plus de 30 jours disparaît.
        if (state.data.trash.length > 0) useApp.setState((s) => void (s.data.trash = keepRecent(s.data.trash)))
      },
    },
  ),
)

/** Thème choisi dans les Paramètres. */
export const useTheme = () => useApp((s) => s.data.settings.theme ?? 'journal')

/** Vue active d'un mode de calendrier (la première si aucune n'est choisie). */
export function activeView(data: DataState, prefs: Prefs, mode: CalendarMode): CalendarView {
  const views = data.views.filter((v) => v.mode === mode).sort((a, b) => a.position - b.position)
  return views.find((v) => v.id === prefs.activeViewByMode[mode]) ?? views[0]
}

/** Exécute une suppression et propose « Annuler » pendant quelques secondes. */
export function withUndo(message: string, action: () => void) {
  const snapshot = useApp.getState().data
  action()
  toast(message, { action: { label: 'Annuler', onClick: () => useApp.getState().restore(snapshot) } })
}
