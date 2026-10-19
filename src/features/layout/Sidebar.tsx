import { CalendarDays, ChartColumn, ChevronsLeft, ChevronsUpDown, Folder, Ghost, LogOut, RotateCcw, Settings, Smile, Sparkles, Timer, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { useActionMenu } from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
import { ui } from '@/store/uiStore'
import { NotionSourcesList } from '@/features/notion/NotionSourcesList'
import { PomodoroBadge } from '@/features/pomodoro/PomodoroBadge'
import { JournalSidebar } from './JournalSidebar'

/**
 * Menu de gauche façon Notion, repliable (calendrier.md l. 23).
 * `overlay` (téléphone) : tiroir qui glisse par-dessus la page au lieu de la pousser.
 */
export function Sidebar({ open, onClose, overlay }: { open: boolean; onClose: () => void; overlay: boolean }) {
  const session = useApp((s) => s.session)
  const trashCount = useApp((s) => s.data.trash.length)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const inCalendar = pathname.startsWith('/calendar')
  const inBilan = pathname.startsWith('/bilan')
  const journal = useTheme() === 'journal'

  const account = useActionMenu([
    { label: 'Paramètres', icon: <Settings />, onSelect: () => navigate('/settings') },
    {
      label: 'Réinitialiser la démo',
      icon: <RotateCcw />,
      onSelect: () =>
        ui.confirm({
          title: 'Réinitialiser la démo ?',
          message: 'Toutes tes modifications seront remplacées par les données de départ.',
          confirmLabel: 'Réinitialiser',
          onConfirm: () => useApp.getState().resetDemo(),
        }),
    },
    'separator',
    { label: 'Se déconnecter', icon: <LogOut />, onSelect: () => useApp.getState().logout() },
  ])

  const width = journal ? 'w-[280px]' : 'w-[248px]'
  const asideClass = overlay
    ? cn('fixed inset-y-0 left-0 z-40 overflow-hidden transition-transform duration-200 ease-out', width, open ? 'translate-x-0 shadow-pop' : '-translate-x-full')
    : cn('h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out', open ? width : 'w-0')

  if (journal) {
    return (
      <aside className={asideClass} inert={!open}>
        <JournalSidebar name={session?.name ?? ''} account={account} inCalendar={inCalendar} onClose={onClose} />
      </aside>
    )
  }

  return (
    <aside className={cn(asideClass, 'border-line bg-sidebar', open && 'border-r')} inert={!open}>
      <div className="flex h-full w-[248px] flex-col">
        <div className="group flex items-center gap-1 px-2 pt-2 pb-1">
          <button type="button" onClick={account.openFromButton} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-press">
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#E8DCC8] text-[11px] font-semibold text-[#6b5235]">{session?.name[0]}</span>
            <span className="truncate text-sm font-medium">{session?.name}</span>
            <ChevronsUpDown size={13} className="shrink-0 text-ink-3" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Fermer le menu (Ctrl + \)"
            aria-label="Fermer le menu"
            className="rounded-md p-1 text-ink-3 hover:bg-press hover:text-ink"
          >
            <ChevronsLeft size={16} />
          </button>
          {account.element}
        </div>

        <nav className="space-y-px px-2 py-1">
          <Item to="/categories" icon={<Folder />}>
            Catégories
          </Item>
          <Item to="/events" icon={<Sparkles />}>
            Événements
          </Item>
          <Item to="/calendar/week" icon={<CalendarDays />} active={inCalendar}>
            Calendrier
          </Item>
          <div className="space-y-px pl-6">
            <Item to="/calendar/month" small>
              Mois
            </Item>
            <Item to="/calendar/week" small>
              Semaine
            </Item>
            <Item to="/calendar/day" small>
              Jour
            </Item>
            <Item to="/calendar/matrix" small>
              Matrice
            </Item>
          </div>
          <Item to="/bilan" icon={<ChartColumn />} active={inBilan}>
            Bilan
          </Item>
          <div className="space-y-px pl-6">
            <Item to="/bilan" small>
              Aujourd'hui
            </Item>
            <Item to="/bilan/habits" small>
              Habitudes
            </Item>
          </div>
          <Item to="/pomodoro" icon={<Timer />}>
            Pomodoro
            <PomodoroBadge />
          </Item>
          <Item to="/mascot" icon={<Ghost />}>
            Mascotte
          </Item>
          <Item to="/settings" icon={<Settings />}>
            Paramètres
          </Item>
          <Item to="/icons" icon={<Smile />}>
            Icônes
          </Item>
          <Item to="/trash" icon={<Trash2 />}>
            Poubelle
            {trashCount > 0 && <span className="ml-auto text-xs font-normal text-ink-3">{trashCount}</span>}
          </Item>
        </nav>

        {inCalendar ? (
          <>
            <div className="min-h-0 flex-1" />
            <div className="border-t border-line px-2 py-2">
              <NotionSourcesList />
            </div>
          </>
        ) : (
          <div className="mt-auto px-4 py-3 text-[11px] leading-snug text-ink-3">Démo : les données restent dans ce navigateur.</div>
        )}
      </div>
    </aside>
  )
}

function Item({ to, icon, children, small, active }: { to: string; icon?: ReactNode; children: ReactNode; small?: boolean; active?: boolean }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-2 text-ink-2 transition-colors hover:bg-press [&>svg]:size-[17px] [&>svg]:shrink-0',
          small ? 'h-7 text-[13px]' : 'h-[30px] text-sm font-medium',
          (isActive || active) && 'bg-press text-ink',
          isActive && small && 'font-medium',
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}
