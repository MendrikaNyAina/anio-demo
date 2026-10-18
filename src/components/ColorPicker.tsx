import { Pipette } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { styleToCss } from '@/domain/style'
import type { StyleTarget } from '@/domain/types'
import { cn, isHex, PALETTE } from '@/lib/utils'
import { inputClass } from './ui/controls'

type EyeDropperCtor = new () => { open(): Promise<{ sRGBHex: string }> }
const EyeDropper = (globalThis as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper

const TARGETS: { value: StyleTarget; label: string }[] = [
  { value: 'label', label: 'Label' },
  { value: 'background', label: 'Fond' },
  { value: 'border', label: 'Bordure' },
]

interface Props {
  color: string
  onColorChange: (color: string) => void
  /** Si fourni : choix de la présentation (label / fond / bordure) appliquée aux tâches. */
  target?: StyleTarget
  onTargetChange?: (target: StyleTarget) => void
}

/** Vrai choix de couleur : palette, roue, code HEX et pipette (calendrier.md l. 37). */
export function ColorPicker({ color, onColorChange, target, onTargetChange }: Props) {
  const [hex, setHex] = useState(color)
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
      <div className="grid grid-cols-10 gap-1">
        {PALETTE.map((p) => (
          <button
            key={p.value}
            type="button"
            title={p.name}
            onClick={() => onColorChange(p.value)}
            className={cn('size-5 rounded-full ring-offset-1 transition-transform hover:scale-110', color.toLowerCase() === p.value.toLowerCase() && 'ring-2 ring-accent')}
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

      {target && onTargetChange && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-ink-2">Appliquer la couleur au…</div>
          <div className="grid grid-cols-3 gap-1.5">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onTargetChange(t.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border p-1.5 text-xs transition-colors',
                  target === t.value ? 'border-accent bg-accent-soft' : 'border-line hover:bg-hover',
                )}
              >
                <span className="w-full truncate rounded border px-1 py-0.5 text-[11px] font-medium" style={styleToCss({ color, target: t.value })}>
                  Tâche
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
