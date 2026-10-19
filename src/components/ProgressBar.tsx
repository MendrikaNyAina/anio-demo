import type { CSSProperties } from 'react'
import type { Progress } from '@/domain/progress'
import { tint } from '@/domain/style'
import type { ProgressStyle } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'

// Barres de progression dans l'univers du titre de page (JournalTitle) : bordure lavande, encre bleu nuit,
// stickers. Les couleurs de catégorie sont pastélisées (mélangées au blanc, comme partout ailleurs).
// Trois styles au choix dans les Paramètres : pilules (10.jpg), fiole (11.jpg), ruban (12.jpg).
// `lg` = barre du calendrier, avec ses décorations ; `sm` = version compacte (cartes, fiches, Bilan).

const LINE = '#A3A8EE'
const INK = '#2F2B6E'
const NEUTRAL = '#9B9A97'
const fill = (color: string) => tint(color, 50)
const deep = (color: string) => tint(color, 70)
const GLOSS = 'linear-gradient(to bottom, rgb(255 255 255 / 55%) 0 32%, transparent 32%)'

const paper = (size: number): CSSProperties => ({
  backgroundColor: '#F4F3FF',
  backgroundImage: 'linear-gradient(rgb(140 146 232 / 18%) 1px, transparent 1px), linear-gradient(90deg, rgb(140 146 232 / 18%) 1px, transparent 1px)',
  backgroundSize: `${size}px ${size}px`,
})

export type ProgressSize = 'sm' | 'lg'

interface BarProps {
  progress: Progress
  size: ProgressSize
}

export function ProgressBar({ progress, size = 'sm', variant, className }: { progress: Progress; size?: ProgressSize; variant?: ProgressStyle; className?: string }) {
  const setting = useApp((s) => s.data.settings.progressStyle)
  const theme = useTheme()
  const style = variant ?? setting ?? 'pills'
  // Thème Notion : une seule barre sobre, segmentée par couleur (les trois styles appartiennent au thème journal).
  const Bar = theme === 'notion' && !variant ? FlatBar : style === 'potion' ? PotionBar : style === 'ribbon' ? RibbonBar : PillsBar
  return (
    <div role="img" aria-label={`${progress.done} tâche${progress.done > 1 ? 's' : ''} terminée${progress.done > 1 ? 's' : ''} sur ${progress.total}`} className={cn('w-full', className)}>
      <Bar progress={progress} size={size} />
    </div>
  )
}

export const percent = (p: Progress) => (p.total === 0 ? 0 : Math.round((p.done / p.total) * 100))

const ratioOf = (p: Progress) => (p.total === 0 ? 0 : p.done / p.total)

/** Position du bout de la progression dans une piste qui a `pad` px de marge de chaque côté. */
const tipLeft = (ratio: number, pad: number) => `calc(${pad}px + ${ratio} * (100% - ${pad * 2}px))`

// ── Notion · barre segmentée sobre (style Tetrisly) ─────────────

function FlatBar({ progress, size }: BarProps) {
  return (
    <div className={cn('flex w-full gap-[2px] overflow-hidden rounded-full bg-[#ecebe9]', size === 'lg' ? 'h-2.5' : 'h-2')}>
      <Segments progress={progress} background={fill} rounded />
    </div>
  )
}

// ── A · Pilules ─────────────────────────────────────────────────

/** Une pilule par tâche ; au-delà de `max`, chaque pilule représente plusieurs tâches. */
function pillColors(progress: Progress, max: number): (string | null)[] {
  const n = progress.total === 0 ? Math.min(12, max) : Math.min(progress.total, max)
  const filled = Math.round(ratioOf(progress) * n)
  return Array.from({ length: n }, (_, i) => {
    if (i >= filled) return null
    // Couleur de la tâche qui tombe au milieu de la pilule.
    const pos = ((i + 0.5) / n) * progress.total
    let acc = 0
    for (const s of progress.segments) {
      acc += s.count
      if (pos < acc) return s.color
    }
    return progress.segments.at(-1)?.color ?? NEUTRAL
  })
}

