import { useEffect, useRef, useState } from 'react'
import { dayRange } from '@/domain/dates'
import { buildEntries } from '@/domain/entries'
import { useIsMobile } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'

const IDLE_LINES = ['Tu gères ! ✨', 'Une petite pause ? ☕', 'Pense à boire de l’eau 💧', 'On avance bien 🐾', 'Coucou ! 👋', 'Je surveille le calendrier 👀', 'Bouh ! 👻']
/** Vitesse de vol (px / s) : lente, c'est un fantôme. */
const SPEED = 60
/** Temps de survol avant que le fantôme s'éloigne, pour ne jamais rester sur ce qu'on veut cliquer. */
const FLEE_MS = 1400

type Mood = 'idle' | 'happy' | 'surprised' | 'sleepy'
interface Point {
  x: number
  y: number
}

/**
 * Mascotte (calendrier.md l. 25) : un petit chat fantôme qui flotte partout sur l'écran,
 * fait des pauses, jette un œil depuis les bords, sursaute au survol puis s'éloigne,
 * et donne l'avancement du jour au clic. Seul le fantôme capte la souris (le reste laisse passer les clics).
 * Avec « réduire les animations », il reste sagement dans le coin en bas à droite.
 */
export function Mascot() {
  const show = useApp((s) => s.data.settings.showMascot)
  const journal = useTheme() === 'journal'
  const isMobile = useIsMobile()
  const size = isMobile ? 52 : 64

  const [pos, setPos] = useState<Point>(() => ({ x: window.innerWidth - 120, y: window.innerHeight - 120 }))
  const [duration, setDuration] = useState(0)
  const [facing, setFacing] = useState<1 | -1>(-1)
  const [tilt, setTilt] = useState(0)
  const [mood, setMood] = useState<Mood>('idle')
  const [hop, setHop] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)

  const posRef = useRef(pos)
  posRef.current = pos
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const fleeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wanderRef = useRef<() => void>(() => {})

  const say = (text: string) => {
    setBubble(text)
    setTimeout(() => setBubble((b) => (b === text ? null : b)), 3500)
  }

  useEffect(() => {
    if (!show) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    /** Prochaine destination : n'importe où, ou (parfois) à moitié cachée derrière un bord. */
    const pickTarget = (): Point => {
      const w = window.innerWidth
      const h = window.innerHeight
      const rand = (min: number, max: number) => min + Math.random() * Math.max(0, max - min)
      if (Math.random() < 0.15) {
        const side = Math.floor(Math.random() * 4)
        if (side === 0) return { x: -size * 0.45, y: rand(40, h - size - 40) }
        if (side === 1) return { x: w - size * 0.55, y: rand(40, h - size - 40) }
        if (side === 2) return { x: rand(40, w - size - 40), y: -size * 0.4 }
        return { x: rand(40, w - size - 40), y: h - size * 0.6 }
      }
      return { x: rand(16, w - size - 16), y: rand(16, h - size - 16) }
    }

    const wander = () => {
      clearTimeout(timer.current)
      const from = posRef.current
      const to = pickTarget()
      const ms = Math.max(1800, (Math.hypot(to.x - from.x, to.y - from.y) / SPEED) * 1000)
      const dir = to.x > from.x ? 1 : -1
      setFacing(dir)
      setTilt(dir * 7)
      setMood('idle')
      setDuration(ms)
      setPos(to)
      timer.current = setTimeout(() => {
        setTilt(0)
        const roll = Math.random()
        if (roll < 0.3) say(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)])
        else if (roll < 0.45) setMood('sleepy')
        timer.current = setTimeout(wander, 2500 + Math.random() * 5000)
      }, ms)
    }
    wanderRef.current = wander
    timer.current = setTimeout(wander, 2000)

    // Fenêtre redimensionnée : il revient dans l'écran.
    const onResize = () => {
      const { x, y } = posRef.current
      setDuration(400)
      setPos({ x: Math.min(x, window.innerWidth - size * 0.55), y: Math.min(y, window.innerHeight - size * 0.6) })
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer.current)
      clearTimeout(fleeTimer.current)
      window.removeEventListener('resize', onResize)
    }
  }, [show, size])

  const onEnter = () => {
    setMood('surprised')
    setHop(true)
    setTimeout(() => setHop(false), 550)
    clearTimeout(fleeTimer.current)
    fleeTimer.current = setTimeout(() => wanderRef.current(), FLEE_MS)
  }

  const onClick = () => {
    clearTimeout(fleeTimer.current)
    const data = useApp.getState().data
    const today = buildEntries(data, { range: dayRange(new Date()), respectSwitches: false }).filter((e) => e.done !== undefined)
    const left = today.filter((e) => !e.done).length
    setMood('happy')
    say(today.length === 0 ? 'Rien de prévu aujourd’hui 🌿' : left === 0 ? 'Tout est fait aujourd’hui ! 🎉' : `Encore ${left} chose${left > 1 ? 's' : ''} à faire aujourd’hui 💪`)
    fleeTimer.current = setTimeout(() => wanderRef.current(), 3200)
  }

  if (!show) return null

  // La bulle reste dans l'écran : sous le fantôme s'il est tout en haut, alignée sur le bord le plus proche.
  const below = pos.y < 90
  const align = pos.x < 110 ? 'left-0' : pos.x > window.innerWidth - 180 ? 'right-0' : 'left-1/2 -translate-x-1/2'

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-20"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transition: `transform ${duration}ms ease-in-out` }}
    >
      {bubble && (
        <div
          className={cn(
            'absolute w-max max-w-[220px] animate-pop px-3 py-1.5 text-[13px]',
            below ? 'top-full mt-2' : 'bottom-full mb-2',
            align,
            journal ? 'rounded-2xl border-2 border-[#A3A8EE] bg-white font-plate font-medium text-[#2F2B6E] shadow-[0_4px_0_#DCDDFF]' : 'rounded-xl bg-white shadow-pop',
          )}
        >
          {bubble}
        </div>
      )}
      <button
        type="button"
        aria-label="Mascotte : avancement du jour"
        onClick={onClick}
        onMouseEnter={onEnter}
        className={cn('pointer-events-auto block cursor-pointer', hop && 'mascot-hop')}
        style={{ width: size, height: size * 1.05 }}
      >
        <span className="mascot-float block size-full" style={{ ['--mascot-tilt' as string]: `${tilt}deg` }}>
          <GhostCat mood={mood} facing={facing} />
        </span>
      </button>
    </div>
  )
}

