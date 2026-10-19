import { CalendarClock, ChevronRight, GripVertical, MoreHorizontal } from 'lucide-react'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { IconPicker } from '@/components/IconPicker'
import { IconView } from '@/components/IconView'
import { deadlineLabel } from '@/domain/display'
import type { CategoryGroup, SubcategoryGroup } from '@/domain/grouping'
import { OTHER, type Category } from '@/domain/types'
import { tint } from '@/domain/style'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { useUi } from '@/store/uiStore'
import { CategoryMasonry, MasonryItem, useMasonryCard } from './CategoryMasonry'
import { addSubcategory, DashedAdd, ItemName, NO_LINKS, otherSubLinks, subLinks, useItemActions } from './shared'
import { SortableList, useSortableItem } from './Sortable'
import { TaskList } from './TaskList'

/** Affichage d'origine : cartes sobres façon Notion, en grille « Pinterest ». */
export function NotionLayout({ real, other }: { real: CategoryGroup[]; other: CategoryGroup }) {
  const reorderCategories = useApp((s) => s.reorderCategories)
  return (
    <CategoryMasonry
      ids={real.map((g) => g.key)}
      onReorder={reorderCategories}
      renderOverlay={(id) => {
        const category = real.find((g) => g.key === id)?.category
        return category ? <CategoryCardPreview category={category} /> : null
      }}
    >
      {real.map((g) => (
        <MasonryItem key={g.key}>
          <CategoryBlock group={g} />
        </MasonryItem>
      ))}
      <MasonryItem>
        <OtherCategoryBlock group={other} />
      </MasonryItem>
    </CategoryMasonry>
  )
}

/** Carte d'une catégorie : blanche, l'accordéon dedans. Seule la ligne de la catégorie est colorée. */
function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('@container rounded-xl border border-line bg-white px-2 pt-1.5 pb-2 transition-shadow hover:shadow-[0_2px_10px_rgb(0_0_0/6%)]', className)}>
      {children}
    </div>
  )
}

/** Fond pastel de la ligne d'une catégorie (comme les fonds colorés de Notion). */
const headerTint = (color: string) => tint(color, 21)

/** Aperçu qui suit la souris pendant le déplacement d'une carte. */
function CategoryCardPreview({ category }: { category: Category }) {
  return (
    <Card className="w-[340px] rotate-[1.5deg] shadow-pop">
      <div className="flex h-9 items-center gap-2 rounded-md px-1" style={{ background: headerTint(category.color) }}>
        <GripVertical size={15} className="text-ink-3" />
        <IconView icon={category.icon} size={18} color={category.color} />
        <span className="truncate text-[15px] font-semibold">{category.name || 'Sans titre'}</span>
      </div>
    </Card>
  )
}

/** Ligne d'accordéon commune aux catégories et sous-catégories. */
function Row({
  expanded,
  onToggle,
  children,
  onContextMenu,
  highlighted,
  level,
  handle,
  background,
}: {
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  onContextMenu?: (e: MouseEvent) => void
  highlighted?: boolean
  level: 0 | 1
  /** Poignée de déplacement (cartes de catégorie). */
  handle?: ReactNode
  /** Fond coloré (ligne de la catégorie) ; le survol l'assombrit légèrement. */
  background?: string
}) {
  return (
    <div
      onContextMenu={onContextMenu}
      style={background ? { background } : undefined}
      className={cn(
        'flex items-center gap-1.5 rounded-md pr-1',
        level === 0 ? 'h-9' : 'h-8',
        background ? 'hover:brightness-[0.97]' : 'hover:bg-hover',
        highlighted && (background ? 'brightness-[0.97]' : 'bg-hover'),
      )}
    >
      {handle}
      <button type="button" onClick={onToggle} className="rounded p-0.5 text-ink-3 hover:bg-press" aria-label={expanded ? 'Replier' : 'Déplier'}>
        <ChevronRight size={15} className={cn('transition-transform duration-150', expanded && 'rotate-90')} />
      </button>
      {children}
    </div>
  )
}

function CategoryBlock({ group }: { group: CategoryGroup }) {
  const category = group.category!
  const expanded = useApp((s) => !!s.prefs.expanded[category.id])
  const editing = useUi((s) => s.editingKey === category.id)
  const app = useApp.getState()
  const card = useMasonryCard(category.id, !editing)
  const realSubs = group.subgroups.filter((g) => g.subcategory)
  const otherSub = group.subgroups.find((g) => !g.subcategory)!
  const { menu } = useItemActions('category', category, realSubs.length)

  return (
    <div ref={card.setNodeRef} className={cn('rounded-xl transition-[opacity,box-shadow]', card.isDragging && 'opacity-40', card.isOver && 'ring-2 ring-accent ring-offset-2')}>
      <Card>
        <div className="relative">
          <Row
            level={0}
            background={headerTint(category.color)}
            expanded={expanded}
            onToggle={() => app.toggleExpanded(category.id)}
            onContextMenu={menu.onContextMenu}
            highlighted={menu.isOpen}
            handle={
              <button
                type="button"
                {...card.handleProps}
                aria-label="Déplacer la catégorie"
                title="Glisser pour déplacer la carte"
                className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded text-ink-3 hover:bg-press hover:text-ink active:cursor-grabbing"
              >
                <GripVertical size={14} />
              </button>
            }
          >
            <IconPicker icon={category.icon} color={category.color} onChange={(icon) => app.updateCategory(category.id, { icon })} size={18} />
            <ItemName kind="category" item={category} className="text-[15px] font-semibold" />
            <span className="shrink-0 text-sm text-ink-3">({realSubs.length})</span>
            <span className="flex-1" />
            <button type="button" onClick={menu.openFromButton} className="rounded p-1 text-ink-3 hover:bg-press hover:text-ink" aria-label="Actions">
              <MoreHorizontal size={16} />
            </button>
          </Row>
          {menu.element}
        </div>

        {expanded && (
          <div className="mt-0.5 mb-1 ml-[31px] border-l border-line pl-4">
            <DashedAdd label="Nouvelle sous-catégorie" onClick={() => addSubcategory(category.id)} className="mb-1" />
            <SortableList ids={realSubs.map((g) => g.key)} onReorder={app.reorderSubcategories}>
              {realSubs.map((g) => (
                <SubcategoryBlock key={g.key} group={g} />
              ))}
            </SortableList>
            <OtherSubcategoryBlock group={otherSub} category={category} />
          </div>
        )}
      </Card>
    </div>
  )
}

