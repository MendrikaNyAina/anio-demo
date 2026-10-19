import { ChevronRight, GripVertical, MoreHorizontal, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IconPicker } from '@/components/IconPicker'
import { IconView } from '@/components/IconView'
import { ProgressBar } from '@/components/ProgressBar'
import { deadlineLabel } from '@/domain/display'
import type { CategoryGroup, SubcategoryGroup } from '@/domain/grouping'
import { singleColorProgress } from '@/domain/progress'
import { OTHER, type Category } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { ui, useUi } from '@/store/uiStore'
import { CategoryMasonry, MasonryItem, useMasonryCard } from './CategoryMasonry'
import { addSubcategory, groupTasks, ItemName, NO_LINKS, otherSubLinks, plural, progressOf, subLinks, useItemActions } from './shared'
import { SortableList, useSortableItem } from './Sortable'
import { TaskList } from './TaskList'

// Affichage « Cartes douces », inspiré de 2.jpg : grandes cartes pastel avec progression,
// la carte choisie s'incline, et ses sous-catégories s'ouvrent dans le panneau de droite.

const INK = '#1D1B22'
const fillOf = (color: string) => `color-mix(in srgb, ${color} 52%, white)`
const inkOf = (color: string) => `color-mix(in srgb, ${color} 42%, black)`

