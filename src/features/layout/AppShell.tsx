import { Menu } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { GlobalDialogs } from '@/components/GlobalDialogs'
import { useIsMobile } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
import { usePomodoroEngine } from '@/store/pomodoroStore'
import { Mascot } from './Mascot'
import { Sidebar } from './Sidebar'
import { SidebarRail } from './SidebarRail'

export function AppShell() {
  const session = useApp((s) => s.session)
  const sidebarOpen = useApp((s) => s.prefs.sidebarOpen)
  const setPrefs = useApp((s) => s.setPrefs)
  const theme = useTheme()
  const isMobile = useIsMobile()
  usePomodoroEngine()
  // Téléphone : le menu est un tiroir, fermé par défaut et refermé à chaque changement de page.
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setNavOpen(false), [pathname])
  // Ctrl + \ (⌘ + \ sur Mac) ouvre ou ferme le menu, comme dans Notion.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== '\\') return
      e.preventDefault()
      if (isMobile) setNavOpen((v) => !v)
      else setPrefs({ sidebarOpen: !useApp.getState().prefs.sidebarOpen })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobile, setPrefs])
  // Le CSS propre à un thème (vue mois en blocs, en-têtes des jours…) se règle sur cet attribut.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  if (!session) return <Navigate to="/login" replace />

  const open = isMobile ? navOpen : sidebarOpen
  const setOpen = (value: boolean) => (isMobile ? setNavOpen(value) : setPrefs({ sidebarOpen: value }))

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar open={open} onClose={() => setOpen(false)} overlay={isMobile} />
      {!isMobile && !sidebarOpen && <SidebarRail onOpen={() => setOpen(true)} />}
      {isMobile && navOpen && <div aria-hidden className="fixed inset-0 z-30 bg-[rgb(15_15_15/30%)]" onClick={() => setNavOpen(false)} />}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {isMobile && <MobileTopBar onMenu={() => setNavOpen(true)} journal={theme === 'journal'} />}
        <div className="relative min-h-0 flex-1">
          <Outlet />
        </div>
      </main>
      <GlobalDialogs />
      <Mascot />
    </div>
  )
}

/** Barre du haut sur téléphone : ouvre le menu (qui ne tient pas à côté de la page). */
function MobileTopBar({ onMenu, journal }: { onMenu: () => void; journal: boolean }) {
  return (
    <div
      className={cn(
        'flex h-12 shrink-0 items-center gap-2 px-2',
        journal ? 'border-b-2 border-[#E3E2F8] bg-[#F4F3FF] font-plate text-[#2F2B6E]' : 'border-b border-line bg-white',
      )}
    >
      <button
        type="button"
        onClick={onMenu}
        aria-label="Ouvrir le menu"
        className={cn('flex size-10 items-center justify-center rounded-full', journal ? 'text-[#5B57A6] hover:bg-[#DCDDFF]' : 'text-ink-2 hover:bg-hover')}
      >
        <Menu size={20} />
      </button>
      <span className="text-[15px] font-semibold">Mon calendrier</span>
    </div>
  )
}

/** Conteneur des pages « document » (tout sauf le calendrier). */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[920px] px-4 pt-8 pb-24 sm:px-12 sm:pt-14">{children}</div>
    </div>
  )
}
