import { format, getDaysInMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { IconView } from '@/components/IconView'
import { Button } from '@/components/ui/button'
import { fromKey, toKey } from '@/domain/dates'
import { habitCellState, habitYears, isHabitEnded, type HabitCellState } from '@/domain/habitTracking'
import { shade, tint } from '@/domain/style'
import type { ID, IconRef, Task } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
import { HabitInsights } from './HabitInsights'

const MONTHS = Array.from({ length: 12 }, (_, m) => m)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const WEEKDAY_SHORT = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

const STATE_LABEL: Record<HabitCellState, string> = {
  none: 'rien de prévu',
  future: 'à venir',
  today: "aujourd'hui, pas encore fait",
  done: 'fait',
  missed: 'raté',
}

/**
 * Suivi d'une habitude sur une année (calendrier.md, « Page Suivi des habitudes ») :
 * mois en colonnes, jours de 1 à 31 en lignes. Une case par jour prévu, cliquable pour cocher.
 */
export function HabitTracker({
  habit,
  color,
  label,
  icon,
  todayHabits,
  colorOf,
  onSelect,
}: {
  habit: Task
  color: string
  label?: string
  icon?: IconRef
  /** Habitudes en cours prévues aujourd'hui, pour la checklist du panneau. */
  todayHabits: Task[]
  colorOf: (habit: Task) => string
  onSelect: (id: ID) => void
}) {
  const journal = useTheme() === 'journal'
  const toggle = useApp((s) => s.toggleOccurrenceDone)
  const today = useMemo(() => new Date(), [])
  const { first, last } = habitYears(habit, today)
  // Par défaut : l'année en cours, ou l'année de fin pour une habitude terminée.
  const [year, setYear] = useState(() => (isHabitEnded(habit, today) ? last : Math.min(Math.max(today.getFullYear(), first), last)))
  const rec = habit.recurrence!

  const ink = journal ? 'text-[#2F2B6E]' : 'text-ink'
  const soft = journal ? 'text-[#5B57A6]' : 'text-ink-3'

  return (
    <div className={cn('px-4 pt-4 pb-12 sm:px-6', journal && 'font-plate')}>
      {/* Barre d'outils : année, résumé de l'habitude, bilan de l'année */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="subtle" onClick={() => setYear(year - 1)} disabled={year <= first} aria-label="Année précédente">
            <ChevronLeft size={17} />
          </Button>
          <h2 className={cn('min-w-[64px] text-center text-xl font-bold tabular-nums', ink)}>{year}</h2>
          <Button size="icon" variant="subtle" onClick={() => setYear(year + 1)} disabled={year >= last} aria-label="Année suivante">
            <ChevronRight size={17} />
          </Button>
        </div>

        <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-sm', soft)}>
          {label && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-px font-medium text-[#37352F]" style={{ background: tint(color, 20) }}>
              <IconView icon={icon} size={13} color={color} />
              {label}
            </span>
          )}
          <span>{recurrenceText(rec.weekdays)}</span>
          <span>
            depuis le {format(fromKey(rec.startDate), 'd MMM yyyy', { locale: fr })}
            {rec.endDate ? ` · jusqu'au ${format(fromKey(rec.endDate), 'd MMM yyyy', { locale: fr })}` : ''}
          </span>
        </div>

      </div>

      {/* Tableau à gauche, panneau à droite ; sur un écran plus étroit, le panneau passe dessous. */}
      <div className="flex flex-wrap items-start gap-x-10 gap-y-8">
        <div className="min-w-0 flex-[0_1_620px]">
          <Legend color={color} journal={journal} />

          <div className="overflow-x-auto">
            {/* Largeur limitée : sur grand écran les cases restent presque carrées au lieu de s'étirer. */}
            <table className="w-full max-w-[600px] min-w-[480px] border-separate border-spacing-[3px]">
              <thead>
                <tr>
                  <th className="w-8" />
                  {MONTHS.map((m) => {
                    const current = year === today.getFullYear() && m === today.getMonth()
                    return (
                      <th key={m} scope="col" className={cn('pb-1 text-xs capitalize', current ? cn('font-semibold', ink) : cn('font-medium', soft))}>
                        {format(new Date(year, m, 1), 'LLL', { locale: fr }).replace('.', '')}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d) => (
                  <tr key={d}>
                    <th scope="row" className={cn('pr-1.5 text-right text-xs font-normal tabular-nums', soft)}>
                      {d}
                    </th>
                    {MONTHS.map((m) => (
                      <td key={m}>
                        {d <= getDaysInMonth(new Date(year, m, 1)) && (
                          <HabitCell date={new Date(year, m, d)} state={habitCellState(habit, new Date(year, m, d), today)} color={color} journal={journal} onToggle={(key) => toggle(habit.id, key)} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="flex max-w-[460px] min-w-0 flex-[1_1_320px] flex-col gap-4 sm:min-w-[280px] xl:sticky xl:top-4">
          <HabitInsights habit={habit} color={color} year={year} today={today} todayHabits={todayHabits} colorOf={colorOf} onSelect={onSelect} />
        </aside>
      </div>
    </div>
  )
}

/** Couleurs d'une case selon son état. Fait = couleur de la (sous-)catégorie, pastélisée. */
function cellStyle(state: HabitCellState, color: string, journal: boolean) {
  switch (state) {
    case 'done':
      return { background: tint(color, 55), borderColor: tint(color, 80), color: shade(color, 70) }
    case 'missed':
      return { background: '#E3E2E0', borderColor: '#D3D1CB' }
    case 'today':
      return { background: '#FFFFFF', borderColor: journal ? '#2F2B6E' : '#2383E2' }
    case 'future':
      return { background: '#FFFFFF', borderColor: journal ? '#DCDDFF' : '#E9E9E7' }
    case 'none':
      return { background: '#FFFFFF', borderColor: journal ? '#F1F0FD' : '#F4F4F2' }
  }
}

function HabitCell({ date, state, color, journal, onToggle }: { date: Date; state: HabitCellState; color: string; journal: boolean; onToggle: (key: string) => void }) {
  const label = `${format(date, 'EEEE d MMMM yyyy', { locale: fr })} : ${STATE_LABEL[state]}`
  const className = cn('mx-auto flex h-7 w-full max-w-9 min-w-7 items-center justify-center border-[1.5px]', journal ? 'rounded-[7px]' : 'rounded-[4px]', state === 'today' && 'border-2')
  // Seuls les jours prévus et déjà commencés se cochent ; le futur et les jours sans habitude restent blancs.
  if (state === 'none' || state === 'future') return <span role="img" aria-label={label} title={label} className={className} style={cellStyle(state, color, journal)} />
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'done'}
      aria-label={label}
      title={label}
      onClick={() => onToggle(toKey(date))}
      className={cn(className, 'transition-transform hover:scale-110')}
      style={cellStyle(state, color, journal)}
    >
      {state === 'done' && <Check size={13} strokeWidth={3} />}
    </button>
  )
}

function Legend({ color, journal }: { color: string; journal: boolean }) {
  const items: [HabitCellState, string][] = [
    ['done', 'Fait'],
    ['missed', 'Raté'],
    ['today', "Aujourd'hui"],
    ['future', 'À venir ou rien de prévu'],
  ]
  return (
    <div className={cn('mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs', journal ? 'text-[#5B57A6]' : 'text-ink-3')}>
      {items.map(([state, text]) => (
        <span key={state} className="flex items-center gap-1.5">
          <span className={cn('flex size-3.5 items-center justify-center border-[1.5px]', journal ? 'rounded-[4px]' : 'rounded-[3px]')} style={cellStyle(state, color, journal)}>
            {state === 'done' && <Check size={9} strokeWidth={3.5} />}
          </span>
          {text}
        </span>
      ))}
    </div>
  )
}

function recurrenceText(weekdays: number[]) {
  if (weekdays.length === 7) return 'Tous les jours'
  return [...weekdays].sort().map((d) => WEEKDAY_SHORT[d - 1]).join(', ')
}
