import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { journalMenuClass } from '@/components/JournalTitle'
import { Popover } from '@/components/ui/popover'
import type { CalendarMode } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/appStore'

const WEEK = { weekStartsOn: 1 } as const
// Classes du sélecteur selon le thème : lavande / bleu nuit (journal) ou gris / bleu Notion.
const THEMES = {
  journal: {
    menu: cn(journalMenuClass, 'w-[280px] p-3'),
    hover: 'hover:bg-[#F4F3FF]',
    selected: 'bg-[#2F2B6E] text-white',
    week: 'bg-[#DCDDFF]',
    current: 'ring-2 ring-[#A3A8EE] ring-inset',
    weekday: 'font-semibold text-[#6E6BC4]',
    radius: 'rounded-[10px]',
    arrow: 'rounded-full text-[#5B57A6] hover:bg-[#F4F3FF] hover:text-[#2F2B6E]',
    footer: 'rounded-[12px] border-2 border-[#A3A8EE] bg-[#F4F3FF] font-medium hover:bg-[#DCDDFF]',
  },
  notion: {
    menu: 'w-[264px] p-2',
    hover: 'hover:bg-hover',
    selected: 'bg-accent text-white',
    week: 'bg-accent-soft',
    current: 'ring-1 ring-[#b5d3f3] ring-inset',
    weekday: 'font-medium text-ink-3',
    radius: 'rounded-md',
    arrow: 'rounded-md text-ink-3 hover:bg-hover hover:text-ink',
    footer: 'rounded-md border border-line bg-white hover:bg-hover',
  },
}
type PickerTheme = (typeof THEMES)[keyof typeof THEMES]

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Semaines (lundi → dimanche) qui couvrent le mois de `month`. */
function monthWeeks(month: Date): Date[][] {
  const weeks: Date[][] = []
  let day = startOfWeek(startOfMonth(month), WEEK)
  const last = endOfWeek(endOfMonth(month), WEEK)
  while (day <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)))
    day = addDays(day, 7)
  }
  return weeks
}

/**
 * Titre de date cliquable : ouvre un sélecteur adapté au mode.
 * Mois → grille des mois ; Semaine → mini-calendrier, une ligne = une semaine ; Jour → mini-calendrier.
 * En semaine / jour, cliquer le nom du mois remonte à la grille des mois pour aller plus loin.
 */
export function DateJumpPicker({ mode, title, current, onPick }: { mode: CalendarMode; title: string; current: Date; onPick: (date: Date) => void }) {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(current)
  const [level, setLevel] = useState<'days' | 'months'>('days')
  const baseLevel = mode === 'month' ? 'months' : 'days'

  const onOpenChange = (next: boolean) => {
    if (next) {
      setCursor(current)
      setLevel(baseLevel)
    }
    setOpen(next)
  }
  const pick = (date: Date) => {
    onPick(date)
    setOpen(false)
  }

  const showMonths = level === 'months'
  const t = THEMES[useTheme()]

  return (
    <h2>
      <Popover
        open={open}
        onOpenChange={onOpenChange}
        className={t.menu}
        trigger={
          <button
            type="button"
            className="-ml-2 flex min-w-[160px] items-center gap-1.5 rounded-lg px-2 py-0.5 text-xl font-bold transition-colors hover:bg-hover data-[state=open]:bg-hover"
            title="Choisir une date"
          >
            <span className="first-letter:uppercase">{title}</span>
            <ChevronDown size={16} className="text-ink-3" />
          </button>
        }
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <NavArrow t={t} label={showMonths ? 'Année précédente' : 'Mois précédent'} onClick={() => setCursor(showMonths ? addYears(cursor, -1) : addMonths(cursor, -1))}>
            <ChevronLeft size={16} />
          </NavArrow>
          {showMonths ? (
            <span className="text-[15px] font-semibold">{format(cursor, 'yyyy')}</span>
          ) : (
            <button type="button" onClick={() => setLevel('months')} className={cn('rounded-lg px-2 py-0.5 text-[15px] font-semibold first-letter:uppercase', t.hover)} title="Choisir un autre mois">
              {format(cursor, 'LLLL yyyy', { locale: fr })}
            </button>
          )}
          <NavArrow t={t} label={showMonths ? 'Année suivante' : 'Mois suivant'} onClick={() => setCursor(showMonths ? addYears(cursor, 1) : addMonths(cursor, 1))}>
            <ChevronRight size={16} />
          </NavArrow>
        </div>

        {showMonths ? (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, m) => new Date(cursor.getFullYear(), m, 1)).map((month) => {
              const selected = mode === 'month' && isSameMonth(month, current)
              return (
                <button
                  key={month.getMonth()}
                  type="button"
                  onClick={() => {
                    if (mode === 'month') return pick(month)
                    // Semaine / jour : on descend dans le mois choisi pour affiner.
                    setCursor(month)
                    setLevel('days')
                  }}
                  className={cn(
                    'h-10 text-[13.5px] font-medium capitalize transition-colors',
                    t.radius,
                    selected ? t.selected : t.hover,
                    !selected && isSameMonth(month, new Date()) && t.current,
                  )}
                >
                  {format(month, 'LLL', { locale: fr }).replace('.', '')}
                </button>
              )
            })}
          </div>
        ) : (
          <div>
            <div className={cn('mb-1 grid grid-cols-7 text-center text-[11px]', t.weekday)}>
              {WEEKDAYS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              {monthWeeks(cursor).map((week) =>
                mode === 'week' ? (
                  <button
                    key={week[0].toISOString()}
                    type="button"
                    onClick={() => pick(week[0])}
                    className={cn(
                      'grid grid-cols-7 transition-colors',
                      t.radius,
                      isSameWeek(week[0], current, WEEK) ? t.week : t.hover,
                    )}
                    aria-label={`Semaine du ${format(week[0], 'd MMMM', { locale: fr })}`}
                  >
                    {week.map((day) => (
                      <DayNumber key={day.toISOString()} day={day} month={cursor} t={t} />
                    ))}
                  </button>
                ) : (
                  <div key={week[0].toISOString()} className="grid grid-cols-7">
                    {week.map((day) => {
                      const selected = isSameDay(day, current)
                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => pick(day)}
                          className={cn('flex justify-center transition-colors', t.radius, !selected && t.hover)}
                          aria-label={format(day, 'EEEE d MMMM', { locale: fr })}
                        >
                          <DayNumber day={day} month={cursor} selected={selected} t={t} />
                        </button>
                      )
                    })}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => pick(new Date())}
          className={cn('mt-2.5 w-full py-1.5 text-[13px] transition-colors', t.footer)}
        >
          {mode === 'month' ? 'Ce mois-ci' : mode === 'week' ? 'Cette semaine' : "Aujourd'hui"}
        </button>
      </Popover>
    </h2>
  )
}

function DayNumber({ day, month, selected, t }: { day: Date; month: Date; selected?: boolean; t: PickerTheme }) {
  return (
    <span
      className={cn(
        'mx-auto flex size-8 items-center justify-center text-[13px]',
        t.radius,
        selected ? cn(t.selected, 'font-semibold') : isSameMonth(day, month) ? 'font-medium' : 'text-[#b8b7c4]',
        !selected && isToday(day) && 'font-semibold text-accent ring-2 ring-accent/40 ring-inset',
      )}
    >
      {day.getDate()}
    </span>
  )
}

function NavArrow({ label, onClick, children, t }: { label: string; onClick: () => void; children: ReactNode; t: PickerTheme }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cn('flex size-8 items-center justify-center transition-colors', t.arrow)}>
      {children}
    </button>
  )
}
