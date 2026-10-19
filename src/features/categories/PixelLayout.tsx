import { MoreHorizontal } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { IconPicker } from '@/components/IconPicker'
import { IconView } from '@/components/IconView'
import { deadlineLabel } from '@/domain/display'
import type { CategoryGroup, SubcategoryGroup } from '@/domain/grouping'
import { OTHER, type Category } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { useUi } from '@/store/uiStore'
import { CategoryMasonry, MasonryItem, useMasonryCard } from './CategoryMasonry'
import { addSubcategory, groupTasks, ItemName, NO_LINKS, otherSubLinks, plural, progressOf, subLinks, useItemActions } from './shared'
import { SortableList, useSortableItem } from './Sortable'
import { TaskList } from './TaskList'

// Affichage « Pixel kawaii », inspiré de 3.jpg : cartes autocollants à gros contour,
// marque-page de la couleur de la catégorie, pastilles roses / violettes, titres en police pixel.
// Une catégorie masquée du calendrier prend le style « offline » de l'inspiration.

const LINE = '#3D2B6B'
const card = 'rounded-[26px] border-[2.5px] border-[#3D2B6B] shadow-[0_6px_0_#3D2B6B]'

export function PixelLayout({ real, other, onAddCategory }: { real: CategoryGroup[]; other: CategoryGroup; onAddCategory: () => void }) {
  const reorderCategories = useApp((s) => s.reorderCategories)
  const subCount = useApp((s) => s.data.subcategories.length)

  return (
    <div className="font-round text-[#3D2B6B]">
      <div className="mb-4 flex flex-wrap justify-between gap-3 font-pixel text-[13px] tracking-wide">
        <span>{plural(real.length, 'catégorie')} · {subCount} sous-cat.</span>
        <span>clic droit : couleur, modifier, supprimer</span>
      </div>

      <div className="mb-7 flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-3.5 rounded-full border-[2.5px] border-[#3D2B6B] bg-white py-2 pr-6 pl-2.5 shadow-[0_5px_0_#3D2B6B]">
          <span className="flex h-[34px] w-11 items-center justify-center rounded-[9px] border-[2.5px] border-[#3D2B6B] bg-[#CBB8F7]">
            <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
              <path d="M2 3h7l2 2h9v11H2z" fill="#F7B5D6" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </span>
          <h2 className="font-pixel text-[22px] font-bold tracking-wide">Mes catégories!!</h2>
        </div>
        <button
          type="button"
          onClick={onAddCategory}
          className="h-[46px] rounded-full border-[2.5px] border-[#3D2B6B] bg-[#F7B5D6] px-5 font-pixel text-sm shadow-[0_4px_0_#3D2B6B] hover:bg-[#F49CCB] active:translate-y-0.5 active:shadow-[0_2px_0_#3D2B6B]"
        >
          + catégorie
        </button>
      </div>

      <CategoryMasonry
        ids={real.map((g) => g.key)}
        onReorder={reorderCategories}
        minCardWidth={520}
        gap={24}
        renderOverlay={(id) => {
          const c = real.find((g) => g.key === id)?.category
          return c ? <CardPreview category={c} /> : null
        }}
      >
        {real.map((g) => (
          <MasonryItem key={g.key}>
            <PixelCategoryCard group={g} />
          </MasonryItem>
        ))}
        <MasonryItem>
          <PixelOtherCard group={other} />
        </MasonryItem>
        <MasonryItem>
          <button type="button" onClick={onAddCategory} className="h-[72px] w-full rounded-[26px] border-[2.5px] border-dashed border-[#3D2B6B] bg-white/60 font-pixel text-[15px] hover:bg-white">
            + nouvelle catégorie
          </button>
        </MasonryItem>
      </CategoryMasonry>
    </div>
  )
}

function CardPreview({ category }: { category: Category }) {
  return (
    <div className={cn(card, 'flex w-[300px] rotate-2 items-center gap-3 bg-[#FFF8FD] px-4 py-3 font-pixel')}>
      <IconView icon={category.icon} size={20} color={category.color} />
      <span className="truncate text-base">{category.name || 'Sans titre'}</span>
    </div>
  )
}

function Pill({ children, tone = 'white', className }: { children: ReactNode; tone?: 'white' | 'purple' | 'pink' | 'lilac'; className?: string }) {
  const tones = { white: 'bg-white', purple: 'bg-[#7E5BD6] text-white', pink: 'bg-[#F7B5D6]', lilac: 'bg-[#E7DEFF]' }
  return <span className={cn('shrink-0 rounded-full border-2 border-[#3D2B6B] px-2.5 font-pixel text-xs leading-[20px]', tones[tone], className)}>{children}</span>
}

/** Petite flèche pixel du dépliage. */
function PixelChevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" className={cn('transition-transform', open && 'rotate-90')}>
      <rect x="4" y="1" width="3" height="3" />
      <rect x="7" y="4" width="3" height="3" />
      <rect x="7" y="7" width="3" height="3" />
      <rect x="4" y="10" width="3" height="3" />
    </svg>
  )
}

