import type { MouseEvent } from 'react'
import { fmtDurationShort, fmtTime } from '@/domain/display'
import { minutesBetween } from '@/domain/dates'
import type { Entry } from '@/domain/entries'
import { eventCss, shade, styleToCss } from '@/domain/style'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { toggleEntryDone } from '@/store/entryActions'
import { ui, useUi } from '@/store/uiStore'
import { InlineEditableText } from './InlineEditableText'
import { TypeIndicator } from './TypeIndicator'
import { Checkbox } from './ui/controls'

interface Props {
  entry: Entry
  /** `block` : grille horaire. `pill` : case du mois, ligne « journée ». `row` : listes et panneaux. */
  variant: 'block' | 'pill' | 'row'
  editing?: boolean
  onCommitTitle?: (title: string) => void
  onCancelTitle?: () => void
  className?: string
}

/**
 * Le composant central (calendrier.md l. 29) : indicateur de type en haut à gauche (l'icône de la
 * (sous-)catégorie, dans un cadre plein / à tirets / pointillé selon le type), checkbox avant le titre,
 * style hérité de la (sous-)catégorie principale, barré et terni une fois coché.
 * Les événements ont une bordure pointillée et leur icône devant le titre.
 */
export function CalendarEntry({ entry, variant, editing, onCommitTitle, onCancelTitle, className }: Props) {
  const doneStyle = useApp((s) => s.data.settings.doneStyle)
  const pending = useUi((s) => !!entry.taskId && !!s.notionPending[entry.taskId])
  const isEvent = entry.type === 'event'
  const css = isEvent ? eventCss(entry.eventColor!) : styleToCss(entry.style)
  const accent = isEvent ? entry.eventColor! : entry.style ? shade(entry.style.color, 85) : '#787774'
  const duration = entry.allDay ? null : minutesBetween(entry.start, entry.end)
  const tall = variant === 'block' && (duration ?? 0) >= 50
  // Le type devient une languette posée sur le bord haut, à droite (les deux thèmes).
  // Grille horaire : seulement à partir de 30 min (sinon il reste devant la case). Lignes des panneaux, cases du mois
  // et ligne « Journée » : toujours. Les événements n'en ont pas : leur icône reste devant le titre.
  const tabbed = !isEvent && ((variant === 'block' && (duration ?? 0) >= 30) || variant !== 'block')

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ui.set({ entryMenu: { x: e.clientX, y: e.clientY, entry } })
  }

  const title = editing ? (
    <InlineEditableText
      value=""
      startEditing
      placeholder="Nouveau titre…"
      onSave={(v) => onCommitTitle?.(v)}
      onCancel={onCancelTitle}
      inputClassName="text-[12px] font-medium text-ink"
    />
  ) : (
    <span className="entry-title min-w-0 flex-1 truncate font-medium">{entry.title || 'Sans titre'}</span>
  )

  const rootProps = { onContextMenu, title: pending ? 'Envoi vers Notion…' : undefined }
  const typeIcon = <TypeIndicator type={entry.type} icon={entry.style?.icon} color={accent} notion={!!entry.notionSource} size={variant === 'row' ? 17 : 15} />

  const block = (
    <div
      {...(tabbed ? {} : rootProps)}
      className={cn(
        'h-full w-full min-w-0 overflow-hidden rounded-[5px] border text-[12px] leading-[1.35]',
        isEvent ? 'border-2' : 'border',
        variant === 'block' && cn('px-1.5 pb-1', tabbed ? 'pt-[9px]' : 'pt-1'),
        variant === 'row' && cn('px-1.5 pb-1.5 text-[13px]', tabbed ? 'pt-[9px]' : 'pt-1.5'),
        // Pastille : le titre reste sur sa ligne, il s'arrête avant la languette au lieu de passer dessous.
        variant === 'pill' && cn('pl-1.5 py-[3px]', tabbed ? 'pr-[30px]' : 'pr-1.5'),
        entry.done && 'entry-done',
        entry.done && doneStyle === 'hatched' && 'done-hatched',
        pending && 'entry-pending',
        className,
      )}
      style={css}
    >
      <div className="flex min-w-0 items-center gap-1">
        {!tabbed && (
          <span style={{ color: accent }} className="flex">
            {typeIcon}
          </span>
        )}
        {entry.done !== undefined && (
          <Checkbox checked={entry.done} onChange={() => toggleEntryDone(entry)} className={variant === 'row' ? 'size-4' : 'size-3.5'} label="Fait" />
        )}
        {title}
        {variant !== 'block' && duration !== null && (
          <span className="shrink-0 pl-1 text-[11px] text-ink-2 tabular-nums">{variant === 'row' ? `${fmtTime(entry.start)} – ${fmtTime(entry.end)}` : fmtDurationShort(duration)}</span>
        )}
      </div>
      {tall && (
        <div className="mt-0.5 truncate text-[11px] opacity-75">
          {fmtTime(entry.start)} – {fmtTime(entry.end)}
          {entry.subtitle && <> · {entry.subtitle}</>}
        </div>
      )}
      {variant === 'row' && entry.subtitle && <div className={cn('mt-0.5 truncate text-[11px] text-ink-2', tabbed ? 'pl-5' : 'pl-[21px]')}>{entry.subtitle}</div>}
    </div>
  )
  if (!tabbed) return block

  // Le bloc descend de 7 px ; la languette (le cadre du type) se pose à cheval sur son bord haut, à droite, dans la bande transparente.
  return (
    <div {...rootProps} className="relative h-full w-full pt-[7px]">
      <TypeIndicator
        type={entry.type}
        icon={entry.style?.icon}
        color={accent}
        notion={!!entry.notionSource}
        size={16}
        className={cn('absolute top-0 right-2 z-[1]', entry.done && (doneStyle === 'hatched' ? 'opacity-70' : 'opacity-45'))}
        style={{ background: '#FFFFFF', color: accent }}
      />
      {block}
    </div>
  )
}
