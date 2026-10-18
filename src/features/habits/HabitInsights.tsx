import { Flame, Trophy } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { PanelCard, usePanelTone } from '@/components/PanelCard'
import { ProgressBar } from '@/components/ProgressBar'
import { Checkbox } from '@/components/ui/controls'
import { toKey } from '@/domain/dates'
import { habitCellState, habitMonthTallies, habitStreaks, habitWeekdayTallies, rate, type Tally } from '@/domain/habitTracking'
import { singleColorProgress } from '@/domain/progress'
import { shade, tint } from '@/domain/style'
import type { ID, Task } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

/**
 * Panneau à droite du tableau de suivi : séries, bilan, réussite par mois et par jour de la semaine,
 * et les habitudes du jour à cocher sans changer d'onglet.
 */
export function HabitInsights({
  habit,
  color,
  year,
  today,
  todayHabits,
  colorOf,
  onSelect,
}: {
  habit: Task
  color: string
  year: number
  today: Date
  todayHabits: Task[]
  colorOf: (habit: Task) => string
  onSelect: (id: ID) => void
}) {
  const t = usePanelTone()
  const streaks = useMemo(() => habitStreaks(habit, today), [habit, today])
  const months = useMemo(() => habitMonthTallies(habit, year, today), [habit, year, today])
  const weekdays = useMemo(() => habitWeekdayTallies(habit, today), [habit, today])
  const yearTally = months.reduce<Tally>((acc, m) => ({ done: acc.done + m.done, due: acc.due + m.due }), { done: 0, due: 0 })
  const isCurrentYear = year === today.getFullYear()
  const monthTally = months[today.getMonth()]

  return (
    <>
      <PanelCard title="Séries" accent={color}>
        <div className="grid grid-cols-2 gap-3">
          <Streak icon={<Flame size={16} />} value={streaks.current} label="en cours" color={color} />
          <Streak icon={<Trophy size={16} />} value={streaks.best} label="meilleure" color={color} />
        </div>
        <p className={cn('mt-2 text-xs', t.soft)}>Nombre de fois d'affilée où l'habitude a été faite, les jours où elle était prévue.</p>
      </PanelCard>

      <PanelCard title="Bilan" accent={color}>
        <TallyRow label={`Année ${year}`} tally={yearTally} color={color} />
        {isCurrentYear && <TallyRow label="Ce mois-ci" tally={monthTally} color={color} />}
      </PanelCard>

      <PanelCard title={`Réussite par mois · ${year}`} accent={color}>
        <div className="flex h-24 items-end gap-1.5">
          {months.map((m, i) => (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={m.due ? `${m.done} / ${m.due} · ${rate(m)} %` : 'Rien de prévu'}>
              {m.due > 0 ? (
                <span
                  className="w-full rounded-t-md transition-[height] duration-500"
                  style={{ height: `${Math.max(rate(m), 4)}%`, background: tint(color, 55), boxShadow: `inset 0 0 0 1.5px ${tint(color, 80)}` }}
                />
              ) : (
                <span className={cn('h-1 w-full rounded-full', t.empty)} />
              )}
              <span className={cn('text-[10px]', isCurrentYear && i === today.getMonth() ? cn('font-semibold', t.ink) : t.soft)}>{MONTH_LETTERS[i]}</span>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Par jour de la semaine" accent={color}>
        <div className="flex flex-col gap-1.5">
          {weekdays.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={cn('w-7 shrink-0', t.soft)}>{WEEKDAYS[i]}</span>
              {d.due > 0 ? (
                <>
                  <span className={cn('h-2.5 min-w-0 flex-1 overflow-hidden rounded-full', t.empty)}>
                    <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${rate(d)}%`, background: tint(color, 55) }} />
                  </span>
                  <span className={cn('w-9 shrink-0 text-right font-semibold tabular-nums', t.ink)}>{rate(d)} %</span>
                </>
              ) : (
                <span className={cn('flex-1', t.soft)}>pas prévu</span>
              )}
            </div>
          ))}
        </div>
      </PanelCard>

      <TodayChecklist habits={todayHabits} today={today} colorOf={colorOf} onSelect={onSelect} />
    </>
  )
}

/** Toutes les habitudes en cours prévues aujourd'hui, à cocher d'ici. */
function TodayChecklist({ habits, today, colorOf, onSelect }: { habits: Task[]; today: Date; colorOf: (habit: Task) => string; onSelect: (id: ID) => void }) {
  const t = usePanelTone()
  const toggle = useApp((s) => s.toggleOccurrenceDone)
  const key = toKey(today)
  const done = habits.filter((h) => habitCellState(h, today, today) === 'done').length

  return (
    <PanelCard title={`Aujourd'hui · ${done} / ${habits.length}`}>
      {habits.length === 0 && <p className={cn('text-xs', t.soft)}>Aucune habitude prévue aujourd'hui.</p>}
      <div className="flex flex-col gap-0.5">
        {habits.map((h) => {
          const checked = habitCellState(h, today, today) === 'done'
          return (
            <div key={h.id} className={cn('flex items-center gap-2 px-1.5 py-1 text-[13px]', t.row)}>
              <Checkbox checked={checked} onChange={() => toggle(h.id, key)} label={`${h.title} fait aujourd'hui`} />
              <button type="button" onClick={() => onSelect(h.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" title="Ouvrir son suivi">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: tint(colorOf(h), 55) }} />
                <span className={cn('min-w-0 flex-1 truncate', checked && 'line-through opacity-60')}>{h.title || 'Sans titre'}</span>
              </button>
            </div>
          )
        })}
      </div>
    </PanelCard>
  )
}

function Streak({ icon, value, label, color }: { icon: ReactNode; value: number; label: string; color: string }) {
  const t = usePanelTone()
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2.5', t.tile)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ background: tint(color, 30), color: shade(color, 70) }}>
        {icon}
      </span>
      <span>
        <span className={cn('block text-2xl leading-none font-semibold tabular-nums', t.ink)}>{value}</span>
        <span className={cn('text-xs', t.soft)}>{label}</span>
      </span>
    </div>
  )
}

function TallyRow({ label, tally, color }: { label: string; tally: Tally; color: string }) {
  const t = usePanelTone()
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className={t.soft}>{label}</span>
        <span className={t.soft}>
          <span className={cn('font-semibold', t.ink)}>{tally.done}</span> / {tally.due} · <span className={cn('font-semibold', t.ink)}>{rate(tally)} %</span>
        </span>
      </div>
      <ProgressBar progress={singleColorProgress(tally.done, tally.due, color)} />
    </div>
  )
}
