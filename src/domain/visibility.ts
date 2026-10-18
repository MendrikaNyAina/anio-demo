import type { Lookup } from './lookup'
import { OTHER, type CalendarFilters, type DataState, type EntryType, type Priority, type Task } from './types'

/** Switchs « afficher dans le calendrier » du menu du calendrier : bases Notion et tâches de la plateforme. */
export function passesSwitches(task: Task, data: DataState, lookup: Lookup): boolean {
  if (task.source) return lookup.sources.get(task.source.sourceId)?.showInCalendar ?? false
  return data.settings.showPlatformTasks
}

/**
 * Filtre catégories d'une vue. Même règle « la sous-catégorie prime » : si des sous-catégories
 * d'une catégorie sont cochées, seules elles comptent pour cette catégorie.
 */
export function passesCategoryFilter(task: Task, filters: CalendarFilters, lookup: Lookup): boolean {
  if (filters.categoryIds.length === 0 && filters.subcategoryIds.length === 0) return true
  if (task.source) return true // les tâches Notion sont gérées par leurs propres switchs
  if (task.categoryIds.length === 0) return filters.categoryIds.includes(OTHER)

  return task.categoryIds.some((categoryId) => {
    const selectedSubsHere = filters.subcategoryIds.filter(
      (id) => lookup.subcategories.get(id)?.categoryId === categoryId,
    )
    if (selectedSubsHere.length > 0) return task.subcategoryIds.some((id) => selectedSubsHere.includes(id))
    return filters.categoryIds.includes(categoryId)
  })
}

/** Les filtres qui ne s'appliquent pas à un type d'entrée ne la masquent pas. */
export function passesPriority(priority: Priority | undefined, filters: CalendarFilters) {
  return filters.priorities.length === 0 || filters.priorities.includes(priority ?? 'none')
}

export function passesKind(type: EntryType, filters: CalendarFilters) {
  return filters.kinds.length === 0 || filters.kinds.includes(type)
}

export function passesStatus(done: boolean | undefined, filters: CalendarFilters) {
  if (done === undefined || filters.status === 'all') return true
  return filters.status === 'done' ? done : !done
}

/** Visibilité d'une tâche (hors statut, qui dépend de l'occurrence pour les habitudes). */
export function isTaskVisible(
  task: Task,
  data: DataState,
  lookup: Lookup,
  filters: CalendarFilters | undefined,
  respectSwitches: boolean,
): boolean {
  if (respectSwitches && !passesSwitches(task, data, lookup)) return false
  if (!filters) return true
  return passesCategoryFilter(task, filters, lookup) && passesPriority(task.priority, filters) && passesKind(task.kind, filters)
}

export function countActiveFilters(f: CalendarFilters) {
  return (
    (f.categoryIds.length + f.subcategoryIds.length > 0 ? 1 : 0) +
    (f.priorities.length > 0 ? 1 : 0) +
    (f.status !== 'all' ? 1 : 0) +
    (f.kinds.length > 0 ? 1 : 0)
  )
}
