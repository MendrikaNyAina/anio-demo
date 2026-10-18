import { format } from 'date-fns'
import type { ReactElement } from 'react'
import { CalendarClock, FileText, FolderKanban, ListChecks, MoreHorizontal, Palette, Paintbrush, Smile, Trash2 } from 'lucide-react'
import { ColorPicker } from '@/components/ColorPicker'
import { IconPicker } from '@/components/IconPicker'
import { IconView } from '@/components/IconView'
import { PeekControls, PeekShell } from '@/components/PeekShell'
import { ProgressBar } from '@/components/ProgressBar'
import { Button } from '@/components/ui/button'
import { Checkbox, inputClass, PropertyRow, Segmented, Switch } from '@/components/ui/controls'
import { useActionMenu } from '@/components/ui/menu'
import { Popover } from '@/components/ui/popover'
import { singleColorProgress } from '@/domain/progress'
import { styleToCss } from '@/domain/style'
import type { Category, StyleTarget, Subcategory } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { ui, useUi } from '@/store/uiStore'
import { confirmDelete, plural, progressOf } from './shared'

const TARGETS: { value: StyleTarget; label: string }[] = [
  { value: 'label', label: 'Label' },
  { value: 'background', label: 'Fond' },
  { value: 'border', label: 'Bordure' },
]

/**
 * Fiche d'une catégorie ou sous-catégorie, façon page Notion, ouverte comme une tâche
 * (panneau latéral ou fenêtre centrée). La couleur sert de couverture ; tout s'enregistre au fil de la saisie.
 */
export function CategorySheet() {
  const sheet = useUi((s) => s.categorySheet)
  const item = useApp((s) =>
    sheet?.kind === 'category' ? s.data.categories.find((c) => c.id === sheet.id) : s.data.subcategories.find((c) => c.id === sheet?.id),
  )
  const close = () => ui.set({ categorySheet: null })
  return (
    <PeekShell open={!!sheet && !!item} onClose={close} label={item ? `Fiche « ${item.name} »` : 'Fiche'}>
      {sheet && item && <SheetBody key={item.id} kind={sheet.kind} item={item} onClose={close} />}
    </PeekShell>
  )
}

