import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ID, PomodoroSettings } from '@/domain/types'
import { useApp } from './appStore'

// Minuteur Pomodoro. L'heure de fin est mémorisée (et sauvegardée) plutôt qu'un compte à rebours :
// le minuteur continue quand on change de page ou qu'on recharge, et reste juste si l'onglet dort.

export type PomodoroPhase = 'work' | 'short' | 'long'
export type PomodoroStatus = 'idle' | 'running' | 'paused'

export const PHASE_LABEL: Record<PomodoroPhase, string> = { work: 'Concentration', short: 'Pause courte', long: 'Pause longue' }

interface PomodoroState {
  phase: PomodoroPhase
  status: PomodoroStatus
  /** Horodatage de fin (en cours). */
  endsAt?: number
  /** Temps restant en ms (en pause). */
  remainingMs?: number
  /** Sessions de travail terminées depuis la dernière pause longue. */
  cycle: number
  taskId?: ID

  start(): void
  pause(): void
  reset(): void
  /** Termine la phase tout de suite (une session de travail passée n'est pas comptée). */
  skip(): void
  setPhase(phase: PomodoroPhase): void
  setTask(taskId?: ID): void
}

const settings = () => useApp.getState().data.settings.pomodoro
export const phaseMs = (phase: PomodoroPhase, s: PomodoroSettings) => (phase === 'work' ? s.workMin : phase === 'short' ? s.shortBreakMin : s.longBreakMin) * 60000

/** Phase suivante : une pause longue toutes les `cyclesBeforeLong` sessions de travail. */
function nextPhase(phase: PomodoroPhase, cycle: number, s: PomodoroSettings): { phase: PomodoroPhase; cycle: number } {
  if (phase !== 'work') return { phase: 'work', cycle: phase === 'long' ? 0 : cycle }
  const done = cycle + 1
  return { phase: done >= s.cyclesBeforeLong ? 'long' : 'short', cycle: done }
}

export const usePomodoro = create<PomodoroState>()(
  persist(
    (set, get) => ({
      phase: 'work',
      status: 'idle',
      cycle: 0,

      start: () => {
        const { status, remainingMs, phase } = get()
        if (status === 'running') return
        set({ status: 'running', endsAt: Date.now() + (status === 'paused' && remainingMs ? remainingMs : phaseMs(phase, settings())), remainingMs: undefined })
      },
      pause: () => {
        const { endsAt, status } = get()
        if (status !== 'running' || !endsAt) return
        set({ status: 'paused', remainingMs: Math.max(0, endsAt - Date.now()), endsAt: undefined })
      },
      reset: () => set({ status: 'idle', endsAt: undefined, remainingMs: undefined }),
      skip: () => {
        const { phase, cycle } = get()
        set({ ...nextPhase(phase, cycle, settings()), status: 'idle', endsAt: undefined, remainingMs: undefined })
      },
      setPhase: (phase) => set({ phase, status: 'idle', endsAt: undefined, remainingMs: undefined }),
      setTask: (taskId) => set({ taskId }),
    }),
    { name: 'mon-calendrier-pomodoro', storage: createJSONStorage(() => localStorage) },
  ),
)

/** Temps restant (ms) de la phase en cours, rafraîchi chaque seconde quand le minuteur tourne. */
export function useRemainingMs(): number {
  const { status, endsAt, remainingMs, phase } = usePomodoro()
  const s = useApp((st) => st.data.settings.pomodoro)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (status !== 'running') return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [status])
  if (status === 'running' && endsAt) return Math.max(0, endsAt - now)
  if (status === 'paused' && remainingMs !== undefined) return remainingMs
  return phaseMs(phase, s)
}

export const fmtClock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Petit carillon (Web Audio) : pas de fichier son à charger. */
function chime() {
  try {
    const ctx = new AudioContext()
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      const at = ctx.currentTime + i * 0.22
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6)
      osc.connect(gain).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + 0.65)
    })
    setTimeout(() => void ctx.close(), 1500)
  } catch {
    /* son indisponible */
  }
}

/**
 * Surveille la fin de la phase, où qu'on soit dans l'application (monté une fois dans l'AppShell) :
 * enregistre la session de travail, sonne, prévient, et prépare la phase suivante.
 */
export function usePomodoroEngine() {
  const status = usePomodoro((s) => s.status)
  const endsAt = usePomodoro((s) => s.endsAt)
  useEffect(() => {
    if (status !== 'running' || !endsAt) return
    const finish = () => {
      const { phase, cycle, taskId } = usePomodoro.getState()
      const s = settings()
      if (phase === 'work') useApp.getState().addPomodoroSession(s.workMin, taskId)
      if (s.sound) chime()
      const next = nextPhase(phase, cycle, s)
      usePomodoro.setState({ ...next, status: 'idle', endsAt: undefined, remainingMs: undefined })
      toast(phase === 'work' ? 'Session terminée, place à la pause ! ☕' : 'Pause terminée, on s’y remet ? 🍅', {
        action: { label: `Lancer : ${PHASE_LABEL[next.phase].toLowerCase()}`, onClick: () => usePomodoro.getState().start() },
      })
    }
    const delay = endsAt - Date.now()
    if (delay <= 0) return finish()
    const id = setTimeout(finish, delay)
    return () => clearTimeout(id)
  }, [status, endsAt])
}