function PillsBar({ progress, size }: BarProps) {
  const lg = size === 'lg'
  const pills = pillColors(progress, lg ? 60 : 24).map((color, i) => (
    <span
      key={i}
      className="min-w-0 flex-1 rounded-full transition-colors duration-500"
      style={{ background: color ? fill(color) : '#F1F0FD', boxShadow: `inset 0 0 0 1.5px ${color ? deep(color) : '#E3E2F8'}` }}
    />
  ))
  if (!lg) return <div className="flex h-2.5 gap-[3px]">{pills}</div>

  const ratio = ratioOf(progress)
  return (
    <div className="relative">
      {progress.done > 0 && (
        <>
          <svg width="40" height="16" viewBox="0 0 40 16" aria-hidden="true" className="absolute -top-[22px] transition-[left] duration-500" style={{ left: `calc(${tipLeft(ratio, 12)} - 46px)` }}>
            <path d="M2 12c5-7 9 3 14-3s8 1 12-5 7 0 10-2" fill="none" stroke="#9E8CF0" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 5" />
          </svg>
          <Star size={28} className="absolute -top-[34px] -translate-x-1/2 -rotate-[10deg] transition-[left] duration-500" style={{ left: tipLeft(ratio, 12) }} />
        </>
      )}
      <div className="flex h-11 gap-1 rounded-full border-2 bg-white px-3 py-2" style={{ borderColor: LINE, boxShadow: '0 4px 0 #DCDDFF, inset 0 2px 4px rgb(47 43 110 / 6%)' }}>
        {pills}
      </div>
    </div>
  )
}

// ── B · Fiole ───────────────────────────────────────────────────

function Segments({ progress, background, rounded }: { progress: Progress; background: (color: string) => string; rounded?: boolean }) {
  return progress.total === 0
    ? null
    : progress.segments.map((s) => (
        <span key={s.color} className={cn('h-full shrink-0 transition-[width] duration-500', rounded && 'first:rounded-l-full')} style={{ width: `${(s.count / progress.total) * 100}%`, background: background(s.color) }} />
      ))
}

/** Étincelles de la fiole : position relative dans la partie remplie, hauteur, taille. */
const SPARKLES = [
  { at: 0.15, top: 12, size: 10 },
  { at: 0.5, top: 4, size: 7 },
  { at: 0.8, top: 14, size: 8 },
]

const glossy = (color: string) => `${GLOSS}, ${fill(color)}`

function PotionBar({ progress, size }: BarProps) {
  if (size === 'sm') {
    return (
      <div className="h-3.5 rounded-full border-[1.5px] bg-white p-[2px]" style={{ borderColor: LINE }}>
        <div className="flex h-full overflow-hidden rounded-full" style={paper(6)}>
          <Segments progress={progress} background={glossy} />
        </div>
      </div>
    )
  }

  const ratio = ratioOf(progress)
  return (
    <div className="flex items-center">
      {/* La bulle se remplit au même niveau que la barre */}
      <div className="relative z-[2] flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-white" style={{ borderColor: LINE, boxShadow: '0 4px 0 #DCDDFF' }}>
        <span aria-hidden className="absolute inset-x-0 bottom-0 border-t-2 border-white transition-[height] duration-500" style={{ height: `${Math.max(ratio, 0.06) * 100}%`, background: tint('#9E8CF0', 50) }} />
        <span aria-hidden className="absolute top-2 left-3 h-2 w-4 -rotate-[28deg] rounded-[50%] border-t-[3px] border-[#E6E5FB]" />
        <span className="relative font-plate text-lg leading-none font-semibold" style={{ color: INK }}>
          {percent(progress)}
          <span className="text-[11px]">%</span>
        </span>
      </div>
      <Star size={18} className="relative z-[3] -mt-14 -ml-5 rotate-12" />
      <div className="relative z-[1] -ml-1 h-9 min-w-0 flex-1 rounded-r-2xl border-[2.5px] border-l-0 bg-white py-1 pr-1.5" style={{ borderColor: LINE, boxShadow: '0 4px 0 #DCDDFF' }}>
        <div className="relative flex h-full overflow-hidden rounded-r-[11px]" style={paper(12)}>
          <Segments progress={progress} background={glossy} />
          {progress.done > 0 && <span aria-hidden className="h-full w-[3px] shrink-0 bg-white" />}
          {/* Étincelles, réparties dans la partie remplie */}
          {progress.done > 0 &&
            SPARKLES.map((s) => <Sparkle key={s.at} size={s.size} className="absolute" style={{ top: s.top, left: `calc(${s.at * ratio * 100}% - 4px)` }} />)}
        </div>
      </div>
    </div>
  )
}

