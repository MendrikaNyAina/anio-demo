import { Check, Clock, ExternalLink, ListChecks, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { InlineEditableText } from '@/components/InlineEditableText'
import { PAGE_SIZE, Pagination } from '@/components/Pagination'
import { TypeIndicator } from '@/components/TypeIndicator'
import { Checkbox } from '@/components/ui/controls'
import { useActionMenu } from '@/components/ui/menu'
import { KIND_LABEL, PRIORITY_COLOR, PRIORITY_LABEL, sortTasks, taskDisplayRange } from '@/domain/display'
import { toKey } from '@/domain/dates'
import type { TaskLinks } from '@/domain/grouping'
import { buildLookup } from '@/domain/lookup'
import { resolveTaskStyle, shade, styleToCss, type ResolvedStyle } from '@/domain/style'
import type { Task, TaskKind } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, withUndo } from '@/store/appStore'
import { emptyDraft, ui, useUi } from '@/store/uiStore'
import { DashedAdd, type CategoriesLayout } from './shared'

/** Délai avant qu'une tâche cochée descende sous les non cochées (au cas où on coche par erreur). */
const REORDER_DELAY = 10_000

/**
 * Liste des tâches d'une sous-catégorie (calendrier.md l. 41-42) : ligne « + » pour créer,
 * non finies d'abord, délai de 10 s après une coche, 50 tâches par page.
 * Le comportement est le même pour les trois affichages ; seul le rendu des lignes change.
 */
export function TaskList({ tasks, links, variant = 'notion' }: { tasks: Task[]; links: TaskLinks; variant?: CategoriesLayout }) {
  const [page, setPage] = useState(0)
  const [frozen, setFrozen] = useState<Record<string, boolean>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const toggleTaskDone = useApp((s) => s.toggleTaskDone)

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  // La base est mise à jour tout de suite ; seul le tri attend 10 s.
  const toggle = (task: Task) => {
    setFrozen((f) => (task.id in f ? f : { ...f, [task.id]: task.done }))
    clearTimeout(timers.current[task.id])
    timers.current[task.id] = setTimeout(() => {
      setFrozen((f) => {
        const next = { ...f }
        delete next[task.id]
        return next
      })
    }, REORDER_DELAY)
    toggleTaskDone(task.id)
  }

  const sorted = useMemo(() => sortTasks(tasks, frozen), [tasks, frozen])
  const visible = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const Row = variant === 'soft' ? SoftTaskRow : variant === 'pixel' ? PixelTaskRow : NotionTaskRow

  return (
    <div className={cn(variant === 'soft' && 'flex flex-col gap-2', variant === 'pixel' && 'flex flex-col gap-1')}>
      <AddTaskRow links={links} variant={variant} onCreated={() => setPage(0)} />
      {visible.map((t) => (
        <Row key={t.id} task={t} onToggle={() => toggle(t)} />
      ))}
      {tasks.length === 0 && (
        <div className={cn('py-1 text-[13px]', variant === 'pixel' ? 'pl-2 font-bold text-[#7E5BD6]' : 'pl-8 text-ink-3')}>Aucune tâche</div>
      )}
      <Pagination page={page} total={tasks.length} onChange={setPage} />
    </div>
  )
}

