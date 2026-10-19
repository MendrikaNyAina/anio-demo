import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Folder, FolderTree, RotateCcw, Trash2 } from 'lucide-react'
import { IconView } from '@/components/IconView'
import { PanelCard } from '@/components/PanelCard'
import { ThemedPage } from '@/components/ThemedPage'
import { TypeIndicator } from '@/components/TypeIndicator'
import { Button } from '@/components/ui/button'
import { KIND_LABEL } from '@/domain/display'
import { TRASH_DAYS, trashDaysLeft, trashLabel } from '@/domain/trash'
import type { TrashItem } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
import { ui } from '@/store/uiStore'
import { toast } from 'sonner'

/** Poubelle : tâches, habitudes, catégories et sous-catégories supprimées, restaurables pendant 30 jours. */
export function TrashPage() {
  const trash = useApp((s) => s.data.trash)
  const app = useApp.getState()
  const tasks = trash.filter((i) => i.kind === 'task')
  const groups = trash.filter((i) => i.kind !== 'task')

  const emptyAll = () =>
    ui.confirm({
      title: 'Vider la poubelle ?',
      message: `Les ${trash.length} éléments seront supprimés définitivement.`,
      confirmLabel: 'Vider',
      onConfirm: () => app.emptyTrash(),
    })

  return (
    <ThemedPage
      icon="🗑️"
      tab="mes suppressions"
      title="Poubelle"
      description={`Ce que tu supprimes y reste ${TRASH_DAYS} jours avant de disparaître définitivement.`}
      actions={
        trash.length > 0 && (
          <Button variant="outline" onClick={emptyAll}>
            <Trash2 size={14} /> Vider la poubelle
          </Button>
        )
      }
    >
      {trash.length === 0 ? (
        <PanelCard title="Rien dans la poubelle">
          <p className="py-2 text-sm text-ink-2">Les tâches, habitudes et catégories supprimées apparaîtront ici.</p>
        </PanelCard>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.length > 0 && (
            <PanelCard title={`Catégories et sous-catégories · ${groups.length}`}>
              {groups.map((item) => (
                <TrashRow key={item.id} item={item} />
              ))}
            </PanelCard>
          )}
          {tasks.length > 0 && (
            <PanelCard title={`Tâches et habitudes · ${tasks.length}`}>
              {tasks.map((item) => (
                <TrashRow key={item.id} item={item} />
              ))}
            </PanelCard>
          )}
        </div>
      )}
    </ThemedPage>
  )
}

function TrashRow({ item }: { item: TrashItem }) {
  const journal = useTheme() === 'journal'
  const app = useApp.getState()
  const left = trashDaysLeft(item)
  const name = trashLabel(item)

  const restore = () => {
    app.restoreTrash(item.id)
    toast(`« ${name} » restauré`)
  }
  const purge = () =>
    ui.confirm({
      title: `Supprimer « ${name} » définitivement ?`,
      message: 'Il ne pourra plus être restauré.',
      confirmLabel: 'Supprimer',
      onConfirm: () => app.purgeTrash(item.id),
    })

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2 py-2', journal ? 'rounded-[12px] hover:bg-[#F4F3FF]' : 'rounded-md hover:bg-hover')}>
      <span className="flex size-7 shrink-0 items-center justify-center text-ink-2">{icon(item)}</span>
      <span className="min-w-[160px] flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-ink-3">
          {detail(item)} · supprimé {formatDistanceToNow(new Date(item.deletedAt), { locale: fr, addSuffix: true })}
        </span>
      </span>
      <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium', left <= 3 ? 'bg-[#FDEBEC] text-[#9F2F2D]' : 'bg-[#F1F1EF] text-ink-2')}>
        {left === 0 ? 'disparaît aujourd’hui' : `encore ${left} j`}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="outline" onClick={restore}>
          <RotateCcw size={13} /> Restaurer
        </Button>
        <Button size="icon" variant="subtle" onClick={purge} title="Supprimer définitivement" aria-label="Supprimer définitivement">
          <Trash2 size={14} />
        </Button>
      </span>
    </div>
  )
}

function icon(item: TrashItem) {
  if (item.kind === 'task' && item.task) return <TypeIndicator type={item.task.kind} size={16} />
  const owner = item.category ?? item.subcategories?.[0]
  if (owner?.icon) return <IconView icon={owner.icon} size={16} color={owner.color} />
  return item.kind === 'category' ? <Folder size={16} /> : <FolderTree size={16} />
}

function detail(item: TrashItem) {
  if (item.kind === 'task' && item.task) return KIND_LABEL[item.task.kind]
  if (item.kind === 'category') {
    const n = item.subcategories?.length ?? 0
    return `Catégorie${n > 0 ? ` · ${n} sous-catégorie${n > 1 ? 's' : ''}` : ''}`
  }
  return 'Sous-catégorie'
}