// ── C · Ruban ───────────────────────────────────────────────────

const chamfer = (px: number) => `polygon(${px}px 0, calc(100% - ${px}px) 0, 100% 50%, calc(100% - ${px}px) 100%, ${px}px 100%, 0 50%)`
const stripes = (stripe: number) => (color: string) => `repeating-linear-gradient(-45deg, ${fill(color)} 0 ${stripe}px, ${deep(color)} ${stripe}px ${stripe * 2}px)`

function RibbonBar({ progress, size }: BarProps) {
  const lg = size === 'lg'
  const tip = lg ? 12 : 6
  const ribbon = (
    <div className={cn('relative', lg ? 'h-7' : 'h-3')} style={{ background: LINE, clipPath: chamfer(tip) }}>
      <div className="absolute flex bg-[#ECEBFF]" style={{ inset: lg ? 2.5 : 1.5, clipPath: chamfer(tip - 2) }}>
        <Segments progress={progress} background={stripes(lg ? 7 : 4)} />
      </div>
    </div>
  )
  if (!lg) return ribbon

  const at = (dx: number) => `calc(${tipLeft(ratioOf(progress), tip)} + ${dx}px)`
  return (
    <div className="relative">
      {ribbon}
      {progress.done > 0 && (
        <div aria-hidden>
          <Flower size={32} petal="#F9C6DD" className="absolute -top-1 -translate-x-1/2 rotate-[18deg]" style={{ left: at(0) }} />
          <Flower size={15} petal="#DCDDFF" heart="#FFFFFF" className="absolute -top-5 -rotate-[20deg]" style={{ left: at(-34) }} />
          <Star size={16} className="absolute top-8 rotate-[8deg]" style={{ left: at(-56) }} />
          <Flower size={12} petal="#F9C6DD" className="absolute top-9 -rotate-12" style={{ left: at(20) }} />
        </div>
      )}
    </div>
  )
}

// ── Stickers ────────────────────────────────────────────────────

type StickerProps = { size: number; className?: string; style?: CSSProperties }

function Star({ size, className, style }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={cn('pointer-events-none', className)} style={style}>
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" fill="#FFE08A" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function Sparkle({ size, className, style }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" className={cn('pointer-events-none', className)} style={style}>
      <path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" fill="#FFFFFF" />
    </svg>
  )
}

function Flower({ size, petal, heart = '#FFE08A', className, style }: StickerProps & { petal: string; heart?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={cn('pointer-events-none', className)} style={style}>
      <g fill={petal} stroke={INK} strokeWidth="1.4">
        <circle cx="12" cy="6" r="4.2" />
        <circle cx="17.7" cy="10.2" r="4.2" />
        <circle cx="15.5" cy="17" r="4.2" />
        <circle cx="8.5" cy="17" r="4.2" />
        <circle cx="6.3" cy="10.2" r="4.2" />
      </g>
      <circle cx="12" cy="12" r="3" fill={heart} stroke={INK} strokeWidth="1.4" />
    </svg>
  )
}
