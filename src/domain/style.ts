import type { CSSProperties } from 'react'
import type { Lookup } from './lookup'
import type { IconRef, StyleTarget, Task } from './types'

export interface ResolvedStyle {
  color: string
  target: StyleTarget
  /** Icône de la sous-catégorie (à défaut celle de sa catégorie), entourée selon le type de tâche. */
  icon?: IconRef
}

/**
 * Style d'une tâche (calendrier.md l. 29) :
 * sous-catégorie principale, à défaut catégorie principale, à défaut aucun style (« Autre »).
 */
export function resolveTaskStyle(
  task: Pick<Task, 'primaryCategoryId' | 'primarySubcategoryId'>,
  lookup: Lookup,
): ResolvedStyle | null {
  const sub = task.primarySubcategoryId ? lookup.subcategories.get(task.primarySubcategoryId) : undefined
  if (sub) return { color: sub.color, target: sub.styleTarget, icon: sub.icon ?? lookup.categories.get(sub.categoryId)?.icon }
  const cat = task.primaryCategoryId ? lookup.categories.get(task.primaryCategoryId) : undefined
  if (cat) return { color: cat.color, target: cat.styleTarget, icon: cat.icon }
  return null
}

export const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, white)`
export const shade = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, black)`

/** Traduit un style en CSS pour une pastille de tâche (liste, calendrier, panneaux). */
export function styleToCss(style: ResolvedStyle | null): CSSProperties {
  if (!style) return { background: '#F1F1EF', color: '#37352F', borderColor: 'transparent' }
  switch (style.target) {
    case 'background':
      return { background: tint(style.color, 20), color: '#37352F', borderColor: 'transparent' }
    case 'label':
      return { background: '#FFFFFF', color: shade(style.color, 82), borderColor: '#E9E9E7' }
    case 'border':
      return { background: '#FFFFFF', color: '#37352F', borderColor: style.color }
  }
}

export function eventCss(color: string): CSSProperties {
  return { background: tint(color, 8), color: '#37352F', borderColor: color, borderStyle: 'dotted' }
}
