import { Paintbrush, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StyleTargetChoice } from '@/components/ColorPicker'
import { journalMenuClass, JournalTitle } from '@/components/JournalTitle'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/controls'
import { Popover } from '@/components/ui/popover'
import { groupForCategoryPage } from '@/domain/grouping'
import { OTHER, type StyleTarget } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, useTheme, withUndo } from '@/store/appStore'
import { ui } from '@/store/uiStore'
import { NotionLayout } from './NotionLayout'
import { PixelLayout } from './PixelLayout'
import { LAYOUTS, type CategoriesLayout } from './shared'
import { SoftLayout } from './SoftLayout'

/**
 * Page Catégories (calendrier.md l. 31-47). Trois affichages à comparer, avec les mêmes données
 * et les mêmes actions : Notion (d'origine), Cartes douces (2.jpg) et Pixel kawaii (3.jpg).
 */
export function CategoriesPage() {
  const data = useApp((s) => s.data)
  const journal = useTheme() === 'journal'
  const savedLayout: CategoriesLayout = useApp((s) => s.prefs.categoriesLayout) ?? 'notion'
  // Thème Notion : tout est sobre, donc l'affichage Notion d'origine (le choix reste mémorisé pour le thème journal).
  const layout: CategoriesLayout = journal ? savedLayout : 'notion'
  const setPrefs = useApp((s) => s.setPrefs)
  const createCategory = useApp((s) => s.createCategory)
  const toggleExpanded = useApp((s) => s.toggleExpanded)
  const groups = useMemo(() => groupForCategoryPage(data), [data])
  const real = groups.filter((g) => g.category)
  const other = groups.find((g) => g.key === OTHER)!

  const addCategory = () => {
    const id = createCategory({ icon: { type: 'emoji', value: '📁' } })
    ui.set({ editingKey: id })
    toggleExpanded(id, true)
  }

  const description = layout === 'notion' ? 'Organise tes tâches par catégorie et sous-catégorie. Glisse une carte par sa poignée pour la déplacer, clic droit pour les options.' : undefined
  const addButton = layout === 'notion' && (
    <Button variant="primary" onClick={addCategory}>
      <Plus size={15} /> Catégorie
    </Button>
  )
  const actions = (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-2">Affichage</span>
        <Segmented value={layout} onChange={(categoriesLayout) => setPrefs({ categoriesLayout })} options={LAYOUTS} />
      </div>
      <BulkStyleButton journal />
      {addButton}
    </>
  )

  return (
    // Pleine largeur, comme le calendrier. Le fond change avec l'affichage choisi.
    <div
      className={cn('h-full overflow-y-auto', layout === 'pixel' && 'bg-[#E7DEFF]')}
      style={layout === 'pixel' ? { backgroundImage: 'repeating-conic-gradient(#DDD0FF 0 25%, transparent 0 50%)', backgroundSize: '36px 36px' } : undefined}
    >
      <div className="px-4 pt-6 pb-24 sm:px-10 sm:pt-10">
        {journal ? (
          <JournalTitle icon="🗂️" tab="mon organisation" title="Catégories" description={description} actions={actions} />
        ) : (
          <PageHeader
            icon="🗂️"
            title="Catégories"
            description={description}
            actions={
              <div className="flex items-center gap-2">
                <BulkStyleButton />
                {addButton}
              </div>
            }
          />
        )}
        {layout === 'notion' && <NotionLayout real={real} other={other} />}
        {layout === 'soft' && <SoftLayout real={real} other={other} onAddCategory={addCategory} />}
        {layout === 'pixel' && <PixelLayout real={real} other={other} onAddCategory={addCategory} />}
      </div>
    </div>
  )
}

/**
 * Change d'un coup la présentation de la couleur (label / fond / bordure) de toutes les catégories
 * et sous-catégories, donc de toutes les tâches. Chaque élément garde sa couleur ; « Annuler » revient en arrière.
 */
function BulkStyleButton({ journal }: { journal?: boolean }) {
  const categories = useApp((s) => s.data.categories)
  const subcategories = useApp((s) => s.data.subcategories)
  const items = [...categories, ...subcategories]
  const [open, setOpen] = useState(false)
  // La présentation commune actuelle, s'il y en a une (sinon aucun bouton n'est actif).
  const shared = items.length > 0 && items.every((i) => i.styleTarget === items[0].styleTarget) ? items[0].styleTarget : undefined
  const apply = (target: StyleTarget) => {
    setOpen(false)
    withUndo(`Style « ${TARGET_LABEL[target]} » appliqué à toutes les catégories`, () => useApp.getState().setAllStyleTargets(target))
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className={journal ? cn(journalMenuClass, 'p-1') : undefined}
      trigger={
        journal ? (
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-full border-2 border-[#A3A8EE] bg-[#F4F3FF] px-3 font-plate text-[13px] font-semibold text-[#2F2B6E] shadow-[0_3px_0_#DCDDFF] transition-colors hover:bg-[#DCDDFF]"
          >
            <Paintbrush size={14} /> Style des tâches
          </button>
        ) : (
          <Button variant="outline">
            <Paintbrush size={14} /> Style des tâches
          </Button>
        )
      }
    >
      <div className="w-[260px] p-2">
        <p className={cn('mb-2.5 text-xs', journal ? 'text-[#5B57A6]' : 'text-ink-3')}>Toutes les catégories et sous-catégories gardent leur couleur, appliquée de la même façon à leurs tâches.</p>
        <StyleTargetChoice color={journal ? '#8C92E8' : '#337EA9'} target={shared} onChange={apply} title="Appliquer la couleur au…" />
      </div>
    </Popover>
  )
}

const TARGET_LABEL: Record<StyleTarget, string> = { label: 'Label', background: 'Fond', border: 'Bordure' }
