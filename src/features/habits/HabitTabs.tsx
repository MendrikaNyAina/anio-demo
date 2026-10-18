import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ExternalLink, EyeOff, MoreHorizontal, Plus } from 'lucide-react'
import { useState, type ReactNode, type UIEvent } from 'react'
import { journalMenuClass } from '@/components/JournalTitle'
import { PageTab, tabFill, TabStrip, TabStripButton, tabZIndex } from '@/components/PageTabs'
import { Checkbox } from '@/components/ui/controls'
import { useActionMenu } from '@/components/ui/menu'
import { Popover } from '@/components/ui/popover'
import { fromKey } from '@/domain/dates'
import { tint } from '@/domain/style'
import type { ID, Task } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/appStore'
import { ui } from '@/store/uiStore'

/** Au-delà, les onglets passent dans « N de plus », comme dans Notion. */
const MAX_TABS = 6
/** Habitudes terminées chargées à chaque fois qu'on arrive en bas de la liste « … ». */
const PAGE = 12

export function HabitTabs({
  tabs,
  activeId,
  ended,
  shownEnded,
  colorOf,
  onSelect,
  onToggleShown,
  onCreate,
}: {
  tabs: Task[]
  activeId?: ID
  ended: Task[]
  shownEnded: ID[]
  colorOf: (habit: Task) => string
  onSelect: (id: ID) => void
  onToggleShown: (id: ID) => void
  onCreate: () => void
}) {
  // Notion : les premiers onglets, puis « N de plus ». L'onglet actif reste toujours visible.
  let visible = tabs
  let overflow: Task[] = []
  if (tabs.length > MAX_TABS) {
    visible = tabs.slice(0, MAX_TABS - 1)
    const active = tabs.find((t) => t.id === activeId)
    if (active && !visible.includes(active)) visible = [...visible.slice(0, -1), active]
    overflow = tabs.filter((t) => !visible.includes(t))
  }
  const activeIndex = visible.findIndex((t) => t.id === activeId)

  return (
    <TabStrip>
      {visible.map((habit, i) => (
        <HabitTab
          key={habit.id}
          habit={habit}
          color={colorOf(habit)}
          active={habit.id === activeId}
          ended={shownEnded.includes(habit.id)}
          fill={tabFill(Math.abs(i - activeIndex))}
          zIndex={tabZIndex(i, visible.length, habit.id === activeId)}
          onSelect={() => onSelect(habit.id)}
          onHide={() => onToggleShown(habit.id)}
        />
      ))}

      {overflow.length > 0 && (
        <MenuButton first label={`${overflow.length} de plus`} title="Autres habitudes en cours">
          <div className="max-h-[320px] w-[240px] overflow-y-auto">
            {overflow.map((habit) => (
              <Row key={habit.id} onClick={() => onSelect(habit.id)}>
                <Dot color={colorOf(habit)} />
                <span className="min-w-0 flex-1 truncate">{habit.title || 'Sans titre'}</span>
              </Row>
            ))}
          </div>
        </MenuButton>
      )}

      {ended.length > 0 && (
        <MenuButton first={overflow.length === 0} label={<MoreHorizontal size={15} />} title="Habitudes terminées">
          <EndedHabitsList ended={ended} shown={shownEnded} colorOf={colorOf} onToggle={onToggleShown} onOpen={onSelect} />
        </MenuButton>
      )}

      <TabStripButton first={overflow.length === 0 && ended.length === 0} onClick={onCreate} title="Nouvelle habitude" aria-label="Nouvelle habitude">
        <Plus size={14} />
      </TabStripButton>
    </TabStrip>
  )
}