/** Petit chat fantôme lavande (dessin original), avec ses quatre humeurs. */
function GhostCat({ mood, facing }: { mood: Mood; facing: 1 | -1 }) {
  const ink = '#2F2B6E'
  return (
    <svg
      viewBox="0 0 80 84"
      className="size-full overflow-visible"
      style={{ transform: `scaleX(${facing})`, filter: 'drop-shadow(0 0 6px rgb(163 168 238 / 75%)) drop-shadow(0 8px 10px rgb(47 43 110 / 14%))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ghost-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E2DEFF" />
          <stop offset="1" stopColor="#FBFAFF" />
        </linearGradient>
        <radialGradient id="ghost-glow" cx="0.5" cy="0.45" r="0.45">
          <stop offset="0" stopColor="#9C94F0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#9C94F0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Corps : tête ronde, oreilles de chat, bas ondulé de fantôme */}
      <path
        d="M14 44 C13 34 15 26 19 21 L20 10 Q21 6 24 8 L32 15 C37 14 43 14 48 15 L56 8 Q59 6 60 10 L61 21 C65 26 67 34 66 44 L66 64 Q61 76 54 69 Q47 77 40 69 Q33 77 26 69 Q19 76 14 64 Z"
        fill="url(#ghost-body)"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <ellipse cx="40" cy="40" rx="24" ry="20" fill="url(#ghost-glow)" />
      {/* Intérieur des oreilles */}
      <path d="M22 12 L26.5 17.5 L22.5 19 Z" fill="#F7C9DE" />
      <path d="M58 12 L53.5 17.5 L57.5 19 Z" fill="#F7C9DE" />

      {/* Yeux selon l'humeur */}
      {mood === 'happy' ? (
        <g stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M27.5 43 q3.5 -4.5 7 0" />
          <path d="M45.5 43 q3.5 -4.5 7 0" />
        </g>
      ) : mood === 'sleepy' ? (
        <g stroke={ink} strokeWidth="2" strokeLinecap="round">
          <path d="M27.5 42.5 h7" />
          <path d="M45.5 42.5 h7" />
        </g>
      ) : mood === 'surprised' ? (
        <g>
          <circle cx="31" cy="41.5" r="4" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" />
          <circle cx="49" cy="41.5" r="4" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" />
          <circle cx="31" cy="41.5" r="1.4" fill={ink} />
          <circle cx="49" cy="41.5" r="1.4" fill={ink} />
        </g>
      ) : (
        <g>
          <g className="mascot-eye">
            <ellipse cx="31" cy="42" rx="2.8" ry="3.6" fill={ink} />
            <circle cx="32" cy="40.6" r="1" fill="#FFFFFF" />
          </g>
          <g className="mascot-eye">
            <ellipse cx="49" cy="42" rx="2.8" ry="3.6" fill={ink} />
            <circle cx="50" cy="40.6" r="1" fill="#FFFFFF" />
          </g>
        </g>
      )}

      {/* Joues */}
      <ellipse cx="24.5" cy="48.5" rx="4.2" ry="2.5" fill="#F7B5D6" opacity="0.85" />
      <ellipse cx="55.5" cy="48.5" rx="4.2" ry="2.5" fill="#F7B5D6" opacity="0.85" />

      {/* Bouche */}
      {mood === 'surprised' ? (
        <ellipse cx="40" cy="49.5" rx="1.8" ry="2.2" fill={ink} />
      ) : mood === 'happy' ? (
        <path d="M37 47.5 q3 4 6 0 Z" fill="#E86AAE" stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
      ) : (
        <path d="M37 47.5 q1.5 1.8 3 0 q1.5 1.8 3 0" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
      )}

      {/* Endormi : petits « z » */}
      {mood === 'sleepy' && (
        <g fill={ink} fontFamily="Fredoka, ui-rounded, sans-serif" fontWeight="600" style={{ transform: `scaleX(${facing})`, transformOrigin: '64px 10px' }}>
          <text x="62" y="12" fontSize="9">z</text>
          <text x="69" y="5" fontSize="6">z</text>
        </g>
      )}
    </svg>
  )
}