function AddTaskRow({ links, variant, onCreated }: { links: TaskLinks; variant: CategoriesLayout; onCreated: () => void }) {
  const [choosing, setChoosing] = useState(false)
  const createTask = useApp((s) => s.createTask)

  const create = (kind: TaskKind) => {
    setChoosing(false)
    const id = createTask(
      emptyDraft(kind, {
        ...links,
        recurrence: kind === 'habit' ? { weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: toKey(new Date()), durationMin: 30 } : undefined,
      }),
    )
    ui.set({ editingKey: id })
    onCreated()
  }

  if (choosing) {
    return (
      <div className="flex min-h-[34px] flex-wrap items-center gap-1 rounded-md px-2 text-[13px]">
        <span className="mr-1 text-ink-3">Type :</span>
        {(['simple', 'spread', 'habit'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => create(k)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5',
              variant === 'pixel' ? 'rounded-full border-2 border-[#3D2B6B] bg-white font-bold hover:bg-[#F7B5D6]' : 'rounded-md border border-line hover:bg-hover',
            )}
          >
            <TypeIndicator type={k} /> {KIND_LABEL[k]}
          </button>
        ))}
        <button type="button" onClick={() => setChoosing(false)} className="ml-1 rounded-md px-2 py-0.5 text-ink-3 hover:bg-hover">
          Annuler
        </button>
      </div>
    )
  }

  if (variant === 'soft') {
    return (
      <button
        type="button"
        onClick={() => setChoosing(true)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#D7D5DE] bg-white text-[13px] font-semibold text-[#55525F] hover:bg-[#F7F7F9]"
      >
        <Plus size={14} /> Nouvelle tâche
      </button>
    )
  }
  if (variant === 'pixel') {
    return (
      <button
        type="button"
        onClick={() => setChoosing(true)}
        className="mb-1 h-8 self-start rounded-full border-2 border-dashed border-[#7E5BD6] bg-white px-3.5 font-pixel text-xs text-[#3D2B6B] hover:bg-[#FFF0F8]"
      >
        + nouvelle tâche
      </button>
    )
  }
  return <DashedAdd label="Nouvelle tâche" onClick={() => setChoosing(true)} className="my-1" />
}

/** Tout ce qu'une ligne de tâche partage, quel que soit l'affichage. */
function useTaskRow(task: Task) {
  const data = useApp((s) => s.data)
  const editing = useUi((s) => s.editingKey === task.id)
  const style = useMemo(() => resolveTaskStyle(task, buildLookup(data)), [task, data])
  const app = useApp.getState()

  // Depuis la page Catégories, on supprime toujours toute la tâche / toute l'habitude (décisions 3 et 4).
  const remove = () => withUndo(task.kind === 'habit' ? 'Habitude mise à la poubelle' : 'Tâche mise à la poubelle', () => app.deleteTask(task.id))

  const menu = useActionMenu([
    { label: 'Ouvrir', icon: <ExternalLink />, onSelect: () => ui.openPeek(task.id) },
    'separator',
    { label: 'Supprimer', icon: <Trash2 />, danger: true, onSelect: remove },
  ])

  /** Titre en saisie pour une tâche qui vient d'être créée (vide + Échap = annulée). */
  const titleEditor = (inputClassName: string) => (
    <InlineEditableText
      value=""
      startEditing
      placeholder="Nom de la tâche"
      onSave={(title) => {
        ui.set({ editingKey: null })
        app.updateTask(task.id, { title })
      }}
      onCancel={() => {
        ui.set({ editingKey: null })
        app.deleteTask(task.id, { permanent: true })
      }}
      inputClassName={inputClassName}
    />
  )

  return { style, editing, menu, titleEditor, doneStyle: data.settings.doneStyle, subDone: task.subtasks.filter((s) => s.done).length }
}

type RowProps = { task: Task; onToggle: () => void }