export function SoftLayout({ real, other, onAddCategory }: { real: CategoryGroup[]; other: CategoryGroup; onAddCategory: () => void }) {
  const reorderCategories = useApp((s) => s.reorderCategories)
  const subcategories = useApp((s) => s.data.subcategories)
  const editingKey = useUi((s) => s.editingKey)
  const [selectedId, setSelectedId] = useState<string>(real[0]?.key ?? OTHER)
  const selected = real.find((g) => g.key === selectedId) ?? (selectedId === OTHER ? other : (real[0] ?? other))

  // Une catégorie tout juste créée devient la carte choisie.
  useEffect(() => {
    if (editingKey && real.some((g) => g.key === editingKey)) setSelectedId(editingKey)
  }, [editingKey, real])

  return (
    <div className="font-soft text-[#1D1B22]">
      <section className="relative mb-5 flex min-h-[150px] flex-wrap items-center gap-6 overflow-hidden rounded-3xl border-[1.5px] border-[#1D1B22] bg-[#E5F3CB] px-8 py-7">
        <div className="relative z-[1] flex-[1_1_320px]">
          <div className="text-lg font-medium">Bon retour,</div>
          <h2 className="mt-0.5 mb-1.5 text-[34px] leading-tight font-bold tracking-tight">Tes catégories</h2>
          <p className="mb-4 max-w-[440px] text-[#3F4A2E]">Choisis une carte pour voir ses sous-catégories. Glisse une carte par sa poignée pour la déplacer, clic droit pour ses options.</p>
          {selected.category && (
            <button type="button" onClick={() => addSubcategory(selected.category!.id)} className="h-10 rounded-[10px] bg-[#1D1B22] px-4 text-[13px] font-semibold text-white hover:bg-[#3a3742]">
              Nouvelle sous-catégorie dans {selected.category.name}
            </button>
          )}
        </div>
        <svg width="420" height="170" viewBox="0 0 420 170" aria-hidden="true" className="pointer-events-none absolute -top-1 right-4 hidden md:block">
          <path d="M60 120c40-60 70 40 110-20s60 30 90-10" fill="none" stroke="#E25D9A" strokeWidth="9" strokeLinecap="round" />
          <path d="M250 20c50-10 110 10 130 50s-20 90-70 90-90-30-95-70 5-62 35-70z" fill="#FBC567" stroke="#1D1B22" strokeWidth="2" />
          <circle cx="320" cy="90" r="12" fill="#F28AB3" stroke="#1D1B22" strokeWidth="2" />
          <circle cx="352" cy="64" r="9" fill="#F28AB3" stroke="#1D1B22" strokeWidth="2" />
          <path d="M120 40l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#F28AB3" />
          <path d="M200 140l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#1D1B22" />
        </svg>
      </section>

      <div className="mb-6 flex flex-wrap border-b border-[#ECEBF0] pb-4">
        <Stat label="Catégories" value={real.length} first />
        <Stat label="Sous-catégories" value={subcategories.length} />
        <Stat label="Projets suivis" value={subcategories.filter((s) => s.isProject).length} />
        <Stat label="Tâches sans catégorie" value={other.tasks.length} />
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <section className="min-w-0 flex-[1_1_460px]">
          <div className="mb-3.5 flex items-baseline gap-2.5">
            <h3 className="text-lg font-bold">Catégories</h3>
            <span className="text-[13px] text-[#6E6B78]">Double-clic sur un nom pour le renommer</span>
          </div>
          <CategoryMasonry
            ids={real.map((g) => g.key)}
            onReorder={reorderCategories}
            minCardWidth={220}
            gap={18}
            renderOverlay={(id) => {
              const c = real.find((g) => g.key === id)?.category
              return c ? <CardPreview category={c} /> : null
            }}
          >
            {real.map((g, i) => (
              <MasonryItem key={g.key}>
                <SoftCategoryCard group={g} selected={g.key === selected.key} tilt={i % 2 ? 2.5 : -2.5} onSelect={() => setSelectedId(g.key)} />
              </MasonryItem>
            ))}
            <MasonryItem>
              <SoftOtherCard group={other} selected={selected.key === OTHER} onSelect={() => setSelectedId(OTHER)} />
            </MasonryItem>
            <MasonryItem>
              <button
                type="button"
                onClick={onAddCategory}
                className="flex min-h-[236px] w-full flex-col items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-[#C9C7D1] bg-white text-sm font-semibold text-[#6E6B78] hover:bg-[#F7F7F9]"
              >
                <Plus size={22} /> Nouvelle catégorie
              </button>
            </MasonryItem>
          </CategoryMasonry>
        </section>

        <section className="min-w-0 flex-[1_1_440px]">
          <SoftPanel group={selected} />
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, first }: { label: string; value: number; first?: boolean }) {
  return (
    <div className={cn('pr-7', !first && 'border-l border-[#ECEBF0] pl-7')}>
      <div className="text-[13px] text-[#6E6B78]">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}

function CardPreview({ category }: { category: Category }) {
  return (
    <div className="flex h-[120px] w-[230px] rotate-3 flex-col justify-between rounded-[22px] p-4 shadow-pop font-soft" style={{ background: fillOf(category.color), color: inkOf(category.color) }}>
      <IconView icon={category.icon} size={22} color={category.color} />
      <span className="text-2xl font-bold">{category.name || 'Sans titre'}</span>
    </div>
  )
}

function ProgressBlock({ progress, color }: { progress: { done: number; total: number; pct: number }; color: string }) {
  return (
    <div className="mt-auto">
      <div className="mb-1.5 flex justify-between text-xs font-semibold">
        <span>{progress.pct} %</span>
        <span className="opacity-80">
          {progress.done} / {plural(progress.total, 'tâche')}
        </span>
      </div>
      <ProgressBar progress={singleColorProgress(progress.done, progress.total, color)} />
    </div>
  )
}

function SoftCategoryCard({ group, selected, tilt, onSelect }: { group: CategoryGroup; selected: boolean; tilt: number; onSelect: () => void }) {
  const category = group.category!
  const editing = useUi((s) => s.editingKey === category.id)
  const app = useApp.getState()
  const card = useMasonryCard(category.id, !editing)
  const realSubs = group.subgroups.filter((g) => g.subcategory)
  const { menu } = useItemActions('category', category, realSubs.length)
  const progress = progressOf(groupTasks(group))
  const ink = inkOf(category.color)

  return (
    <div ref={card.setNodeRef} className={cn('rounded-[22px] transition-opacity', card.isDragging && 'opacity-40', card.isOver && 'ring-2 ring-[#1D1B22] ring-offset-4')}>
      <div
        onClick={onSelect}
        onContextMenu={menu.onContextMenu}
        className="flex min-h-[236px] cursor-pointer flex-col gap-3 rounded-[22px] border-[1.5px] p-3.5 pb-4 transition-[transform,box-shadow] duration-200"
        style={{
          background: fillOf(category.color),
          color: ink,
          borderColor: selected ? INK : 'transparent',
          transform: selected ? `rotate(${tilt}deg)` : undefined,
          boxShadow: selected ? '0 14px 28px rgb(29 27 34 / 18%)' : undefined,
        }}
      >
        <div className="flex items-center gap-2">
          <button type="button" {...card.handleProps} onClick={(e) => e.stopPropagation()} aria-label="Déplacer la catégorie" className="flex h-8 w-5 cursor-grab items-center justify-center opacity-60 hover:opacity-100 active:cursor-grabbing">
            <GripVertical size={16} />
          </button>
          <span className="flex size-[38px] items-center justify-center rounded-xl bg-white">
            <IconPicker icon={category.icon} color={category.color} onChange={(icon) => app.updateCategory(category.id, { icon })} size={20} />
          </span>
          <span className="flex-1" />
          <button type="button" onClick={menu.openFromButton} aria-label="Options de la catégorie" className="flex size-8 items-center justify-center rounded-[10px] hover:bg-white/50">
            <MoreHorizontal size={18} className="rotate-90" />
          </button>
        </div>
        {editing ? (
          <ItemName kind="category" item={category} className="text-[26px] leading-tight font-bold" />
        ) : (
          <button type="button" onClick={onSelect} onDoubleClick={() => ui.set({ editingKey: category.id })} className="text-left" title="Double-clic pour renommer">
            <span className="block text-[26px] leading-tight font-bold tracking-tight">{category.name || 'Sans titre'}</span>
            <span className="mt-1 block text-[13px] opacity-80">{plural(realSubs.length, 'sous-catégorie')}</span>
          </button>
        )}
        <ProgressBlock progress={progress} color={category.color} />
      </div>
      {menu.element}
    </div>
  )
}

function SoftOtherCard({ group, selected, onSelect }: { group: CategoryGroup; selected: boolean; onSelect: () => void }) {
  const progress = progressOf(group.tasks)
  return (
    <div
      onClick={onSelect}
      className="flex min-h-[236px] cursor-pointer flex-col gap-3 rounded-[22px] border-[1.5px] bg-[#ECEBF0] p-3.5 pb-4 text-[#3E3B48] transition-[transform,box-shadow] duration-200"
      style={{ borderColor: selected ? INK : 'transparent', transform: selected ? 'rotate(-2deg)' : undefined, boxShadow: selected ? '0 14px 28px rgb(29 27 34 / 18%)' : undefined }}
    >
      <div className="flex items-center gap-2">
        <span className="w-5" />
        <span className="flex size-[38px] items-center justify-center rounded-xl bg-white text-lg">📥</span>
        <span className="flex-1" />
        <span className="w-8" />
      </div>
      <button type="button" onClick={onSelect} className="text-left">
        <span className="block text-[26px] leading-tight font-bold">Autre</span>
        <span className="mt-1 block text-[13px] opacity-80">Tâches sans catégorie</span>
      </button>
      <ProgressBlock progress={progress} color="#9B9A97" />
    </div>
  )
}

/** Panneau de droite : sous-catégories de la carte choisie, et leurs tâches. */
function SoftPanel({ group }: { group: CategoryGroup }) {
  const category = group.category
  const app = useApp.getState()

  if (!category) {
    return (
      <>
        <PanelTitle title="Autre" hint="· tâches sans catégorie, sans sous-catégorie" />
        <TaskList tasks={group.tasks} links={NO_LINKS} variant="soft" />
      </>
    )
  }

  const realSubs = group.subgroups.filter((g) => g.subcategory)
  const otherSub = group.subgroups.find((g) => !g.subcategory)!
  return (
    <>
      <PanelTitle title={category.name || 'Sans titre'} hint={`· sous-catégories (${realSubs.length})`} />
      <div className="flex flex-col gap-2.5 pl-6">
        <button
          type="button"
          onClick={() => addSubcategory(category.id)}
          className="flex h-11 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#C9C7D1] bg-white text-[13px] font-semibold text-[#55525F] hover:bg-[#F7F7F9]"
        >
          <Plus size={15} /> Nouvelle sous-catégorie
        </button>
        <SortableList ids={realSubs.map((g) => g.key)} onReorder={app.reorderSubcategories}>
          <div className="flex flex-col gap-2.5">
            {realSubs.map((g) => (
              <SoftSubRow key={g.key} group={g} />
            ))}
          </div>
        </SortableList>
        <SoftOtherSubRow group={otherSub} category={category} />
      </div>
    </>
  )
}

function PanelTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-3.5 flex items-baseline gap-2.5">
      <h3 className="text-lg font-bold">{title}</h3>
      <span className="text-[13px] text-[#6E6B78]">{hint}</span>
    </div>
  )
}

