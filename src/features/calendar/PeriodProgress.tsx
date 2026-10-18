import { percent, ProgressBar } from '@/components/ProgressBar'
import type { Entry } from '@/domain/entries'
import { weekProgress } from '@/domain/progress'
import { useApp, useTheme } from '@/store/appStore'

/**
 * Progression des tâches de la période affichée (calendrier.md l. 68) : la semaine en vue semaine,
 * le jour en vue jour. Une couleur par catégorie terminée ; les événements ne comptent pas.
 */
export function PeriodProgress({ entries, period }: { entries: Entry[]; period: 'week' | 'day' }) {
  const progress = weekProgress(entries)
  // La fiole affiche déjà le pourcentage dans sa bulle.
  const progressStyle = useApp((s) => s.data.settings.progressStyle)
  const journal = useTheme() === 'journal'
  const label = period === 'week' ? 'de la semaine' : 'du jour'
  const bar = (
    <div className="min-w-[220px] flex-1" title="Une couleur par catégorie terminée. Les événements ne comptent pas.">
      <ProgressBar progress={progress} size="lg" />
    </div>
  )

  if (!journal) {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-3 sm:px-6">
        <div className="shrink-0">
          <div className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">Progression {label}</div>
          <div className="text-lg leading-tight font-semibold tabular-nums">
            {percent(progress)} %<span className="ml-1.5 text-[13px] font-normal text-ink-2">{progress.done} / {progress.total} terminées</span>
          </div>
        </div>
        {bar}
      </div>
    )
  }

  const showPercent = progressStyle !== 'potion'

  // pt-8 : place pour les stickers posés au-dessus de la barre (étoile, fleurs).
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-6 px-4 pt-8 pb-4 font-plate text-[#2F2B6E] sm:px-6">
      <div className="flex shrink-0 flex-col items-start gap-1.5">
        <span className="inline-flex h-6 -rotate-2 items-center rounded-full border-2 border-[#A3A8EE] bg-[#DCDDFF] px-2.5 text-xs font-semibold">
          progression {label}
        </span>
        <div className="flex items-baseline gap-2 pl-0.5">
          {showPercent && <span className="text-[26px] leading-none font-semibold tabular-nums">{percent(progress)} %</span>}
          <span className="text-sm font-medium text-[#5B57A6]">
            {progress.done} / {progress.total} terminée{progress.done > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      {bar}
    </div>
  )
}
