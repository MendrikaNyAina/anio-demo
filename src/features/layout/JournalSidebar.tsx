import { CalendarDays, ChartColumn, ChevronsLeft, ChevronsUpDown, Folder, Ghost, Settings, Smile, Sparkles, Timer, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import type { useActionMenu } from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { NotionSourcesList } from '@/features/notion/NotionSourcesList'
import { PomodoroBadge } from '@/features/pomodoro/PomodoroBadge'

// Menu latéral du thème journal (maquette « Menu latéral — journal ») : une page de carnet sur papier
// quadrillé lavande, reliée par une spirale sur le bord droit. La page active est une étiquette posée de travers.

/** Anneaux de la reliure, répartis sur toute la hauteur. */
const RINGS = Array.from({ length: 30 }, (_, i) => i)

const star = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-full">
    <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" fill="#E86AAE" stroke="#2F2B6E" strokeWidth="2.2" strokeLinejoin="round" />
  </svg>
)

export function JournalSidebar({
  name,
  account,
  inCalendar,
  onClose,
}: {
  name: string
  account: ReturnType<typeof useActionMenu>
  inCalendar: boolean
  onClose: () => void
}) {
  const inBilan = useLocation().pathname.startsWith('/bilan')
  const trashCount = useApp((s) => s.data.trash.length)
  return (
    <div className="relative h-full w-[280px] font-plate text-[#2F2B6E]">
      <div
        className="group absolute inset-y-0 right-3 left-0 flex flex-col overflow-y-auto border-r-2 border-[#A3A8EE] pt-[22px] pr-[22px] pb-[18px] pl-4"
        style={{
          backgroundColor: '#F4F3FF',
          backgroundImage: 'linear-gradient(rgb(140 146 232 / 16%) 1px, transparent 1px), linear-gradient(90deg, rgb(140 146 232 / 16%) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        {/* Washi tape */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-1 left-[88px] h-5 w-[86px] -rotate-[4deg] opacity-90"
          style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, #DCEBB0 0 7px, #EEF5D6 7px 14px)',
            clipPath: 'polygon(0 12%, 5% 0, 95% 0, 100% 14%, 97% 50%, 100% 86%, 95% 100%, 5% 100%, 0 88%, 3% 50%)',
          }}
        />

        {/* Compte, avec sa languette */}
        <div className="relative mb-[22px] shrink-0 pt-3.5">
          <span className="absolute top-0 left-3.5 z-[1] inline-flex items-center gap-[5px] rounded-full border-2 border-journal-green-line bg-journal-green px-[9px] text-[11px] leading-5 font-semibold">
            mon espace
            <span className="size-2.5">{star}</span>
          </span>
          <button
            type="button"
            onClick={account.openFromButton}
            className="flex w-full items-center gap-2.5 rounded-[18px] border-2 border-[#A3A8EE] bg-white px-2.5 pt-3.5 pb-2.5 text-left shadow-[0_4px_0_var(--color-journal-green)] transition-colors hover:bg-[#FBFAFF]"
          >
            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-[#2F2B6E] bg-[#F9C6DD] text-sm font-semibold">{name[0]}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] leading-tight font-semibold">{name}</span>
              <span className="block text-[11px] font-medium text-[#5B57A6]">mon calendrier</span>
            </span>
            <ChevronsUpDown size={14} className="shrink-0 text-[#6E6BC4]" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Fermer le menu (Ctrl + \)"
            aria-label="Fermer le menu"
            className="absolute -top-1 right-0 z-[1] flex size-7 items-center justify-center rounded-full border-2 border-[#A3A8EE] bg-white text-[#5B57A6] shadow-[0_2px_0_#DCDDFF] transition-colors hover:bg-[#DCDDFF] hover:text-[#2F2B6E]"
          >
            <ChevronsLeft size={15} />
          </button>
          {account.element}
        </div>

        <nav aria-label="Menu principal" className="flex shrink-0 flex-col gap-0.5">
          <Item to="/categories" icon={<Folder />}>
            Catégories
          </Item>
          <Item to="/events" icon={<Sparkles />}>
            Événements
          </Item>
          <Item to="/calendar/week" icon={<CalendarDays />} active={inCalendar}>
            Calendrier
          </Item>
          {/* Vues du calendrier, reliées par un trait griffonné */}
          <div className="mt-1 mb-1.5 ml-[21px] flex flex-col gap-px border-l-2 border-dashed border-[#C9CDFF] pl-3.5">
            <SubItem to="/calendar/month">Mois</SubItem>
            <SubItem to="/calendar/week">Semaine</SubItem>
            <SubItem to="/calendar/day">Jour</SubItem>
            <SubItem to="/calendar/matrix">Matrice</SubItem>
          </div>
          <Item to="/bilan" icon={<ChartColumn />} active={inBilan}>
            Bilan
          </Item>
          {/* Bilans : la journée et les habitudes */}
          <div className="mt-1 mb-1.5 ml-[21px] flex flex-col gap-px border-l-2 border-dashed border-[#C9CDFF] pl-3.5">
            <SubItem to="/bilan">Aujourd'hui</SubItem>
            <SubItem to="/bilan/habits">Habitudes</SubItem>
          </div>
          <Item to="/pomodoro" icon={<Timer />}>
            Pomodoro
            <PomodoroBadge journal />
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
            {trashCount > 0 && <span className="ml-auto pr-1 text-xs font-medium text-[#6E6BC4]">{trashCount}</span>}
          </Item>
        </nav>

        <svg width="54" height="22" viewBox="0 0 54 22" aria-hidden="true" className="mt-[18px] ml-3 shrink-0">
          <path d="M2 16c6-10 10 4 16-4s9 2 13-6 8 0 13-4 6 2 8 0" fill="none" stroke="#9E8CF0" strokeWidth="2.4" strokeLinecap="round" />
        </svg>

        <div className="min-h-4 flex-1" />

        {inCalendar && (
          <div className="relative shrink-0">
            <NotionSourcesList />
            <svg width="22" height="20" viewBox="0 0 24 22" aria-hidden="true" className="pointer-events-none absolute -right-1.5 -bottom-2 rotate-12">
              <path d="M12 20s-8-5-9.5-10C1.3 6 4 3 7 3c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3 0 5.7 3 4.5 7C20 15 12 20 12 20z" fill="#F9C6DD" stroke="#2F2B6E" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        <p className="mx-1 mt-3.5 shrink-0 text-[11px] leading-snug text-[#5B57A6]">Démo : les données restent dans ce navigateur.</p>
      </div>

      {/* Reliure : anneaux à cheval sur le bord droit */}
      <div aria-hidden className="pointer-events-none absolute inset-y-[18px] right-1 flex w-4 flex-col justify-between">
        {RINGS.map((i) => (
          <span key={i} className="block h-[9px] w-4 rounded-full border-2 border-[#A3A8EE] bg-white" />
        ))}
      </div>
    </div>
  )
}

/** Lien principal. Actif : étiquette blanche penchée, ombre vert pistache et petite étoile collée. */
function Item({ to, icon, active, children }: { to: string; icon: ReactNode; active?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-2.5 rounded-xl text-[15px] transition-colors [&>svg]:size-[18px] [&>svg]:shrink-0',
          isActive || active
            ? 'my-1 h-10 -rotate-[1.2deg] border-2 border-journal-green-line bg-white px-3 font-semibold text-[#2F2B6E] shadow-[0_4px_0_var(--color-journal-green)]'
            : 'h-9 px-2.5 font-medium text-[#5B57A6] hover:bg-white/70 hover:text-[#2F2B6E]',
        )
      }
    >
      {({ isActive }) => (
        <>
          {icon}
          {children}
          {(isActive || active) && <span className="absolute -top-[9px] -right-1.5 size-4 rotate-[14deg]">{star}</span>}
        </>
      )}
    </NavLink>
  )
}

/** Vue du calendrier (Mois / Semaine / Jour). Active : fond vert pistache et puce bleu nuit. */
function SubItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex h-[30px] items-center gap-2 rounded-[10px] px-2.5 text-sm transition-colors',
          isActive ? 'bg-journal-green font-semibold text-[#2F2B6E]' : 'font-medium text-[#5B57A6] hover:bg-white/70 hover:text-[#2F2B6E]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('size-1.5 shrink-0 rounded-full', isActive ? 'bg-[#2F2B6E]' : 'bg-[#C9CDFF]')} />
          {children}
        </>
      )}
    </NavLink>
  )
}
