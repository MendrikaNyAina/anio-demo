import { Palette, Pencil, Plus, Trash2, Type } from 'lucide-react'
import { InlineEditableText } from '@/components/InlineEditableText'
import { useActionMenu, type Point } from '@/components/ui/menu'
import type { CategoryGroup, TaskLinks } from '@/domain/grouping'
import type { Category, Subcategory, Task } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { ui, useUi } from '@/store/uiStore'

// Ce que les trois affichages de la page Catégories partagent : les actions, le renommage,
// les liens par défaut d'une nouvelle tâche et la progression. Seul le rendu change d'un affichage à l'autre.

export type CategoriesLayout = 'notion' | 'soft' | 'pixel'

export const LAYOUTS: { value: CategoriesLayout; label: string }[] = [
  { value: 'notion', label: 'Notion' },
  { value: 'soft', label: 'Cartes douces' },
  { value: 'pixel', label: 'Pixel kawaii' },
]

/** Demande de suppression (avec confirmation). */
export function confirmDelete(kind: 'category' | 'subcategory', item: Category | Subcategory, subCount = 0, after?: () => void) {
  const app = useApp.getState()
  ui.confirm(
    kind === 'category'
      ? {
          title: `Supprimer « ${item.name} » ?`,
          message: `Ses ${subCount} sous-catégories seront supprimées. Les tâches restent : sans autre catégorie, elles passeront dans « Autre ».`,
          confirmLabel: 'Supprimer',
          onConfirm: () => {
            after?.()
            app.deleteCategory(item.id)
          },
        }
      : {
          title: `Supprimer « ${item.name} » ?`,
          message: 'Les tâches restent dans la catégorie, dans la sous-catégorie « Autre ».',
          confirmLabel: 'Supprimer',
          onConfirm: () => {
            after?.()
            app.deleteSubcategory(item.id)
          },
        },
  )
}

/** Menu (clic droit et « 3 points ») d'une catégorie ou sous-catégorie ; « Modifier… » ouvre sa fiche. */
export function useItemActions(kind: 'category' | 'subcategory', item: Category | Subcategory, subCount = 0) {
  const menu = useActionMenu([
    { label: 'Couleur et style…', icon: <Palette />, onSelect: (at: Point) => ui.set({ styleEditor: { kind, id: item.id, ...at } }) },
    { label: 'Renommer', icon: <Type />, onSelect: () => ui.set({ editingKey: item.id }) },
    { label: 'Modifier…', icon: <Pencil />, onSelect: () => ui.set({ categorySheet: { kind, id: item.id } }) },
    'separator',
    { label: 'Supprimer', icon: <Trash2 />, danger: true, onSelect: () => confirmDelete(kind, item, subCount) },
  ])
  return { menu }
}

/**
 * Nom modifiable sur place. Un élément tout juste créé démarre en saisie ;
 * le valider vide (ou Échap) l'annule, comme dans Notion.
 */
export function ItemName({
  kind,
  item,
  className,
  inputClassName,
  editOnClick = true,
}: {
  kind: 'category' | 'subcategory'
  item: Category | Subcategory
  className?: string
  inputClassName?: string
  editOnClick?: boolean
}) {
  const editing = useUi((s) => s.editingKey === item.id)
  const app = useApp.getState()
  return (
    <InlineEditableText
      value={item.name}
      startEditing={editing}
      editOnClick={editOnClick}
      placeholder={kind === 'category' ? 'Nouvelle catégorie' : 'Nouvelle sous-catégorie'}
      onEnd={() => ui.set({ editingKey: null })}
      onSave={(name) => (kind === 'category' ? app.updateCategory(item.id, { name }) : app.updateSubcategory(item.id, { name }))}
      onCancel={() => (kind === 'category' ? app.deleteCategory(item.id) : app.deleteSubcategory(item.id))}
      className={className}
      inputClassName={inputClassName ?? className}
    />
  )
}

export function addSubcategory(categoryId: string) {
  const app = useApp.getState()
  const id = app.createSubcategory(categoryId)
  app.toggleExpanded(categoryId, true)
  ui.set({ editingKey: id })
}

/** Catégorie et sous-catégorie pré-remplies pour une tâche créée depuis ce groupe. */
export const subLinks = (sub: Subcategory): TaskLinks => ({
  categoryIds: [sub.categoryId],
  primaryCategoryId: sub.categoryId,
  subcategoryIds: [sub.id],
  primarySubcategoryId: sub.id,
})
export const otherSubLinks = (categoryId: string): TaskLinks => ({ categoryIds: [categoryId], primaryCategoryId: categoryId, subcategoryIds: [] })
export const NO_LINKS: TaskLinks = { categoryIds: [], subcategoryIds: [] }

/** Tâches d'une catégorie, sans doublon (une tâche peut être dans plusieurs sous-catégories). */
export function groupTasks(group: CategoryGroup): Task[] {
  const byId = new Map<string, Task>()
  for (const t of [...group.tasks, ...group.subgroups.flatMap((s) => s.tasks)]) byId.set(t.id, t)
  return [...byId.values()]
}

/** Avancement : tâches simples et étalées finies (les habitudes n'ont pas de fin). */
export function progressOf(tasks: Task[]) {
  const real = tasks.filter((t) => t.kind !== 'habit')
  const done = real.filter((t) => t.done).length
  return { done, total: real.length, pct: real.length ? Math.round((done / real.length) * 100) : 0 }
}

export const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** Bouton « + » en pointillés sur toute la largeur, pour l'affichage Notion (même principe que Cartes douces). */
export function DashedAdd({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[rgb(55_53_47/22%)] bg-white/55 text-[13px] font-medium text-ink-2 transition-colors hover:bg-white/90 hover:text-ink',
        className,
      )}
    >
      <Plus size={14} /> {label}
    </button>
  )
}