function SoftSubRow({ group }: { group: SubcategoryGroup }) {
  const sub = group.subcategory!
  const expanded = useApp((s) => !!s.prefs.expanded[sub.id])
  const app = useApp.getState()
  const sortable = useSortableItem(sub.id)
  const { menu } = useItemActions('subcategory', sub)
  const deadline = sub.isProject && sub.deadline ? deadlineLabel(sub.deadline, sub.deadlineHasTime) : null

  return (
    <div ref={sortable.setNodeRef} style={sortable.style} className="group/row relative">
      {sortable.handle}
      <div onContextMenu={menu.onContextMenu} className={cn('rounded-[18px] border border-[#E7E6EC] bg-white px-3 py-2.5', menu.isOpen && 'border-[#C9C7D1]')}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => app.toggleExpanded(sub.id)} aria-label={expanded ? `Replier ${sub.name}` : `Déplier ${sub.name}`} className="flex size-[30px] items-center justify-center rounded-lg text-[#55525F] hover:bg-[#F4F4F7]">
            <ChevronRight size={16} className={cn('transition-transform', expanded && 'rotate-90')} />
          </button>
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: `color-mix(in srgb, ${sub.color} 18%, white)`, boxShadow: sub.isProject ? `0 0 0 2px ${sub.color}` : undefined }}
            title={sub.isProject ? 'Projet' : undefined}
          >
            <IconPicker icon={sub.icon} color={sub.color} onChange={(icon) => app.updateSubcategory(sub.id, { icon })} size={17} />
          </span>
          <span className="flex min-w-0 flex-col">
            <ItemName kind="subcategory" item={sub} className="text-[15px] font-bold" />
            <span className="text-xs text-[#6E6B78]">
              {plural(group.tasks.length, 'tâche')}
              {sub.isProject && ' · projet'}
            </span>
          </span>
          <span className="flex-1" />
          {deadline && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F4F4F7] px-2.5 py-1 text-xs font-semibold text-[#3E3B48]" title="Deadline du projet">
              <span className="size-[7px] rounded-full" style={{ background: deadline.tone === 'late' ? '#D44C47' : deadline.tone === 'soon' ? '#E8862E' : '#4C9A6A' }} />
              {deadline.text}
            </span>
          )}
          <button type="button" onClick={menu.openFromButton} aria-label="Options de la sous-catégorie" className="flex size-[30px] items-center justify-center rounded-lg text-[#55525F] hover:bg-[#F4F4F7]">
            <MoreHorizontal size={16} />
          </button>
        </div>
        {expanded && (
          <div className="mt-2.5 pb-1 pl-[38px]">
            <TaskList tasks={group.tasks} links={subLinks(sub)} variant="soft" />
          </div>
        )}
      </div>
      {menu.element}
    </div>
  )
}

function SoftOtherSubRow({ group, category }: { group: SubcategoryGroup; category: Category }) {
  const expanded = useApp((s) => !!s.prefs.expanded[group.key])
  const toggleExpanded = useApp((s) => s.toggleExpanded)
  return (
    <div className="rounded-[18px] border border-dashed border-[#D7D5DE] bg-white px-3 py-2.5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => toggleExpanded(group.key)} aria-label={expanded ? 'Replier Autre' : 'Déplier Autre'} className="flex size-[30px] items-center justify-center rounded-lg text-[#55525F] hover:bg-[#F4F4F7]">
          <ChevronRight size={16} className={cn('transition-transform', expanded && 'rotate-90')} />
        </button>
        <span className="text-[15px] font-bold italic text-[#55525F]">Autre</span>
        <span className="text-xs text-[#6E6B78]">· {plural(group.tasks.length, 'tâche')} sans sous-catégorie</span>
      </div>
      {expanded && (
        <div className="mt-2.5 pb-1 pl-[38px]">
          <TaskList tasks={group.tasks} links={otherSubLinks(category.id)} variant="soft" />
        </div>
      )}
    </div>
  )
}
