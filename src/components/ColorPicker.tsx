import { Check, ChevronDown, Pipette } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { styleToCss } from '@/domain/style'
import type { StyleTarget } from '@/domain/types'
import { cn, isHex, PALETTE, PRESET_COLORS } from '@/lib/utils'
import { useTheme } from '@/store/appStore'
import { inputClass } from './ui/controls'

type EyeDropperCtor = new () => { open(): Promise<{ sRGBHex: string }> }
const EyeDropper = (globalThis as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper

const TARGETS: { value: StyleTarget; label: string }[] = [
  { value: 'label', label: 'Label' },
  { value: 'background', label: 'Fond' },
  { value: 'border', label: 'Bordure' },
]

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

interface Props {
  color: string
  onColorChange: (color: string) => void
  /** Si fourni : choix de la présentation (label / fond / bordure) appliquée aux tâches. */
  target?: StyleTarget
  onTargetChange?: (target: StyleTarget) => void
}

/**
 * Choix de couleur : 7 couleurs prédéfinies d'un clic, puis « Couleur personnalisée »
 * (palette Notion, roue, code HEX et pipette — calendrier.md l. 37), ouverte d'office si la couleur n'est pas prédéfinie.
 */
export function ColorPicker({ color, onColorChange, target, onTargetChange }: Props) {
  const journal = useTheme() === 'journal'
  const [hex, setHex] = useState(color)
  const [custom, setCustom] = useState(() => !PRESET_COLORS.some((p) => same(p.value, color)))
  useEffect(() => setHex(color), [color])

  const pickFromScreen = async () => {
    if (!EyeDropper) return
    try {
      const result = await new EyeDropper().open()
      onColorChange(result.sRGBHex.toUpperCase())
    } catch {
      /* sélection annulée */
    }
  }

  return (
    <div className="w-[248px] space-y-3 p-2">
      <div>
        <div className={cn('mb-1.5 text-xs font-medium', journal ? 'font-plate text-[#5B57A6]' : 'text-ink-2')}>Couleurs</div>
        <div className="flex justify-between">
          {PRESET_COLORS.map((p) => {
            const active = same(color, p.value)
            return (
              <button
                key={p.value}
                type="button"
                title={p.name}
                aria-label={p.name}
                aria-pressed={active}
                onClick={() => onColorChange(p.value)}
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-white transition-transform hover:scale-110',
                  active && (journal ? 'ring-2 ring-[#2F2B6E] ring-offset-2' : 'ring-2 ring-accent ring-offset-1'),
                )}
                style={{ background: p.value }}
              >
                {active && <Check size={14} strokeWidth={3} />}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCustom((v) => !v)}
        aria-expanded={custom}
        className={cn('flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium', journal ? 'font-plate text-[#5B57A6] hover:bg-[#F4F3FF]' : 'text-ink-2 hover:bg-hover')}
      >
        <span className="size-3.5 rounded-full border border-line" style={{ background: 'conic-gradient(#D44C47, #CB912F, #448361, #337EA9, #9065B0, #C14C8A, #D44C47)' }} />
        Couleur personnalisée
        <ChevronDown size={13} className={cn('ml-auto transition-transform', custom && 'rotate-180')} />
      </button>

      {custom && (
        <div className="space-y-3">
          <div className="grid grid-cols-10 gap-1">
            {PALETTE.map((p) => (
              <button
                key={p.value}
                type="button"
                title={p.name}
                onClick={() => onColorChange(p.value)}
                className={cn('size-5 rounded-full ring-offset-1 transition-transform hover:scale-110', same(color, p.value) && 'ring-2 ring-accent')}
                style={{ background: p.value }}
              />
            ))}
          </div>

          <HexColorPicker color={color} onChange={(c) => onColorChange(c.toUpperCase())} style={{ width: '100%', height: 130 }} />

          <div className="flex items-center gap-2">
            <span className="size-7 shrink-0 rounded-md border border-line" style={{ background: color }} />
            <input
              value={hex}
              onChange={(e) => {
                const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
                setHex(v)
                if (isHex(v)) onColorChange(v.toUpperCase())
              }}
              spellCheck={false}
              maxLength={7}
              aria-label="Code HEX"
              className={cn(inputClass, 'font-mono uppercase', !isHex(hex) && 'border-danger focus:border-danger')}
            />
            <button
              type="button"
              onClick={pickFromScreen}
              disabled={!EyeDropper}
              title={EyeDropper ? "Pipette : choisir une couleur à l'écran" : 'Pipette indisponible dans ce navigateur'}
              className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line hover:bg-hover disabled:opacity-40"
            >
              <Pipette size={15} />
            </button>
          </div>
        </div>
      )}

      {target && onTargetChange && <StyleTargetChoice color={color} target={target} onChange={onTargetChange} />}
    </div>
  )
}

/** Choix de la présentation (label / fond / bordure), avec un aperçu de tâche dans chaque bouton. */
export function StyleTargetChoice({ color, target, onChange, title = 'Appliquer la couleur au…' }: { color: string; target?: StyleTarget; onChange: (t: StyleTarget) => void; title?: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-ink-2">{title}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {TARGETS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn('flex flex-col items-center gap-1.5 rounded-md border p-1.5 text-xs transition-colors', target === t.value ? 'border-accent bg-accent-soft' : 'border-line hover:bg-hover')}
          >
            <span className="w-full truncate rounded border px-1 py-0.5 text-[11px] font-medium" style={styleToCss({ color, target: t.value })}>
              Tâche
            </span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
