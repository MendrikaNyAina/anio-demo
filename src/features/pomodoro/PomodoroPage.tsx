import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { PanelCard } from '@/components/PanelCard'
import { ThemedPage } from '@/components/ThemedPage'
import { inputClass, Segmented, Switch } from '@/components/ui/controls'
import { toKey } from '@/domain/dates'
import { tint } from '@/domain/style'
import type { PomodoroSettings } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
import { fmtClock, PHASE_LABEL, phaseMs, usePomodoro, useRemainingMs, type PomodoroPhase } from '@/store/pomodoroStore'

// Page Pomodoro : minuteur au centre, tâche liée et chiffres du jour à côté, réglages en dessous.
// Le minuteur continue quand on quitte la page (pomodoroStore).

const PHASE_COLOR: Record<PomodoroPhase, string> = { work: '#D44C47', short: '#448361', long: '#337EA9' }
/** Thème journal : rose bonbon, vert d'eau, lavande. */
const PHASE_COLOR_JOURNAL: Record<PomodoroPhase, string> = { work: '#E86AAE', short: '#5FB59A', long: '#8C92E8' }

export function PomodoroPage() {
  return (
    <ThemedPage icon="🍅" tab="ma concentration" title="Pomodoro" description="Travaille par sessions concentrées, entrecoupées de pauses. Le minuteur continue si tu changes de page.">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          <Timer />
        </div>
        <aside className="flex max-w-[480px] min-w-0 flex-[1_1_300px] flex-col gap-5">
          <TaskCard />
          <TodayCard />
          <SettingsCard />
        </aside>
      </div>
    </ThemedPage>
  )
}

