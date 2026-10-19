import type { Entry } from './entries'
import type { DataState, ID, Subcategory, Task } from './types'

export interface ProgressSegment {
  color: string
  count: number
}

export interface Progress {
  done: number
  total: number
  /** Unités terminées regroupées par couleur, pour une barre segmentée. */
  segments: ProgressSegment[]
}

const NEUTRAL = '#9B9A97'

/** Progression d'une seule couleur (une catégorie, un projet). */
export const singleColorProgress = (done: number, total: number, color: string): Progress => ({
  done,
  total,
  segments: done > 0 ? [{ color, count: done }] : [],
})

/**
 * Progression de la semaine (calendrier.md l. 68) à partir des entrées visibles :
 * une tâche simple ou étalée compte une fois (même avec plusieurs créneaux),
 * chaque occurrence d'habitude compte, les événements ne comptent pas.
 */
export function weekProgress(entries: Entry[]): Progress {
  const units = new Map<string, { done: boolean; color: string }>()
  for (const e of entries) {
    if (e.type === 'event' || e.done === undefined) continue
    const key = e.type === 'habit' ? e.key : e.taskId!
    units.set(key, { done: e.done, color: e.style?.color ?? NEUTRAL })
  }
  return summarize([...units.values()])
}

/**
 * Progression affichée dans la page d'une tâche : ses sous-tâches s'il y en a,
 * sinon (tâche étalée) ses créneaux cochés. `null` s'il n'y a rien à mesurer.
 */
export function taskProgress(task: Pick<Task, 'kind' | 'subtasks' | 'slots'>, color: string): (Progress & { unit: 'subtasks' | 'slots' }) | null {
  if (task.subtasks.length > 0) return { ...singleColorProgress(task.subtasks.filter((s) => s.done).length, task.subtasks.length, color), unit: 'subtasks' }
  if (task.kind === 'spread' && task.slots.length > 0) return { ...singleColorProgress(task.slots.filter((s) => s.done).length, task.slots.length, color), unit: 'slots' }
  return null
}

export interface ProjectProgress extends Progress {
  subcategory: Subcategory
}

/** Bilan : tâches simples et étalées liées à la sous-catégorie (les habitudes n'ont pas de fin). */
export function projectProgress(data: DataState, subcategoryIds: ID[]): ProjectProgress[] {
  return subcategoryIds.flatMap((id) => {
    const subcategory = data.subcategories.find((s) => s.id === id)
    if (!subcategory) return []
    const tasks = data.tasks.filter((t) => t.kind !== 'habit' && t.subcategoryIds.includes(id))
    return [{ subcategory, ...summarize(tasks.map((t) => ({ done: t.done, color: subcategory.color }))) }]
  })
}

function summarize(units: { done: boolean; color: string }[]): Progress {
  const byColor = new Map<string, number>()
  let done = 0
  for (const u of units) {
    if (!u.done) continue
    done++
    byColor.set(u.color, (byColor.get(u.color) ?? 0) + 1)
  }
  return { done, total: units.length, segments: [...byColor].map(([color, count]) => ({ color, count })) }
}