function SubcategoryBlock({ group }: { group: SubcategoryGroup }) {
  const sub = group.subcategory!
  const expanded = useApp((s) => !!s.prefs.expanded[sub.id])
  const app = useApp.getState()
  const sortable = useSortableItem(sub.id)
  const { menu } = useItemActions('subcategory', sub)

  return (
    <div ref={sortable.setNodeRef} style={sortable.style}>
      <div className="group/row relative">
        {sortable.handle}
        <Row level={1} expanded={expanded} onToggle={() => app.toggleExpanded(sub.id)} onContextMenu={menu.onContextMenu} highlighted={menu.isOpen}>
          <span
            className={cn('flex rounded-md', sub.isProject && 'p-[2px] ring-2')}
            style={sub.isProject ? ({ '--tw-ring-color': sub.color } as CSSProperties) : undefined}
            title={sub.isProject ? 'Projet' : undefined}
          >
            <IconPicker icon={sub.icon} color={sub.color} onChange={(icon) => app.updateSubcategory(sub.id, { icon })} size={16} />
          </span>
          <span className="h-3.5 w-1 shrink-0 rounded-full" style={{ background: sub.color }} />
          <ItemName kind="subcategory" item={sub} className="text-sm font-medium" />
          <span className="shrink-0 text-xs text-ink-3">{group.tasks.length}</span>
          <span className="flex-1" />
          {sub.isProject && sub.deadline && <Deadline deadline={sub.deadline} hasTime={sub.deadlineHasTime} />}
          <button type="button" onClick={menu.openFromButton} className="rounded p-1 text-ink-3 hover:bg-press hover:text-ink" aria-label="Actions">
            <MoreHorizontal size={16} />
          </button>
        </Row>
        {menu.element}
      </div>
      {expanded && (
        <div className="mb-1.5 ml-[9px] border-l border-line pl-3">
          <TaskList tasks={group.tasks} links={subLinks(sub)} />
        </div>
      )}
    </div>
  )
}

function Deadline({ deadline, hasTime }: { deadline: string; hasTime: boolean }) {
  const { text, tone } = deadlineLabel(deadline, hasTime)
  return (
    <span
      className={cn('flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs', tone === 'late' ? 'bg-[#fdebec] text-danger' : tone === 'soon' ? 'bg-[#fbecdd] text-[#b0610b]' : 'text-ink-2')}
      title="Deadline du projet"
    >
      <CalendarClock size={12} /> {text}
    </span>
  )
}

/** Sous-catégorie « Autre » d'une catégorie : tâches de la catégorie sans sous-catégorie. Non modifiable. */
function OtherSubcategoryBlock({ group, category }: { group: SubcategoryGroup; category: Category }) {
  const key = group.key
  const expanded = useApp((s) => !!s.prefs.expanded[key])
  const toggleExpanded = useApp((s) => s.toggleExpanded)
  return (
    <div>
      <Row level={1} expanded={expanded} onToggle={() => toggleExpanded(key)}>
        <span className="w-[20px]" />
        <span className="h-3.5 w-1 shrink-0 rounded-full" style={{ background: category.color }} />
        <span className="text-sm text-ink-2 italic">Autre</span>
        <span className="shrink-0 text-xs text-ink-3">{group.tasks.length}</span>
      </Row>
      {expanded && (
        <div className="mb-1.5 ml-[9px] border-l border-line pl-3">
          <TaskList tasks={group.tasks} links={otherSubLinks(category.id)} />
        </div>
      )}
    </div>
  )
}

/** Catégorie « Autre » : tâches sans catégorie, listées directement, sans style. Non modifiable. */
function OtherCategoryBlock({ group }: { group: CategoryGroup }) {
  const expanded = useApp((s) => !!s.prefs.expanded[OTHER])
  const app = useApp.getState()
  return (
    // Toujours en dernier, et non déplaçable : ce n'est pas une vraie catégorie.
    <Card>
      <Row level={0} background={headerTint('#9B9A97')} expanded={expanded} onToggle={() => app.toggleExpanded(OTHER)} handle={<span className="w-4 shrink-0" />}>
        <span className="flex size-[22px] items-center justify-center text-base">📥</span>
        <span className="text-[15px] font-semibold">Autre</span>
        <span className="truncate text-sm text-ink-3">· {group.tasks.length} sans catégorie</span>
        <span className="flex-1" />
        <span className="w-[26px] shrink-0" />
      </Row>
      {expanded && (
        <div className="mt-0.5 mb-1 ml-[31px] border-l border-line pl-3">
          <TaskList tasks={group.tasks} links={NO_LINKS} />
        </div>
      )}
    </Card>
  )
}