// ── Notion (affichage d'origine) ────────────────────────────────────────────
function NotionTaskRow({ task, onToggle }: RowProps) {
  const { style, editing, menu, titleEditor, doneStyle, subDone } = useTaskRow(task)
  return (
    <div onContextMenu={menu.onContextMenu} className={cn('group flex h-[34px] items-center gap-2 rounded-md px-2 hover:bg-[rgb(55_53_47/6%)]', menu.isOpen && 'bg-[rgb(55_53_47/6%)]')}>
      {task.kind !== 'habit' ? <Checkbox checked={task.done} onChange={onToggle} label="Fait" /> : <span className="w-4 shrink-0" />}
      <span style={{ color: style ? shade(style.color, 85) : '#9B9A97' }} className="flex">
        <TypeIndicator type={task.kind} icon={style?.icon} color={style ? shade(style.color, 85) : undefined} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          titleEditor('text-sm')
        ) : (
          <button
            type="button"
            onClick={() => ui.openPeek(task.id)}
            className={cn('max-w-full truncate rounded border px-1.5 py-px text-left text-sm', task.done && 'entry-done', task.done && doneStyle === 'hatched' && 'done-hatched')}
            style={styleToCss(style)}
          >
            <span className="entry-title">{task.title || 'Sans titre'}</span>
          </button>
        )}
      </div>
      {task.priority && (
        <span className="hidden shrink-0 rounded px-1.5 text-[11px] font-medium @md:inline" style={{ color: PRIORITY_COLOR[task.priority], background: `color-mix(in srgb, ${PRIORITY_COLOR[task.priority]} 12%, white)` }}>
          {PRIORITY_LABEL[task.priority]}
        </span>
      )}
      {task.subtasks.length > 0 && (
        <span className="hidden shrink-0 text-[11px] text-ink-3 tabular-nums @md:inline">
          ☑ {subDone}/{task.subtasks.length}
        </span>
      )}
      <span className={cn('shrink-0 text-right text-xs tabular-nums', task.slots.length === 0 && task.kind !== 'habit' ? 'text-ink-3 italic' : 'text-ink-2')}>{taskDisplayRange(task)}</span>
      <button type="button" onClick={menu.openFromButton} className="rounded p-0.5 text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-press hover:text-ink" aria-label="Actions">
        <MoreHorizontal size={16} />
      </button>
      {menu.element}
    </div>
  )
}

// ── Cartes douces (inspiration 2.jpg) ───────────────────────────────────────
const STATUS = {
  todo: { label: 'À faire', dot: '#F2B33D' },
  done: { label: 'Fait', dot: '#E25D9A' },
  habit: { label: 'Habitude', dot: '#8B6BD6' },
}

