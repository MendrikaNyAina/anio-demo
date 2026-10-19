import { CalendarDays, ChartColumn, ChevronsRight, Folder, Ghost, Settings, Smile, Sparkles, Timer, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/appStore'

const ITEMS: { to: string; label: string; icon: ReactNode; match?: string }[] = [
  { to: '/categories', label: 'Catégories', icon: <Folder /> },
  { to: '/events', label: 'Événements', icon: <Sparkles /> },
  { to: '/calendar/week', label: 'Calendrier', icon: <CalendarDays />, match: '/calendar' },
  { to: '/bilan', label: 'Bilan', icon: <ChartColumn />, match: '/bilan' },
  { to: '/pomodoro', label: 'Pomodoro', icon: <Timer /> },
  { to: '/mascot', label: 'Mascotte', icon: <Ghost /> },
  { to: '/settings', label: 'Paramètres', icon: <Settings /> },
  { to: '/icons', label: 'Icônes', icon: <Smile /> },
  { to: '/trash', label: 'Poubelle', icon: <Trash2 /> },
]

/** Menu replié (ordinateur) : un rail d'icônes pour naviguer, et le bouton pour rouvrir le menu complet. */
export function SidebarRail({ onOpen }: { onOpen: () => void }) {
  const journal = useTheme() === 'journal'
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Menu replié"
      className={cn(
        'flex h-full w-14 shrink-0 flex-col items-center gap-1 py-3',
        journal ? 'border-r-2 border-[#A3A8EE] bg-[#F4F3FF] text-[#5B57A6]' : 'border-r border-line bg-sidebar text-ink-2',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        title="Ouvrir le menu (Ctrl + \)"
        aria-label="Ouvrir le menu"
        className={cn(
          'mb-3 flex size-9 items-center justify-center transition-colors',
          journal ? 'rounded-full border-2 border-[#A3A8EE] bg-white shadow-[0_2px_0_#DCDDFF] hover:bg-[#DCDDFF]' : 'rounded-md hover:bg-press hover:text-ink',
        )}
      >
        <ChevronsRight size={17} />
      </button>
      {ITEMS.map((item) => {
        const active = item.match ? pathname.startsWith(item.match) : pathname === item.to
        return (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={cn(
              'flex size-10 items-center justify-center transition-colors [&>svg]:size-[18px]',
              journal
                ? active
                  ? 'rounded-xl border-2 border-[#A3A8EE] bg-white text-[#2F2B6E] shadow-[0_3px_0_#DCDDFF]'
                  : 'rounded-xl hover:bg-white/70 hover:text-[#2F2B6E]'
                : active
                  ? 'rounded-md bg-press text-ink'
                  : 'rounded-md hover:bg-press hover:text-ink',
            )}
          >
            {item.icon}
          </NavLink>
        )
      })}
    </nav>
  )
}
