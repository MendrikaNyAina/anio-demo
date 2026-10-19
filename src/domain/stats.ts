import { addDays, startOfDay } from 'date-fns'
import { toKey } from './dates'
import type { DataState, DateKey } from './types'

// Chiffres globaux du Bilan : compteurs et courbe de complétion (tâches cochées par jour, d'après `doneAt`).

export interface GlobalStats {
  completed: number
  /** Tâches cochées pendant les `days` derniers jours. */
  completedRecent: number
  categories: number
  subcategories: number
  projects: number
  /** Projets dont toutes les tâches (au moins une) sont faites. */
  projectsDone: number
  curve: { day: DateKey; count: number }[]
}

export function globalStats(data: Pick<DataState, 'tasks' | 'categories' | 'subcategories'>, now = new Date(), days = 30): GlobalStats {
  const real = data.tasks.filter((t) => t.kind !== 'habit')
  const first = startOfDay(addDays(now, -(days - 1)))
  const curve = Array.from({ length: days }, (_, i) => ({ day: toKey(addDays(first, i)), count: 0 }))
  const index = new Map(curve.map((c, i) => [c.day, i]))
  let completedRecent = 0
  for (const t of real) {
    if (!t.done || !t.doneAt) continue
    const i = index.get(toKey(new Date(t.doneAt)))
    if (i === undefined) continue
    curve[i].count++
    completedRecent++
  }

  const projects = data.subcategories.filter((s) => s.isProject)
  const projectsDone = projects.filter((p) => {
    const tasks = real.filter((t) => t.subcategoryIds.includes(p.id))
    return tasks.length > 0 && tasks.every((t) => t.done)
  }).length

  return {
    completed: real.filter((t) => t.done).length,
    completedRecent,
    categories: data.categories.length,
    subcategories: data.subcategories.length,
    projects: projects.length,
    projectsDone,
    curve,
  }
}
