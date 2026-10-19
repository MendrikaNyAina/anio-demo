import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { overlaps, slotBounds, type Range } from './dates'
import type { CalendarMode, DataState, Priority, Quadrant, Task } from './types'

/** Période affichée par la matrice : le jour, la semaine (lundi → dimanche) ou le mois qui contient `anchor`. */
export function periodRange(mode: CalendarMode, anchor: Date): Range {
  if (mode === 'day') {
    const start = startOfDay(anchor)
    return { start, end: addDays(start, 1) }
  }
  if (mode === 'week') {
    const start = startOfWeek(anchor, { weekStartsOn: 1 })
    return { start, end: addDays(start, 7) }
  }
  const start = startOfMonth(anchor)
  return { start, end: addMonths(start, 1) }
}

/** Période précédente (-1) ou suivante (+1). */
export const shiftPeriod = (mode: CalendarMode, anchor: Date, step: -1 | 1) =>
  mode === 'day' ? addDays(anchor, step) : mode === 'week' ? addDays(anchor, 7 * step) : addMonths(anchor, step)

// Matrice d'Eisenhower (vue du calendrier et couleurs des tâches) : urgence × importance.

export const QUADRANTS: { id: Quadrant; title: string; hint: string; urgent: boolean; important: boolean }[] = [
  { id: 'q1', title: 'Urgent et important', hint: 'À faire tout de suite', urgent: true, important: true },
  { id: 'q2', title: 'Important, pas urgent', hint: 'À planifier', urgent: false, important: true },
  { id: 'q3', title: 'Urgent, pas important', hint: 'À déléguer ou expédier', urgent: true, important: false },
  { id: 'q4', title: 'Ni urgent ni important', hint: 'À abandonner ?', urgent: false, important: false },
]

/** Importance déduite de la priorité : haute ou moyenne = importante, basse = pas importante, aucune = inconnue. */
export const isImportant = (priority: Priority | undefined): boolean | undefined => (priority === undefined ? undefined : priority !== 'low')

/** Quadrant d'une tâche, `null` tant que l'urgence ou la priorité n'est pas renseignée. */
export function quadrantOf(task: Partial<Pick<Task, 'urgent' | 'priority'>>): Quadrant | null {
  const important = isImportant(task.priority)
  if (task.urgent === undefined || important === undefined) return null
  return QUADRANTS.find((q) => q.urgent === task.urgent && q.important === important)!.id
}

/**
 * Ce qui change quand on dépose une tâche dans un quadrant : l'urgence, et la priorité seulement
 * si elle ne correspond pas déjà (une tâche « moyenne » déposée dans un quadrant important le reste).
 */
export function quadrantPatch(q: Quadrant, current: Priority | undefined): Pick<Task, 'urgent' | 'priority'> {
  const { urgent, important } = QUADRANTS.find((x) => x.id === q)!
  const priority = isImportant(current) === important ? current : important ? 'high' : 'low'
  return { urgent, priority }
}

export interface Matrix {
  quadrants: Record<Quadrant, Task[]>
  /** Tâches de la période sans urgence ou sans priorité (panneau « À classer »). */
  unclassified: Task[]
}

/**
 * Tâches simples et étalées qui ont au moins un créneau dans la période (une seule fois chacune).
 * Les habitudes et les tâches Notion n'ont pas d'urgence : elles n'y figurent pas.
 */
export function buildMatrix(data: Pick<DataState, 'tasks'>, range: Range): Matrix {
  const out: Matrix = { quadrants: { q1: [], q2: [], q3: [], q4: [] }, unclassified: [] }
  for (const task of data.tasks) {
    if (task.kind === 'habit' || task.source) continue
    if (!task.slots.some((s) => overlaps(slotBounds(s), range))) continue
    const q = quadrantOf(task)
    if (q) out.quadrants[q].push(task)
    else out.unclassified.push(task)
  }
  // À faire d'abord, puis par date du premier créneau.
  const first = (t: Task) => Math.min(...t.slots.map((s) => +slotBounds(s).start))
  const sort = (list: Task[]) => list.sort((a, b) => Number(a.done) - Number(b.done) || first(a) - first(b))
  for (const q of Object.values(out.quadrants)) sort(q)
  sort(out.unclassified)
  return out
}