function Grip(props: ComponentProps<'button'>) {
  return (
    <button type="button" {...props} aria-label="Déplacer la catégorie" className="flex h-[34px] w-[22px] shrink-0 cursor-grab items-center justify-center text-[#7E5BD6] active:cursor-grabbing">
      <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true">
        <rect x="1" y="1" width="4" height="4" />
        <rect x="7" y="1" width="4" height="4" />
        <rect x="1" y="7" width="4" height="4" />
        <rect x="7" y="7" width="4" height="4" />
        <rect x="1" y="13" width="4" height="4" />
        <rect x="7" y="13" width="4" height="4" />
      </svg>
    </button>
  )
}

function PixelCategoryCard({ group }: { group: CategoryGroup }) {
  const category = group.category!
  const expanded = useApp((s) => !!s.prefs.expanded[category.id])
  const editing = useUi((s) => s.editingKey === category.id)
  const app = useApp.getState()
  const dnd = useMasonryCard(category.id, !editing)
  const realSubs = group.subgroups.filter((g) => g.subcategory)
  const otherSub = group.subgroups.find((g) => !g.subcategory)!
  const { menu } = useItemActions('category', category, realSubs.length)
  const progress = progressOf(groupTasks(group))

  return (
    <div ref={dnd.setNodeRef} className={cn('rounded-[26px] transition-opacity', dnd.isDragging && 'opacity-40', dnd.isOver && 'ring-4 ring-[#E86AAE] ring-offset-4 ring-offset-[#E7DEFF]')}>
      <section
        onContextMenu={menu.onContextMenu}
        className={cn(card, 'relative bg-[#FFF8FD] px-5 pt-4 pb-5')}
      >
        <span
          aria-hidden
          className="absolute -top-[3px] right-7 h-[38px] w-[26px] border-[2.5px] border-[#3D2B6B]"
          style={{ background: category.color, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 74%, 0 100%)' }}
        />
        <div className="flex items-center gap-2.5 pr-12">
          <Grip {...dnd.handleProps} />
          <button type="button" onClick={() => app.toggleExpanded(category.id)} aria-label={expanded ? 'Replier' : 'Déplier'} className="flex size-[30px] items-center justify-center rounded-lg hover:bg-white/60">
            <PixelChevron open={expanded} />
          </button>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-[#3D2B6B] bg-white">
            <IconPicker icon={category.icon} color={category.color} onChange={(icon) => app.updateCategory(category.id, { icon })} size={18} />
          </span>
          <span className="min-w-0 rounded-full border-[2.5px] border-[#3D2B6B] bg-white px-3.5 py-0.5 font-pixel text-[15px]">
            <ItemName kind="category" item={category} className="font-pixel text-[15px]" />
          </span>
          <span className="flex-1" />
          <button type="button" onClick={menu.openFromButton} aria-label="Options de la catégorie" className="flex size-[34px] items-center justify-center rounded-[10px] hover:bg-white/60">
            <MoreHorizontal size={18} />
          </button>
        </div>

        <p className={'mt-2 pl-[32px] font-bold text-[#7E5BD6]'}>
          {plural(realSubs.length, 'sous-catégorie')} · {progress.pct} % fini ({progress.done}/{progress.total})
        </p>


        {expanded ? (
          <div className="mt-4 flex flex-col gap-3 pl-6">
            <SortableList ids={realSubs.map((g) => g.key)} onReorder={app.reorderSubcategories}>
              <div className="flex flex-col gap-3">
                {realSubs.map((g) => (
                  <PixelSubRow key={g.key} group={g} />
                ))}
              </div>
            </SortableList>
            <div className="flex flex-wrap items-center gap-3">
              <PixelOtherSubRow group={otherSub} category={category} />
              <button
                type="button"
                onClick={() => addSubcategory(category.id)}
                className="h-11 rounded-full border-[2.5px] border-dashed border-[#7E5BD6] bg-[#FFF8FD] px-4 font-pixel text-xs hover:bg-white"
              >
                + sous-catégorie
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2 pl-[32px]">
            {realSubs.map((g) => (
              <Pill key={g.key}>
                {g.subcategory!.name || 'sans titre'} · {g.tasks.length}
              </Pill>
            ))}
            {otherSub.tasks.length > 0 && <Pill tone="lilac">autre · {otherSub.tasks.length}</Pill>}
          </div>
        )}
      </section>
      {menu.element}
    </div>
  )
}

function PixelSubRow({ group }: { group: SubcategoryGroup }) {
  const sub = group.subcategory!
  const expanded = useApp((s) => !!s.prefs.expanded[sub.id])
  const app = useApp.getState()
  const sortable = useSortableItem(sub.id)
  const { menu } = useItemActions('subcategory', sub)
  const deadline = sub.isProject && sub.deadline ? deadlineLabel(sub.deadline, sub.deadlineHasTime) : null
  const [deadlineDate, deadlineTag] = deadline ? deadline.text.split(' · ') : []

  return (
    <div ref={sortable.setNodeRef} style={sortable.style} className="group/row relative">
      {sortable.handle}
      <div onContextMenu={menu.onContextMenu} className={cn('@container rounded-[18px] border-[2.5px] border-[#3D2B6B] bg-white px-3.5 py-2.5', menu.isOpen && 'bg-[#FFF0F8]')}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => app.toggleExpanded(sub.id)} aria-label={expanded ? `Replier ${sub.name}` : `Déplier ${sub.name}`} className="flex size-[30px] shrink-0 items-center justify-center rounded-lg hover:bg-[#F6F1FF]">
            <PixelChevron open={expanded} />
          </button>
          <span
            className="flex size-[38px] shrink-0 items-center justify-center rounded-xl border-[2.5px] border-[#3D2B6B]"
            style={{ background: `color-mix(in srgb, ${sub.color} 23%, white)`, boxShadow: sub.isProject ? `0 0 0 3px ${sub.color}` : undefined }}
            title={sub.isProject ? 'Projet' : undefined}
          >
            <IconPicker icon={sub.icon} color={sub.color} onChange={(icon) => app.updateSubcategory(sub.id, { icon })} size={18} />
          </span>
          {/* Le nom se tronque ; les pastilles et contrôles restent groupés sur la même ligne. */}
          <span className="flex min-w-0 flex-1 flex-col">
            <ItemName kind="subcategory" item={sub} className="text-[17px] font-extrabold" />
            <span className="truncate font-bold text-[#7E5BD6]">
              {sub.isProject && sub.description ? `${sub.description.split(/[.:]/)[0]} · ` : ''}
              {plural(group.tasks.length, 'tâche')}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {deadline && (
              <span className="flex flex-col items-end gap-1 @[520px]:flex-row" title={`Deadline : ${deadline.text}`}>
                <Pill tone={deadline.tone === 'late' ? 'pink' : 'purple'}>{deadlineTag}</Pill>
                <Pill tone="pink">{deadlineDate}</Pill>
              </span>
            )}
            <button type="button" onClick={menu.openFromButton} aria-label="Options de la sous-catégorie" className="flex size-[30px] items-center justify-center rounded-lg hover:bg-[#F6F1FF]">
              <MoreHorizontal size={16} />
            </button>
          </span>
        </div>
        {expanded && (
          <div className="mt-3 ml-10 border-t-2 border-dashed border-[#CBB8F7] pt-2.5">
            <TaskList tasks={group.tasks} links={subLinks(sub)} variant="pixel" />
          </div>
        )}
      </div>
      {menu.element}
    </div>
  )
}

function PixelOtherSubRow({ group, category }: { group: SubcategoryGroup; category: Category }) {
  const expanded = useApp((s) => !!s.prefs.expanded[group.key])
  const toggleExpanded = useApp((s) => s.toggleExpanded)
  return (
    <div className="min-w-0 flex-[1_1_260px] rounded-[18px] border-[2.5px] border-dashed border-[#3D2B6B] bg-white px-3.5 py-2">
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={() => toggleExpanded(group.key)} aria-label={expanded ? 'Replier Autre' : 'Déplier Autre'} className="flex size-[30px] items-center justify-center rounded-lg hover:bg-[#F6F1FF]">
          <PixelChevron open={expanded} />
        </button>
        <span className="font-extrabold italic">Autre</span>
        <span className="font-bold text-[#7E5BD6]">sans sous-catégorie · {group.tasks.length}</span>
      </div>
      {expanded && (
        <div className="mt-2 border-t-2 border-dashed border-[#CBB8F7] pt-2">
          <TaskList tasks={group.tasks} links={otherSubLinks(category.id)} variant="pixel" />
        </div>
      )}
    </div>
  )
}

function PixelOtherCard({ group }: { group: CategoryGroup }) {
  const expanded = useApp((s) => !!s.prefs.expanded[OTHER])
  const app = useApp.getState()
  const progress = progressOf(group.tasks)
  return (
    <section className={cn(card, 'bg-[#FFF8FD] px-5 py-4')}>
      <div className="flex items-center gap-3">
        <span className="w-[22px] shrink-0" />
        <button type="button" onClick={() => app.toggleExpanded(OTHER)} aria-label={expanded ? 'Replier' : 'Déplier'} className="flex size-[30px] shrink-0 items-center justify-center rounded-lg hover:bg-white/60">
          <PixelChevron open={expanded} />
        </button>
        <span className="shrink-0 rounded-full border-[2.5px] border-[#3D2B6B] bg-white px-3.5 py-0.5 font-pixel text-[15px]">autre</span>
        <span className="min-w-0 flex-1 truncate font-extrabold">Tâches sans catégorie</span>
        <span className="flex shrink-0 items-center gap-2">
          <Pill tone="purple">{plural(progress.total, 'tâche')}</Pill>
          <Pill tone="pink">{plural(progress.done, 'faite')}</Pill>
        </span>
      </div>
      {expanded && (
        <div className="mt-3 ml-[62px] border-t-2 border-dashed border-[#CBB8F7] pt-2.5">
          <TaskList tasks={group.tasks} links={NO_LINKS} variant="pixel" />
        </div>
      )}
    </section>
  )
}
