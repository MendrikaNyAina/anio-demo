import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { LoginPage } from '@/features/auth/LoginPage'
import { BilanPage } from '@/features/bilan/BilanPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { CategoriesPage } from '@/features/categories/CategoriesPage'
import { EventsPage } from '@/features/events/EventsPage'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { IconsPage } from '@/features/icons/IconsPage'
import { AppShell } from '@/features/layout/AppShell'
import { MascotPage } from '@/features/mascot/MascotPage'
import { PomodoroPage } from '@/features/pomodoro/PomodoroPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TrashPage } from '@/features/trash/TrashPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/calendar/week" replace /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'calendar/:mode', element: <CalendarPage /> },
      // Bilan : la journée et le suivi des habitudes, regroupés comme les vues du calendrier.
      { path: 'bilan', element: <BilanPage /> },
      { path: 'bilan/habits', element: <HabitsPage /> },
      { path: 'habits', element: <Navigate to="/bilan/habits" replace /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'icons', element: <IconsPage /> },
      { path: 'pomodoro', element: <PomodoroPage /> },
      { path: 'mascot', element: <MascotPage /> },
      { path: 'trash', element: <TrashPage /> },
      { path: '*', element: <Navigate to="/calendar/week" replace /> },
    ],
  },
])

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: 13 } }} />
    </>
  )
}