function SheetBody({ kind, item, onClose }: { kind: 'category' | 'subcategory'; item: Category | Subcategory; onClose: () => void }) {
  const data = useApp((s) => s.data)
  const app = useApp.getState()
  const isSub = kind === 'subcategory'
  const sub = isSub ? (item as Subcategory) : null
  const parent = sub ? data.categories.find((c) => c.id === sub.categoryId) : undefined
  const children = isSub ? [] : data.subcategories.filter((s) => s.categoryId === item.id).sort((a, b) => a.position - b.position)
  const tasks = data.tasks.filter((t) => (isSub ? t.subcategoryIds.includes(item.id) : t.categoryIds.includes(item.id)))
  const progress = progressOf(tasks)

  const update = (patch: Partial<Subcategory>) => (isSub ? app.updateSubcategory(item.id, patch) : app.updateCategory(item.id, patch))

  const menu = useActionMenu([
    { label: isSub ? 'Supprimer la sous-catégorie' : 'Supprimer la catégorie', icon: <Trash2 />, danger: true, onSelect: () => confirmDelete(kind, item, children.length, onClose) },
  ])

  const colorPicker = (trigger: ReactElement) => (
    <Popover align="end" className="p-0" trigger={trigger}>
      <ColorPicker color={item.color} target={item.styleTarget} onColorChange={(color) => update({ color })} onTargetChange={(styleTarget) => update({ styleTarget })} />
    </Popover>
  )

  return (
    <>
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        <PeekControls onClose={onClose} />
        <span className="ml-1 truncate text-[13px] text-ink-2">
          {isSub ? (
            <>
              <button type="button" onClick={() => parent && ui.set({ categorySheet: { kind: 'category', id: parent.id } })} className="rounded px-1 hover:bg-hover hover:text-ink">
                {parent?.name ?? 'Catégorie'}
              </button>
              <span className="text-ink-3"> / </span>Sous-catégorie
            </>
          ) : (
            'Catégorie'
          )}
        </span>
        <div className="ml-auto">
          <Button size="icon" variant="subtle" onClick={menu.openFromButton} aria-label="Plus d'actions">
            <MoreHorizontal size={16} />
          </Button>
        </div>
        {menu.element}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-16">
        {/* Couverture : la couleur de la catégorie, comme la photo de couverture d'une page Notion. */}
        <div className="group/cover relative h-[150px] shrink-0 transition-colors" style={{ background: item.color }}>
          <div className="absolute right-4 bottom-3 flex gap-1.5 opacity-0 transition-opacity group-hover/cover:opacity-100 focus-within:opacity-100">
            {colorPicker(
              <button type="button" className="flex h-7 items-center gap-1.5 rounded-md bg-white/85 px-2.5 text-xs font-medium text-ink shadow-sm backdrop-blur hover:bg-white">
                <Palette size={13} /> Changer la couleur
              </button>,
            )}
          </div>
        </div>

        <div className="px-10">
          {/* Icône et titre côte à côte, sous la couverture. */}
          <div className="mt-6 mb-5 flex items-center gap-3">
            <IconPicker
              icon={item.icon}
              color={item.color}
              onChange={(icon) => update({ icon })}
              size={44}
              trigger={
                <button type="button" title="Changer l'icône" className="flex size-[52px] shrink-0 items-center justify-center rounded-xl hover:bg-hover">
                  {item.icon ? <IconView icon={item.icon} size={44} color={item.color} /> : <Smile size={30} className="text-ink-3" />}
                </button>
              }
            />
            <input
              value={item.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Sans titre"
              aria-label="Nom"
              className="min-w-0 flex-1 text-[34px] leading-tight font-bold outline-none placeholder:text-[#d3d1cb]"
            />
          </div>

          {sub && (
            <PropertyRow label="Catégorie" icon={<FolderKanban />}>
              {parent && (
                <button
                  type="button"
                  onClick={() => ui.set({ categorySheet: { kind: 'category', id: parent.id } })}
                  className="mt-0.5 inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[13px] hover:brightness-95"
                  style={styleToCss({ color: parent.color, target: parent.styleTarget })}
                >
                  <IconView icon={parent.icon} size={13} color={parent.color} /> {parent.name}
                </button>
              )}
            </PropertyRow>
          )}

          <PropertyRow label="Couleur" icon={<Palette />}>
            {colorPicker(
              <button type="button" className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-hover">
                <span className="size-4 rounded" style={{ background: item.color }} />
                <span className="font-mono text-xs uppercase">{item.color}</span>
              </button>,
            )}
          </PropertyRow>

          <PropertyRow label="Style des tâches" icon={<Paintbrush />}>
            <div className="flex flex-wrap items-center gap-3">
              <Segmented value={item.styleTarget} onChange={(styleTarget) => update({ styleTarget })} options={TARGETS} />
              <span className="rounded border px-1.5 py-0.5 text-[13px]" style={styleToCss({ color: item.color, target: item.styleTarget })}>
                Aperçu d'une tâche
              </span>
            </div>
          </PropertyRow>

          {sub && (
            <>
              <PropertyRow label="Projet" icon={<FolderKanban />}>
                <div className="flex items-center gap-2 pt-1.5">
                  <Switch checked={sub.isProject} onChange={(isProject) => update({ isProject })} color={item.color} label="C'est un projet" />
                  <span className="text-sm text-ink-2">{sub.isProject ? 'Oui : deadline et description' : 'Non'}</span>
                </div>
              </PropertyRow>
              {sub.isProject && (
                <>
                  <PropertyRow label="Deadline" icon={<CalendarClock />}>
                    <DeadlineEditor sub={sub} onChange={update} />
                  </PropertyRow>
                  <PropertyRow label="Description" icon={<FileText />}>
                    <textarea
                      value={sub.description ?? ''}
                      onChange={(e) => update({ description: e.target.value })}
                      rows={3}
                      placeholder="De quoi parle ce projet ?"
                      className={cn(inputClass, 'h-auto resize-y py-1.5')}
                    />
                  </PropertyRow>
                </>
              )}
            </>
          )}

          {!isSub && (
            <PropertyRow label="Sous-catégories" icon={<FolderKanban />}>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {children.length === 0 && <span className="pt-0.5 text-sm text-ink-3">Aucune</span>}
                {children.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => ui.set({ categorySheet: { kind: 'subcategory', id: s.id } })}
                    title="Ouvrir sa fiche"
                    className="inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[13px] hover:brightness-95"
                    style={styleToCss({ color: s.color, target: s.styleTarget })}
                  >
                    <IconView icon={s.icon} size={13} color={s.color} /> {s.name || 'Sans titre'}
                  </button>
                ))}
              </div>
            </PropertyRow>
          )}

          <PropertyRow label="Tâches" icon={<ListChecks />}>
            <div className="flex items-center gap-3 pt-1 text-sm">
              <span>
                {plural(tasks.length, 'tâche')} · {plural(progress.done, 'finie')}
              </span>
              <ProgressBar progress={singleColorProgress(progress.done, progress.total, item.color)} className="w-36" />
              <span className="text-ink-2 tabular-nums">{progress.pct} %</span>
            </div>
          </PropertyRow>
        </div>
      </div>
    </>
  )
}

/** Deadline d'un projet : date seule ou date + heure. */
function DeadlineEditor({ sub, onChange }: { sub: Subcategory; onChange: (patch: Partial<Subcategory>) => void }) {
  const value = sub.deadline ? (sub.deadlineHasTime ? format(new Date(sub.deadline), "yyyy-MM-dd'T'HH:mm") : sub.deadline.slice(0, 10)) : ''
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type={sub.deadlineHasTime ? 'datetime-local' : 'date'}
        className={cn(inputClass, 'w-[200px]')}
        value={value}
        onChange={(e) => onChange({ deadline: e.target.value ? (sub.deadlineHasTime ? new Date(e.target.value).toISOString() : e.target.value) : undefined })}
      />
      <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
        <Checkbox
          checked={sub.deadlineHasTime}
          onChange={(withTime) =>
            onChange({
              deadlineHasTime: withTime,
              deadline: sub.deadline ? (withTime ? new Date(`${sub.deadline.slice(0, 10)}T18:00`).toISOString() : format(new Date(sub.deadline), 'yyyy-MM-dd')) : undefined,
            })
          }
        />
        Avec heure
      </label>
    </div>
  )
}