function SoftTaskRow({ task, onToggle }: RowProps) {
  const { style, editing, menu, titleEditor, subDone } = useTaskRow(task)
  const status = task.kind === 'habit' ? STATUS.habit : task.done ? STATUS.done : STATUS.todo
  return (
    <div
      onContextMenu={menu.onContextMenu}
      className={cn('group relative flex flex-col gap-1 rounded-[14px] border border-[#ECEBF0] bg-[#FCFCFD] px-3.5 py-2.5', menu.isOpen && 'border-[#C9C7D1]')}
      style={style ? { boxShadow: `inset 3px 0 0 ${style.color}` } : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-[#6E6B78]">
          <TypeIndicator type={task.kind} icon={style?.icon} color={style?.color} size={15} /> {KIND_LABEL[task.kind]}
        </span>
        <span className="flex-1" />
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#3E3B48]">
          <span className="size-[7px] rounded-full" style={{ background: status.dot }} />
          {status.label}
        </span>
        {task.kind !== 'habit' && <SoftCheck checked={task.done} onChange={onToggle} />}
        <button type="button" onClick={menu.openFromButton} className="rounded p-0.5 text-[#A3A1AC] hover:bg-[#F0EFF3] hover:text-[#1D1B22]" aria-label="Actions">
          <MoreHorizontal size={15} />
        </button>
      </div>
      {editing ? (
        titleEditor('text-[15px] font-semibold')
      ) : (
        <button
          type="button"
          onClick={() => ui.openPeek(task.id)}
          className={cn('truncate text-left text-[15px] font-semibold', task.done ? 'text-[#8E8B97] line-through' : 'text-[#1D1B22]')}
        >
          {task.title || 'Sans titre'}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E6B78]">
        <span className="flex items-center gap-1">
          <Clock size={12} /> {taskDisplayRange(task)}
        </span>
        {task.priority && (
          <span className="rounded-md px-1.5 font-semibold" style={{ color: PRIORITY_COLOR[task.priority], background: `color-mix(in srgb, ${PRIORITY_COLOR[task.priority]} 12%, white)` }}>
            {PRIORITY_LABEL[task.priority]}
          </span>
        )}
        {task.subtasks.length > 0 && (
          <span className="flex items-center gap-1">
            <ListChecks size={12} /> {subDone} / {task.subtasks.length}
          </span>
        )}
      </div>
      {menu.element}
    </div>
  )
}

function SoftCheck({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label="Fait"
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn('flex size-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-[#1D1B22]', checked ? 'bg-[#1D1B22] text-white' : 'bg-white hover:bg-[#F0EFF3]')}
    >
      {checked && <Check size={13} strokeWidth={3.2} />}
    </button>
  )
}

// ── Pixel kawaii (inspiration 3.jpg) ────────────────────────────────────────
function PixelTaskRow({ task, onToggle }: RowProps) {
  const { style, editing, menu, titleEditor, subDone } = useTaskRow(task)
  return (
    <div onContextMenu={menu.onContextMenu} className={cn('group flex flex-wrap items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-[#F6F1FF]', task.done && 'opacity-55')}>
      {task.kind !== 'habit' ? <PixelCheck checked={task.done} onChange={onToggle} /> : <PixelDot style={style} />}
      {/* Le titre garde au moins 220 px : c'est la pastille de date qui passe à la ligne. */}
      <div className="min-w-0 flex-[1_1_220px]">
        {editing ? (
          titleEditor('text-[15px] font-extrabold')
        ) : (
          <button type="button" onClick={() => ui.openPeek(task.id)} className={cn('max-w-full truncate text-left text-[15px] font-extrabold text-[#3D2B6B]', task.done && 'line-through')}>
            {task.title || 'Sans titre'}
          </button>
        )}
      </div>
      {task.priority === 'high' && <span className="font-pixel text-[11px] text-[#B23A35]">!! haute</span>}
      {(task.kind !== 'simple' || task.subtasks.length > 0) && (
        <span className="text-xs font-bold text-[#7E5BD6]">
          {task.kind === 'spread' ? 'étalée' : task.kind === 'habit' ? 'habitude' : ''}
          {task.subtasks.length > 0 && ` · ${subDone}/${task.subtasks.length}`}
        </span>
      )}
      {/* Pastille et « … » restent ensemble quand la ligne se coupe. */}
      <span className="flex shrink-0 items-center gap-1">
        <span
          className={cn(
            'rounded-full border-2 border-[#3D2B6B] px-2.5 font-pixel text-[11px] leading-[18px]',
            task.done ? 'bg-white' : task.slots.length === 0 && task.kind !== 'habit' ? 'bg-[#E7DEFF]' : 'bg-[#7E5BD6] text-white',
          )}
        >
          {taskDisplayRange(task)}
        </span>
        <button type="button" onClick={menu.openFromButton} className="rounded p-0.5 text-[#3D2B6B] opacity-0 group-hover:opacity-100 hover:bg-[#E7DEFF]" aria-label="Actions">
          <MoreHorizontal size={15} />
        </button>
      </span>
      {menu.element}
    </div>
  )
}

function PixelCheck({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label="Fait"
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn('flex size-5 shrink-0 items-center justify-center rounded border-[2.5px] border-[#3D2B6B]', checked ? 'bg-[#E86AAE]' : 'bg-white hover:bg-[#FFF0F8]')}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="#FFFFFF" aria-hidden="true">
          <rect x="1" y="6" width="2" height="2" />
          <rect x="3" y="8" width="2" height="2" />
          <rect x="5" y="6" width="2" height="2" />
          <rect x="7" y="4" width="2" height="2" />
          <rect x="9" y="2" width="2" height="2" />
        </svg>
      )}
    </button>
  )
}

/** Une habitude n'a pas de case : un petit carré de la couleur de sa sous-catégorie. */
function PixelDot({ style }: { style: ResolvedStyle | null }) {
  return <span aria-hidden className="mx-1 size-3 shrink-0 rounded-[3px] border-2 border-[#3D2B6B]" style={{ background: style?.color ?? '#CBB8F7' }} />
}
