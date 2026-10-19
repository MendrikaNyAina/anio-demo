import { differenceInCalendarDays } from 'date-fns'
import type { TrashItem } from './types'

/** Durée de conservation dans la poubelle. */
export const TRASH_DAYS = 30

/** Jours avant suppression définitive (0 = disparaît aujourd'hui). */
export const trashDaysLeft = (item: Pick<TrashItem, 'deletedAt'>, now = new Date()) =>
  Math.max(0, TRASH_DAYS - differenceInCalendarDays(now, new Date(item.deletedAt)))

/** Éléments encore conservés (plus récents que 30 jours). */
export const keepRecent = (trash: TrashItem[], now = new Date()) => trash.filter((item) => differenceInCalendarDays(now, new Date(item.deletedAt)) < TRASH_DAYS)

export function trashLabel(item: TrashItem): string {
  if (item.kind === 'task') return item.task?.title || 'Sans titre'
  return item.category?.name || item.subcategories?.[0]?.name || 'Sans titre'
}
