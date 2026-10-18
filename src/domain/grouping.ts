import { OTHER, type Category, type DataState, type ID, type Subcategory, type Task } from './types'

export interface SubcategoryGroup {
  /** Id réel, ou `other:<categoryId>` pour la sous-catégorie virtuelle « Autre ». */
  key: string
  subcategory?: Subcategory
  tasks: Task[]
}

export interface CategoryGroup {
  key: string
  category?: Category
  subgroups: SubcategoryGroup[]
  /** Uniquement pour la catégorie « Autre », qui liste ses tâches sans niveau intermédiaire. */
  tasks: Task[]
}

export const otherSubKey = (categoryId: ID) => `${OTHER}:${categoryId}`

/**
 * Regroupement de la page Catégories (calendrier.md l. 47) :
 * - sans catégorie → catégorie « Autre » (virtuelle, directement la liste des tâches) ;
 * - avec catégorie mais sans sous-catégorie de cette catégorie → sous-catégorie « Autre » ;
 * - une tâche multi-catégories apparaît dans chacun de ses groupes.
 * Les tâches Notion n'y figurent pas : elles appartiennent à leur base Notion.
 */
export function groupForCategoryPage(data: Pick<DataState, 'categories' | 'subcategories' | 'tasks'>): CategoryGroup[] {
  const tasks = data.tasks.filter((t) => !t.source)
  const categories = [...data.categories].sort((a, b) => a.position - b.position)

  const groups: CategoryGroup[] = categories.map((category) => {
    const subs = data.subcategories
      .filter((s) => s.categoryId === category.id)
      .sort((a, b) => a.position - b.position)
    const inCategory = tasks.filter((t) => t.categoryIds.includes(category.id))
    const subgroups: SubcategoryGroup[] = subs.map((sub) => ({
      key: sub.id,
      subcategory: sub,
      tasks: inCategory.filter((t) => t.subcategoryIds.includes(sub.id)),
    }))
    const subIds = new Set(subs.map((s) => s.id))
    subgroups.push({
      key: otherSubKey(category.id),
      tasks: inCategory.filter((t) => !t.subcategoryIds.some((id) => subIds.has(id))),
    })
    return { key: category.id, category, subgroups, tasks: [] }
  })

  groups.push({ key: OTHER, subgroups: [], tasks: tasks.filter((t) => t.categoryIds.length === 0) })
  return groups
}

export type TaskLinks = Pick<Task, 'categoryIds' | 'primaryCategoryId' | 'subcategoryIds' | 'primarySubcategoryId'>

/** Garantit la cohérence des liens d'une tâche après une modification (modifie l'objet). */
export function normalizeLinks(task: TaskLinks, subcategories: Pick<Subcategory, 'id' | 'categoryId'>[]): void {
  const subCategoryOf = new Map(subcategories.map((s) => [s.id, s.categoryId]))
  // Une sous-catégorie n'est liée que si sa catégorie l'est aussi (plan.md, migration 006).
  task.subcategoryIds = task.subcategoryIds.filter((id) => {
    const categoryId = subCategoryOf.get(id)
    return categoryId !== undefined && task.categoryIds.includes(categoryId)
  })
  if (!task.primaryCategoryId || !task.categoryIds.includes(task.primaryCategoryId)) {
    task.primaryCategoryId = task.categoryIds[0]
  }
  if (!task.primarySubcategoryId || !task.subcategoryIds.includes(task.primarySubcategoryId)) {
    task.primarySubcategoryId = task.subcategoryIds[0]
  }
}
