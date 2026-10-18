import { HugeiconsIcon } from '@hugeicons/react'
import { ImagePlus, Search, Smile } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { IconRef } from '@/domain/types'
import { hugeiconLabel, useHugeicons } from '@/lib/hugeicons'
import { cn, pickFile, readImageAsDataUrl } from '@/lib/utils'
import { EMOJI_GROUPS } from '@/mock/emojis'
import { useApp } from '@/store/appStore'
import { IconView } from './IconView'
import { Segmented } from './ui/controls'
import { Popover } from './ui/popover'

/** Contenu du sélecteur : emojis, ou icônes importées dans la page Icônes. */
export function IconPickerPanel({ value, onChange, color }: { value?: IconRef; onChange: (icon: IconRef | undefined) => void; color?: string }) {
  const icons = useApp((s) => s.data.icons)
  const addIcon = useApp((s) => s.addIcon)
  const [tab, setTab] = useState<'emoji' | 'hugeicon' | 'image'>(value?.type ?? 'emoji')

  const importIcon = async () => {
    const file = await pickFile('image/png,image/jpeg,image/webp,image/svg+xml')
    if (!file) return
    const dataUrl = await readImageAsDataUrl(file, 128)
    const id = addIcon(file.name.replace(/\.[^.]+$/, ''), dataUrl)
    onChange({ type: 'image', iconId: id })
  }

  return (
    <div className="w-[320px]">
      <div className="flex items-center justify-between gap-2 border-b border-line p-1.5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'emoji', label: 'Emojis' },
            { value: 'hugeicon', label: 'Hugeicons' },
            { value: 'image', label: 'Mes icônes' },
          ]}
        />
        <button type="button" onClick={() => onChange(undefined)} className="rounded-md px-2 py-0.5 text-[13px] text-ink-2 hover:bg-hover">
          Retirer
        </button>
      </div>
      <div className="max-h-[260px] overflow-y-auto p-1.5">
        {tab === 'emoji' &&
          EMOJI_GROUPS.map((g) => (
            <div key={g.name} className="mb-2">
              <div className="px-1 pb-1 text-[11px] font-medium text-ink-3">{g.name}</div>
              <div className="grid grid-cols-10">
                {g.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => onChange({ type: 'emoji', value: e })}
                    className={cn('flex size-7 items-center justify-center rounded text-lg hover:bg-hover', value?.type === 'emoji' && value.value === e && 'bg-accent-soft')}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        {tab === 'hugeicon' && <HugeiconsGrid selected={value?.type === 'hugeicon' ? value.name : undefined} color={color} onPick={(name) => onChange({ type: 'hugeicon', name })} />}
        {tab === 'image' && (
          <div className="grid grid-cols-6 gap-1">
            {icons.map((icon) => (
              <button
                key={icon.id}
                type="button"
                title={icon.name}
                onClick={() => onChange({ type: 'image', iconId: icon.id })}
                className={cn('flex size-11 items-center justify-center rounded-md hover:bg-hover', value?.type === 'image' && value.iconId === icon.id && 'bg-accent-soft')}
              >
                {/* Un SVG s'affiche déjà dans la couleur de la catégorie qu'on modifie. */}
                <IconView icon={{ type: 'image', iconId: icon.id }} size={28} color={color} className="rounded object-cover" />
              </button>
            ))}
            <button
              type="button"
              onClick={importIcon}
              title="Importer une image"
              className="flex size-11 items-center justify-center rounded-md border border-dashed border-[#d3d1cb] text-ink-3 hover:bg-hover hover:text-ink"
            >
              <ImagePlus size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Résultats affichés à la fois : au-delà, on invite à préciser la recherche (le jeu compte ~6 000 icônes). */
const HUGEICONS_SHOWN = 120

/** Onglet Hugeicons : recherche par nom, icônes dessinées dans la couleur de la catégorie. */
function HugeiconsGrid({ selected, color, onPick }: { selected?: string; color?: string; onPick: (name: string) => void }) {
  const icons = useHugeicons()
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    if (!icons) return []
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const all = [...icons.keys()]
    return words.length === 0 ? all : all.filter((name) => words.every((w) => hugeiconLabel(name).toLowerCase().includes(w)))
  }, [icons, query])

  if (!icons) return <p className="px-1 py-6 text-center text-[13px] text-ink-3">Chargement des icônes…</p>

  return (
    <div>
      <label className="mb-1.5 flex h-8 items-center gap-1.5 rounded-md border border-line px-2 focus-within:border-accent">
        <Search size={14} className="shrink-0 text-ink-3" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (en anglais : home, book, star…)"
          aria-label="Rechercher une icône Hugeicons"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
      </label>
      <div className="grid grid-cols-8 gap-0.5">
        {matches.slice(0, HUGEICONS_SHOWN).map((name) => (
          <button
            key={name}
            type="button"
            title={hugeiconLabel(name)}
            aria-label={hugeiconLabel(name)}
            onClick={() => onPick(name)}
            className={cn('flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-hover', selected === name && 'bg-accent-soft')}
          >
            <HugeiconsIcon icon={icons.get(name)!} size={20} color={color ?? 'currentColor'} strokeWidth={1.8} />
          </button>
        ))}
      </div>
      <p className="px-1 pt-1.5 text-[11px] text-ink-3">
        {matches.length === 0
          ? 'Aucune icône ne correspond.'
          : matches.length > HUGEICONS_SHOWN
            ? `${HUGEICONS_SHOWN} sur ${matches.length} : précise la recherche pour trouver la bonne.`
            : `${matches.length} icône${matches.length > 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

/** Icône cliquable qui ouvre le sélecteur (comme dans Notion). */
export function IconPicker({
  icon,
  onChange,
  size = 18,
  emptyLabel,
  trigger,
  color,
}: {
  icon?: IconRef
  /** Couleur de la catégorie : une icône SVG la prend. */
  color?: string
  onChange: (icon: IconRef | undefined) => void
  size?: number
  emptyLabel?: string
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="p-0"
      trigger={
        trigger ?? (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex shrink-0 items-center justify-center rounded-md p-0.5 text-ink-3 hover:bg-press"
            title="Changer l'icône"
          >
            {icon ? <IconView icon={icon} size={size} color={color} /> : emptyLabel ? <span className="px-1 text-[13px]">{emptyLabel}</span> : <Smile size={size - 2} />}
          </button>
        )
      }
    >
      <IconPickerPanel
        value={icon}
        color={color}
        onChange={(next) => {
          onChange(next)
          setOpen(false)
        }}
      />
    </Popover>
  )
}
