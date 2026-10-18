import { ArrowLeft, ArrowRight, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { InlineEditableText } from '@/components/InlineEditableText'
import { PageTab, TabBadge, tabFill, TabStrip, TabStripButton, tabZIndex } from '@/components/PageTabs'
import { useActionMenu } from '@/components/ui/menu'
import type { CalendarMode, CalendarView } from '@/domain/types'
import { countActiveFilters } from '@/domain/visibility'
import { useApp } from '@/store/appStore'

/**
 * Onglets de vues, comme dans Notion (calendrier.md l. 71) : chaque vue garde ses filtres
 * et l'état de ses panneaux. Double-clic pour renommer, clic droit pour les options.
 */
export function ViewTabs({ mode, active }: { mode: CalendarMode; active: CalendarView }) {
  const views = useApp((s) => s.data.views)
  const app = useApp.getState()
  const [renaming, setRenaming] = useState<string | null>(null)
  const list = views.filter((v) => v.mode === mode).sort((a, b) => a.position - b.position)
  const activeIndex = list.findIndex((v) => v.id === active.id)

  return (
    <TabStrip>
      {list.map((v, i) => (
        <Tab
          key={v.id}
          view={v}
          active={v.id === active.id}
          fill={tabFill(Math.abs(i - activeIndex))}
          zIndex={tabZIndex(i, list.length, v.id === active.id)}
          renaming={renaming === v.id}
          isFirst={i === 0}
          isLast={i === list.length - 1}
          canDelete={list.length > 1}
          onRename={() => setRenaming(v.id)}
          onRenamed={(name) => {
            setRenaming(null)
            if (name) app.updateView(v.id, { name })
          }}
        />
      ))}
      <TabStripButton first onClick={() => setRenaming(app.createView(mode))} title="Nouvelle vue" aria-label="Nouvelle vue">
        <Plus size={14} />
      </TabStripButton>
    </TabStrip>
  )
}

function Tab({
  view,
  active,
  fill,
  zIndex,
  renaming,
  isFirst,
  isLast,
  canDelete,
  onRename,
  onRenamed,
}: {
  view: CalendarView
  active: boolean
  fill: string
  zIndex: number
  renaming: boolean
  isFirst: boolean
  isLast: boolean
  canDelete: boolean
  onRename: () => void
  onRenamed: (name?: string) => void
}) {
  const app = useApp.getState()
  const filters = countActiveFilters(view.filters)
  const menu = useActionMenu([
    { label: 'Renommer', icon: <Pencil />, onSelect: onRename },
    { label: 'Dupliquer', icon: <Copy />, onSelect: () => app.createView(view.mode, view) },
    { label: 'Déplacer à gauche', icon: <ArrowLeft />, disabled: isFirst, onSelect: () => app.moveView(view.id, -1) },
    { label: 'Déplacer à droite', icon: <ArrowRight />, disabled: isLast, onSelect: () => app.moveView(view.id, 1) },
    'separator',
    { label: 'Supprimer la vue', icon: <Trash2 />, danger: true, disabled: !canDelete, onSelect: () => app.deleteView(view.id) },
  ])

  return (
    <PageTab active={active} fill={fill} zIndex={zIndex} onClick={() => app.setActiveView(view.mode, view.id)} onDoubleClick={onRename} onContextMenu={menu.onContextMenu}>
      {renaming ? <InlineEditableText value={view.name} startEditing onSave={onRenamed} onEnd={() => onRenamed()} className="w-28" inputClassName="w-28 text-sm" /> : view.name}
      {filters > 0 && <TabBadge>{filters}</TabBadge>}
      {menu.element}
    </PageTab>
  )
}
