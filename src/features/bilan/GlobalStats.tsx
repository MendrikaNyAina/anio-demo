import { useMemo, useState } from 'react'
import { fromKey } from '@/domain/dates'
import { fmtDay } from '@/domain/display'
import { globalStats, type GlobalStats as Stats } from '@/domain/stats'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'

// Chiffres globaux du Bilan (tâches complétées, catégories, projets) et courbe de complétion sur 30 jours.

const DAYS = 30

export function useGlobalStats(): Stats {
  const data = useApp((s) => s.data)
  return useMemo(() => globalStats(data, new Date(), DAYS), [data])
}

/** Tuiles de chiffres. */
export function StatsGrid({ stats }: { stats: Stats }) {
  const journal = useTheme() === 'journal'
  const tiles: { value: string | number; label: string }[] = [
    { value: stats.completed, label: 'tâches complétées' },
    { value: stats.completedRecent, label: `complétées en ${DAYS} jours` },
    { value: stats.categories, label: 'catégories' },
    { value: stats.subcategories, label: 'sous-catégories' },
    { value: stats.projects, label: 'projets' },
    { value: `${stats.projectsDone} / ${stats.projects}`, label: 'projets terminés' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className={journal ? 'rounded-lg bg-sidebar px-3 py-2.5' : 'rounded-lg border border-line px-4 py-3'}>
          <div className={cn('leading-none font-semibold tabular-nums', journal ? 'text-2xl' : 'text-xl')}>{t.value}</div>
          <div className="mt-1 text-xs text-ink-2">{t.label}</div>
        </div>
      ))}
    </div>
  )
}

const W = 600
const H = 160
const PAD_TOP = 12

/**
 * Courbe de complétion : tâches cochées par jour (d'après leur date de fin).
 * Une seule série, donc pas de légende : le titre la nomme. Survol : repère vertical et infobulle.
 */
export function CompletionCurve({ curve }: { curve: Stats['curve'] }) {
  const journal = useTheme() === 'journal'
  const [hover, setHover] = useState<number | null>(null)
  const color = journal ? '#8C92E8' : '#2383E2'
  const max = Math.max(1, ...curve.map((c) => c.count))
  // Graduation entière et lisible : 1, 2, 5, 10…
  const top = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50].find((n) => n >= max) ?? Math.ceil(max / 10) * 10
  const x = (i: number) => (curve.length === 1 ? W / 2 : (i / (curve.length - 1)) * W)
  const y = (v: number) => PAD_TOP + (1 - v / top) * (H - PAD_TOP)
  const line = curve.map((c, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(c.count).toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const total = curve.reduce((n, c) => n + c.count, 0)
  const ticks = [0, Math.round(top / 2), top]
  const point = hover === null ? null : curve[hover]

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">Tâches complétées par jour</span>
        <span className="text-xs text-ink-3">{total} sur les {DAYS} derniers jours</span>
      </figcaption>
      <div className="flex gap-2">
        {/* Axe des valeurs */}
        <div className="relative w-6 shrink-0 text-right text-[11px] text-ink-3 tabular-nums" style={{ height: H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: y(t) }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: H }} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            {ticks.map((t) => (
              <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} stroke="#E9E9E7" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray={t === 0 ? undefined : '3 3'} />
            ))}
            <path d={area} fill={color} fillOpacity={0.12} />
            <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="#9B9A97" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          </svg>
          {point && (
            <>
              <span
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                style={{ left: `${(x(hover!) / W) * 100}%`, top: y(point.count), background: color }}
              />
              <div
                role="tooltip"
                className="pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-md bg-[#2F2E2B] px-2 py-1 text-xs text-white shadow-pop"
                style={{ left: `clamp(48px, ${(x(hover!) / W) * 100}%, calc(100% - 48px))`, top: Math.max(0, y(point.count) - 40) }}
              >
                <span className="font-semibold tabular-nums">{point.count}</span> le {fmtDay(fromKey(point.day))}
              </div>
            </>
          )}
          {/* Zones de survol, une par jour, plus larges que le point */}
          {curve.map((c, i) => (
            <div
              key={c.day}
              className="absolute inset-y-0 -translate-x-1/2"
              style={{ left: `${(x(i) / W) * 100}%`, width: `${100 / Math.max(1, curve.length - 1)}%` }}
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-8 text-[11px] text-ink-3">
        <span>{fmtDay(fromKey(curve[0].day))}</span>
        <span>{fmtDay(fromKey(curve[Math.floor(curve.length / 2)].day))}</span>
        <span>aujourd'hui</span>
      </div>
      {/* Vue tableau pour les lecteurs d'écran */}
      <table className="sr-only">
        <caption>Tâches complétées par jour</caption>
        <tbody>
          {curve.map((c) => (
            <tr key={c.day}>
              <th scope="row">{fmtDay(fromKey(c.day))}</th>
              <td>{c.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
