import { Check, Minus } from 'lucide-react'
import { useId, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/appStore'

/** Switch avec un état « partiel » (catégorie dont seules certaines sous-catégories sont actives). */
export function Switch({
  checked,
  onChange,
  label,
  size = 'md',
  tone = 'accent',
  color,
  hint,
  nativeHint,
}: {
  checked: boolean | 'partial'
  onChange: (value: boolean) => void
  label?: string
  size?: 'sm' | 'md'
  /** `ink` : noir, pour l'affichage « Cartes douces ». */
  tone?: 'accent' | 'ink'
  /** Couleur libre (celle de la catégorie), prioritaire sur `tone`. */
  color?: string
  /** Bulle d'aide affichée au survol. */
  hint?: string
  /** Info-bulle native du navigateur (pour les zones étroites qui couperaient la bulle). */
  nativeHint?: boolean
}) {
  const hintId = useId()
  const on = checked !== false
  const colors = tone === 'ink' ? ['bg-[#1D1B22]', 'bg-[#8E8B97]'] : ['bg-accent', 'bg-[#8fbdee]']
  const customBg = color && checked !== false ? (checked === true ? color : `color-mix(in srgb, ${color} 45%, white)`) : undefined

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked === 'partial' ? 'mixed' : checked}
      aria-label={label}
      aria-describedby={hint && !nativeHint ? hintId : undefined}
      title={nativeHint ? hint : undefined}
      onClick={(e) => {
        e.stopPropagation()
        onChange(checked !== true)
      }}
      style={customBg ? { background: customBg } : undefined}
      className={cn(
        'relative shrink-0 rounded-full transition-colors',
        size === 'md' ? 'h-4 w-7' : 'h-3.5 w-6',
        !customBg && (checked === true ? colors[0] : checked === 'partial' ? colors[1] : 'bg-[#d3d1cb]'),
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 rounded-full bg-white shadow-sm transition-all',
          size === 'md' ? 'size-3' : 'size-2.5',
          checked === 'partial' ? 'left-1/2 -translate-x-1/2' : on ? (size === 'md' ? 'left-3.5' : 'left-3') : 'left-0.5',
        )}
      />
    </button>
  )
  if (!hint || nativeHint) return button
  return (
    <span className="group/sw relative inline-flex shrink-0">
      {button}
      <span
        id={hintId}
        role="tooltip"
        className="pointer-events-none absolute right-0 bottom-full z-30 mb-2 w-max max-w-[260px] rounded-md bg-[#2F2E2B] px-2.5 py-1.5 text-left text-xs leading-snug font-normal text-white opacity-0 shadow-pop transition-opacity group-hover/sw:opacity-100 group-hover/sw:delay-300"
      >
        {hint}
      </span>
    </span>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
  partial,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
  className?: string
  partial?: boolean
}) {
  const stop = (e: MouseEvent) => e.stopPropagation()
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={partial ? 'mixed' : checked}
      aria-label={label}
      onMouseDown={stop}
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors',
        checked || partial ? 'border-accent bg-accent text-white' : 'border-[#c7c6c4] bg-white hover:bg-hover',
        className,
      )}
    >
      {partial ? <Minus size={11} strokeWidth={3} /> : checked && <Check size={11} strokeWidth={3} />}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  className?: string
}) {
  const journal = useTheme() === 'journal'
  return (
    <div className={cn('inline-flex', journal ? 'rounded-full border-2 border-[#A3A8EE] bg-[#F4F3FF] p-[3px] font-plate' : 'rounded-md bg-hover p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'text-[13px] transition-colors',
            journal ? 'rounded-full px-3 py-0.5' : 'rounded-[5px] px-2.5 py-0.5 font-medium',
            value === o.value
              ? journal
                ? 'bg-white font-semibold text-[#2F2B6E] shadow-[0_2px_0_#DCDDFF]'
                : 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/10%)]'
              : journal
                ? 'font-medium text-[#5B57A6] hover:text-[#2F2B6E]'
                : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const inputClass =
  'h-8 w-full rounded-md border border-line bg-white px-2 text-sm outline-none transition-shadow placeholder:text-ink-3 focus:border-accent focus:shadow-[0_0_0_3px_rgb(35_131_226/15%)]'

/** Ligne « propriété » façon Notion : libellé à gauche, valeur à droite. */
export function PropertyRow({ label, icon, children, className }: { label: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-8 items-start gap-2 py-1', className)}>
      <div className="flex w-36 shrink-0 items-center gap-1.5 pt-1 text-[13px] text-ink-2 [&>svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
