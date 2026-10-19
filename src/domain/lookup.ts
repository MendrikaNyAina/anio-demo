import type { Category, DataState, ID, NotionSource, Settings, Subcategory } from './types'

/** Index par id, construit une fois par calcul pour éviter les `find` en boucle. */
export interface Lookup {
  categories: Map<ID, Category>
  subcategories: Map<ID, Subcategory>
  sources: Map<ID, NotionSource>
  /** Réglages qui changent le style des tâches (couleurs Eisenhower). */
  colors?: Pick<Settings, 'colorMode' | 'eisenhowerColors'>
}

export function buildLookup(data: Pick<DataState, 'categories' | 'subcategories' | 'notionSources'> & { settings?: Settings }): Lookup {
  return {
    categories: new Map(data.categories.map((c) => [c.id, c])),
    subcategories: new Map(data.subcategories.map((s) => [s.id, s])),
    sources: new Map(data.notionSources.map((s) => [s.id, s])),
    colors: data.settings,
  }
}
