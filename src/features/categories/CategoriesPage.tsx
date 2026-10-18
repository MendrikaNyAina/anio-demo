import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { JournalTitle } from '@/components/JournalTitle'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/controls'
import { groupForCategoryPage } from '@/domain/grouping'
import { OTHER } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
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
          <PageHeader icon="🗂️" title="Catégories" description={description} actions={addButton} />
        )}
        {layout === 'notion' && <NotionLayout real={real} other={other} />}
        {layout === 'soft' && <SoftLayout real={real} other={other} onAddCategory={addCategory} />}
        {layout === 'pixel' && <PixelLayout real={real} other={other} onAddCategory={addCategory} />}
      </div>
    </div>
  )
}