function HabitTab({
  habit,
  color,
  active,
  ended,
  fill,
  zIndex,
  onSelect,
  onHide,
}: {
  habit: Task
  color: string
  active: boolean
  ended: boolean
  fill: string
  zIndex: number
  onSelect: () => void
  onHide: () => void
}) {
  const open = () => ui.openPeek(habit.id)
  const menu = useActionMenu([
    { label: 'Ouvrir', icon: <ExternalLink />, onSelect: open },
    ...(ended ? (['separator', { label: 'Retirer des onglets', icon: <EyeOff />, onSelect: onHide }] as const) : []),
  ])

  return (
    <PageTab active={active} fill={fill} zIndex={zIndex} onClick={onSelect} onDoubleClick={open} onContextMenu={menu.onContextMenu}>
      <Dot color={color} />
      <span className={cn(ended && 'opacity-70')}>{habit.title || 'Sans titre'}</span>
      {ended && <span className="text-[11px] font-normal opacity-60">terminée</span>}
      {menu.element}
    </PageTab>
  )
}

/**
 * Liste « … » des habitudes terminées. Elle se charge par paquets quand on arrive en bas,
 * et chaque case cochée remet l'habitude dans les onglets.
 */
function EndedHabitsList({
  ended,
  shown,
  colorOf,
  onToggle,
  onOpen,
}: {
  ended: Task[]
  shown: ID[]
  colorOf: (habit: Task) => string
  onToggle: (id: ID) => void
  onOpen: (id: ID) => void
}) {
  const journal = useTheme() === 'journal'
  const [count, setCount] = useState(PAGE)
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (count < ended.length && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setCount((c) => Math.min(c + PAGE, ended.length))
  }

  return (
    <div className="w-[300px]">
      <div className={cn('px-2 pt-1 pb-2', journal ? 'border-b-2 border-dashed border-[#DCDDFF]' : 'border-b border-line')}>
        <div className="text-[13px] font-semibold">Habitudes terminées ({ended.length})</div>
        <div className={cn('text-xs', journal ? 'text-[#5B57A6]' : 'text-ink-3')}>Coche une habitude pour l'afficher dans les onglets.</div>
      </div>
      <div onScroll={onScroll} className="max-h-[320px] overflow-y-auto pt-1">
        {ended.slice(0, count).map((habit) => {
          const checked = shown.includes(habit.id)
          return (
            <Row key={habit.id}>
              <Checkbox checked={checked} onChange={() => onToggle(habit.id)} label={`Afficher ${habit.title} dans les onglets`} />
              <button
                type="button"
                onClick={() => {
                  if (!checked) onToggle(habit.id)
                  onOpen(habit.id)
                }}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                title="Ouvrir son suivi"
              >
                <Dot color={colorOf(habit)} />
                <span className="min-w-0 flex-1 truncate">{habit.title || 'Sans titre'}</span>
                <span className={cn('shrink-0 text-[11px]', journal ? 'text-[#5B57A6]' : 'text-ink-3')}>
                  fin {format(fromKey(habit.recurrence!.endDate!), 'd MMM yyyy', { locale: fr })}
                </span>
              </button>
            </Row>
          )
        })}
        {count < ended.length && <div className={cn('px-2 py-2 text-center text-xs', journal ? 'text-[#5B57A6]' : 'text-ink-3')}>Chargement de la suite…</div>}
      </div>
    </div>
  )
}

function MenuButton({ label, title, first, children }: { label: ReactNode; title: string; first?: boolean; children: ReactNode }) {
  const journal = useTheme() === 'journal'
  return (
    <Popover
      align="start"
      className={journal ? cn(journalMenuClass, 'p-2') : 'p-1'}
      trigger={
        <TabStripButton first={first} title={title} aria-label={title}>
          {label}
        </TabStripButton>
      }
    >
      {children}
    </Popover>
  )
}

function Row({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  const journal = useTheme() === 'journal'
  return (
    <div
      {...(onClick ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (e: { key: string }) => e.key === 'Enter' && onClick() } : {})}
      className={cn('flex items-center gap-2 px-2 text-[13px]', onClick && 'cursor-pointer', journal ? 'h-8 rounded-[10px] hover:bg-[#F4F3FF]' : 'h-7 rounded-md hover:bg-hover')}
    >
      {children}
    </div>
  )
}

/** Pastille de la couleur de la (sous-)catégorie, pastélisée. */
function Dot({ color }: { color: string }) {
  return <span className="size-2.5 shrink-0 rounded-full" style={{ background: tint(color, 55), boxShadow: `inset 0 0 0 1.5px ${tint(color, 85)}` }} />
}