function Timer() {
  const journal = useTheme() === 'journal'
  const { phase, status, cycle, start, pause, reset, skip, setPhase } = usePomodoro()
  const settings = useApp((s) => s.data.settings.pomodoro)
  const remaining = useRemainingMs()
  const total = phaseMs(phase, settings)
  const ratio = total === 0 ? 0 : 1 - remaining / total
  const color = (journal ? PHASE_COLOR_JOURNAL : PHASE_COLOR)[phase]

  // Anneau de progression.
  const R = 104
  const C = 2 * Math.PI * R

  return (
    <PanelCard title={PHASE_LABEL[phase]} accent={color}>
      <div className="flex flex-col items-center gap-5 py-4">
        <Segmented<PomodoroPhase>
          value={phase}
          onChange={setPhase}
          options={(['work', 'short', 'long'] as const).map((p) => ({ value: p, label: PHASE_LABEL[p] }))}
        />

        <div className="relative size-[240px]">
          <svg viewBox="0 0 240 240" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="120" cy="120" r={R} fill={journal ? '#F4F3FF' : 'none'} stroke={journal ? '#E3E2F8' : '#ecebe9'} strokeWidth={journal ? 14 : 8} />
            <circle
              cx="120"
              cy="120"
              r={R}
              fill="none"
              stroke={journal ? tint(color, 80) : color}
              strokeWidth={journal ? 14 : 8}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - ratio)}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-[52px] leading-none font-semibold tabular-nums', journal && 'font-plate text-[#2F2B6E]')} aria-live="off">
              {fmtClock(remaining)}
            </span>
            <span className={cn('mt-2 text-xs', journal ? 'font-plate font-medium text-[#5B57A6]' : 'text-ink-3')}>
              {status === 'running' ? 'en cours' : status === 'paused' ? 'en pause' : 'prêt'}
            </span>
          </div>
          {journal && (
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" className="absolute top-3 right-4 rotate-12">
              <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" fill="#E86AAE" stroke="#2F2B6E" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Sessions avant la pause longue */}
        <div className="flex items-center gap-1.5" aria-label={`${cycle} session${cycle > 1 ? 's' : ''} sur ${settings.cyclesBeforeLong} avant la pause longue`}>
          {Array.from({ length: settings.cyclesBeforeLong }, (_, i) => (
            <span
              key={i}
              className={cn('size-2.5 rounded-full', journal && 'border-[1.5px] border-[#A3A8EE]')}
              style={{ background: i < cycle ? (journal ? tint(PHASE_COLOR_JOURNAL.work, 70) : PHASE_COLOR.work) : journal ? '#FFFFFF' : '#e3e2e0' }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <RoundButton journal={journal} onClick={reset} label="Réinitialiser">
            <RotateCcw size={17} />
          </RoundButton>
          <button
            type="button"
            onClick={status === 'running' ? pause : start}
            className={cn(
              'flex h-12 min-w-[150px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white transition-transform active:scale-95',
              journal && 'border-2 border-[#2F2B6E] font-plate shadow-[0_4px_0_#2F2B6E]',
            )}
            style={{ background: journal ? tint(color, 95) : color }}
          >
            {status === 'running' ? <Pause size={18} /> : <Play size={18} />}
            {status === 'running' ? 'Pause' : status === 'paused' ? 'Reprendre' : 'Démarrer'}
          </button>
          <RoundButton journal={journal} onClick={skip} label="Passer à la phase suivante">
            <SkipForward size={17} />
          </RoundButton>
        </div>
      </div>
    </PanelCard>
  )
}

function RoundButton({ journal, onClick, label, children }: { journal: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'flex size-11 items-center justify-center rounded-full transition-colors',
        journal ? 'border-2 border-[#A3A8EE] bg-white text-[#5B57A6] shadow-[0_3px_0_#DCDDFF] hover:bg-[#DCDDFF]' : 'border border-line text-ink-2 hover:bg-hover',
      )}
    >
      {children}
    </button>
  )
}

function TaskCard() {
  const tasks = useApp((s) => s.data.tasks)
  const taskId = usePomodoro((s) => s.taskId)
  const setTask = usePomodoro((s) => s.setTask)
  const options = useMemo(() => tasks.filter((t) => t.kind !== 'habit' && !t.done && !t.source && t.title).sort((a, b) => a.title.localeCompare(b.title)), [tasks])
  const linked = tasks.find((t) => t.id === taskId)

  return (
    <PanelCard title="Tâche en cours">
      <select className={inputClass} value={linked ? linked.id : ''} onChange={(e) => setTask(e.target.value || undefined)} aria-label="Tâche liée aux sessions">
        <option value="">Aucune tâche</option>
        {linked?.done && <option value={linked.id}>{linked.title} (faite)</option>}
        {options.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-ink-3">Les sessions terminées sont comptées pour cette tâche.</p>
    </PanelCard>
  )
}

function TodayCard() {
  const sessions = useApp((s) => s.data.pomodoroSessions)
  const tasks = useApp((s) => s.data.tasks)
  const today = toKey(new Date())
  const todays = sessions.filter((s) => toKey(new Date(s.startedAt)) === today)
  const minutes = todays.reduce((n, s) => n + s.minutes, 0)
  const byTask = new Map<string, number>()
  for (const s of todays) if (s.taskId) byTask.set(s.taskId, (byTask.get(s.taskId) ?? 0) + 1)

  return (
    <PanelCard title="Aujourd'hui">
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Stat value={todays.length} label={`pomodoro${todays.length > 1 ? 's' : ''}`} />
        <Stat value={`${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`} label="de concentration" />
      </div>
      {byTask.size > 0 && (
        <ul className="space-y-1 text-sm">
          {[...byTask].map(([id, n]) => (
            <li key={id} className="flex items-center justify-between gap-2">
              <span className="truncate">{tasks.find((t) => t.id === id)?.title ?? 'Tâche supprimée'}</span>
              <span className="shrink-0 text-xs text-ink-3">{'🍅'.repeat(Math.min(n, 8))}</span>
            </li>
          ))}
        </ul>
      )}
      {todays.length === 0 && <p className="text-sm text-ink-2">Aucune session terminée pour l'instant.</p>}
    </PanelCard>
  )
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-lg bg-sidebar px-3 py-2.5">
      <span className="block text-2xl leading-none font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-ink-2">{label}</span>
    </div>
  )
}

function SettingsCard() {
  const settings = useApp((s) => s.data.settings.pomodoro)
  const updateSettings = useApp((s) => s.updateSettings)
  const set = (patch: Partial<PomodoroSettings>) => updateSettings({ pomodoro: { ...settings, ...patch } })

  const row = (label: string, value: number, choices: number[], onChange: (v: number) => void, unit = 'min') => (
    <label className="flex items-center justify-between gap-3 py-1 text-sm">
      {label}
      <select className={cn(inputClass, 'w-[96px]')} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {choices.map((c) => (
          <option key={c} value={c}>
            {c} {unit}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <PanelCard title="Réglages">
      {row('Concentration', settings.workMin, [15, 20, 25, 30, 45, 50, 60, 90], (workMin) => set({ workMin }))}
      {row('Pause courte', settings.shortBreakMin, [3, 5, 10, 15], (shortBreakMin) => set({ shortBreakMin }))}
      {row('Pause longue', settings.longBreakMin, [10, 15, 20, 30], (longBreakMin) => set({ longBreakMin }))}
      {row('Pause longue après', settings.cyclesBeforeLong, [2, 3, 4, 5, 6], (cyclesBeforeLong) => set({ cyclesBeforeLong }), 'sessions')}
      <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
        Son à la fin d'une phase
        <Switch checked={settings.sound} onChange={(sound) => set({ sound })} label="Son à la fin d'une phase" />
      </div>
    </PanelCard>
  )
}
