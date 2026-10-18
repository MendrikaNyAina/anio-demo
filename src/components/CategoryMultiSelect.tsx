import { Check, Plus, Star, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { normalizeLinks, type TaskLinks } from '@/domain/grouping'
import { styleToCss } from '@/domain/style'
import type { Category, ID, Subcategory } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { IconView } from './IconView'
import { PropertyRow } from './ui/controls'
import { Popover } from './ui/popover'

/**
 * Sélection façon Notion des catégories et sous-catégories d'une tâche :
 * plusieurs possibles, une principale (★) qui donne le style,
 * et création à la volée si elle n'existe pas encore (calendrier.md l. 43).
 */
export function CategoryMultiSelect({ value, onChange }: { value: TaskLinks; onChange: (links: TaskLinks) => void }) {
  const categories = useApp((s) => s.data.categories)
  const subcategories = useApp((s) => s.data.subcategories)
  const createCategory = useApp((s) => s.createCategory)
  const createSubcategory = useApp((s) => s.createSubcategory)

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.position - b.position), [categories])

  const emit = (next: TaskLinks, subs = subcategories) => {
    const copy = structuredClone(next)
    normalizeLinks(copy, subs)
    onChange(copy)
  }

  const toggleCategory = (id: ID) =>
    emit({
      ...value,
      categoryIds: value.categoryIds.includes(id) ? value.categoryIds.filter((c) => c !== id) : [...value.categoryIds, id],
    })

  const toggleSubcategory = (sub: Pick<Subcategory, 'id' | 'categoryId'>, subs = subcategories) => {
    const selected = value.subcategoryIds.includes(sub.id)
    emit(
      {
        ...value,
        // Choisir une sous-catégorie ajoute sa catégorie : les deux restent cohérentes.
        categoryIds: selected || value.categoryIds.includes(sub.categoryId) ? value.categoryIds : [...value.categoryIds, sub.categoryId],
        subcategoryIds: selected ? value.subcategoryIds.filter((s) => s !== sub.id) : [...value.subcategoryIds, sub.id],
      },
      subs,
    )
  }

  const chosenCategories = value.categoryIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean) as Category[]
  const chosenSubs = value.subcategoryIds.map((id) => subcategories.find((s) => s.id === id)).filter(Boolean) as Subcategory[]
  const creationTargets = chosenCategories.length > 0 ? chosenCategories : sortedCategories

  return (
    <>
      <PropertyRow label="Catégories">
        <ChipList
          items={chosenCategories}
          primaryId={value.primaryCategoryId}
          onPrimary={(id) => emit({ ...value, primaryCategoryId: id })}
          onRemove={toggleCategory}
          picker={
            <Picker
              placeholder="Chercher ou créer une catégorie…"
              groups={[{ items: sortedCategories }]}
              isSelected={(c) => value.categoryIds.includes(c.id)}
              onToggle={(c) => toggleCategory(c.id)}
              createOptions={(text) => [{ label: `Créer la catégorie « ${text} »`, run: () => emit({ ...value, categoryIds: [...value.categoryIds, createCategory({ name: text })] }) }]}
            />
          }
        />
      </PropertyRow>
      <PropertyRow label="Sous-catégories">
        <ChipList
          items={chosenSubs}
          primaryId={value.primarySubcategoryId}
          onPrimary={(id) => emit({ ...value, primarySubcategoryId: id })}
          onRemove={(id) => toggleSubcategory(subcategories.find((s) => s.id === id)!)}
          picker={
            <Picker
              placeholder="Chercher ou créer une sous-catégorie…"
              groups={sortedCategories.map((c) => ({
                title: c.name,
                items: subcategories.filter((s) => s.categoryId === c.id).sort((a, b) => a.position - b.position),
              }))}
              isSelected={(s) => value.subcategoryIds.includes(s.id)}
              onToggle={(s) => toggleSubcategory(s as Subcategory)}
              createOptions={(text) =>
                creationTargets.map((c) => ({
                  label: `Créer « ${text} » dans ${c.name}`,
                  run: () => {
                    const id = createSubcategory(c.id, { name: text })
                    const subs = useApp.getState().data.subcategories
                    toggleSubcategory({ id, categoryId: c.id }, subs)
                  },
                }))
              }
            />
          }
        />
      </PropertyRow>
    </>
  )
}

function ChipList({
  items,
  primaryId,
  onPrimary,
  onRemove,
  picker,
}: {
  items: Category[]
  primaryId?: ID
  onPrimary: (id: ID) => void
  onRemove: (id: ID) => void
  picker: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((c) => (
        <span key={c.id} className="group inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[13px]" style={styleToCss({ color: c.color, target: c.styleTarget })}>
          <button
            type="button"
            onClick={() => onPrimary(c.id)}
            title={c.id === primaryId ? 'Principale : donne le style de la tâche' : 'Définir comme principale'}
            className={cn('-ml-0.5', c.id === primaryId ? 'text-[#CB912F]' : 'opacity-30 hover:opacity-80')}
          >
            <Star size={12} fill={c.id === primaryId ? 'currentColor' : 'none'} />
          </button>
          <IconView icon={c.icon} size={13} color={c.color} />
          {c.name}
          <button type="button" onClick={() => onRemove(c.id)} className="opacity-40 hover:opacity-100" aria-label={`Retirer ${c.name}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <Popover
        open={open}
        onOpenChange={setOpen}
        className="w-[280px] p-0"
        trigger={
          <button type="button" className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-[13px] text-ink-3 hover:bg-hover hover:text-ink">
            <Plus size={13} />
            {items.length === 0 && 'Ajouter'}
          </button>
        }
      >
        {picker}
      </Popover>
    </div>
  )
}

interface PickerItem {
  id: ID
  name: string
  icon?: Category['icon']
  color: string
}

function Picker<T extends PickerItem>({
  placeholder,
  groups,
  isSelected,
  onToggle,
  createOptions,
}: {
  placeholder: string
  groups: { title?: string; items: T[] }[]
  isSelected: (item: T) => boolean
  onToggle: (item: T) => void
  createOptions: (text: string) => { label: string; run: () => void }[]
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = groups.map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(q)) })).filter((g) => g.items.length > 0)
  const exact = groups.some((g) => g.items.some((i) => i.name.toLowerCase() === q))

  return (
    <div>
      <div className="border-b border-line p-1.5">
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="h-7 w-full rounded bg-sidebar px-2 text-sm outline-none placeholder:text-ink-3" />
      </div>
      <div className="max-h-[240px] overflow-y-auto p-1">
        {filtered.map((g, gi) => (
          <div key={g.title ?? gi}>
            {g.title && <div className="px-2 pt-1.5 pb-0.5 text-[11px] font-medium text-ink-3">{g.title}</div>}
            {g.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-hover"
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                <IconView icon={item.icon} size={14} color={item.color} />
                <span className="flex-1 truncate">{item.name}</span>
                {isSelected(item) && <Check size={14} className="text-accent" />}
              </button>
            ))}
          </div>
        ))}
        {q &&
          !exact &&
          createOptions(query.trim()).map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                o.run()
                setQuery('')
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-ink-2 hover:bg-hover"
            >
              <Plus size={14} />
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        {!q && filtered.length === 0 && <p className="px-2 py-2 text-[13px] text-ink-3">Rien pour l'instant : tape un nom pour créer.</p>}
      </div>
    </div>
  )
}
