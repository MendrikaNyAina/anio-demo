import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Switch } from '@/components/ui/controls'
import { useActionMenu } from '@/components/ui/menu'
import type { NotionSource } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
import { ui } from '@/store/uiStore'

/** Bas du menu, dans le calendrier : sources affichées (plateforme + bases Notion). */
export function NotionSourcesList() {
  const sources = useApp((s) => s.data.notionSources)
  const showPlatform = useApp((s) => s.data.settings.showPlatformTasks)
  const updateSettings = useApp((s) => s.updateSettings)
  const journal = useTheme() === 'journal'

  const rows = (
    <>
      <Row icon="🗓️" name="Tâches de la plateforme" checked={showPlatform} onChange={(v) => updateSettings({ showPlatformTasks: v })} />
      {sources.map((s) => (
        <SourceRow key={s.id} source={s} />
      ))}
    </>
  )

  if (journal) {
    // Thème journal : carte blanche avec sa languette « sources », dans le menu façon carnet.
    return (
      <div className="relative pt-3">
        <span className="absolute top-0 left-3 z-[1] inline-flex -rotate-2 items-center rounded-full border-2 border-journal-green-line bg-journal-green px-[9px] text-[11px] leading-5 font-semibold">sources</span>
        <div className="flex flex-col gap-0.5 rounded-[18px] border-2 border-[#A3A8EE] bg-white px-2 pt-4 pb-2">
          {rows}
          <button
            type="button"
            onClick={() => ui.set({ notionDialogOpen: true })}
            className="mt-1.5 flex h-[34px] items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#C9CDFF] text-[13px] font-medium text-[#5B57A6] transition-colors hover:bg-[#F4F3FF] hover:text-[#2F2B6E]"
          >
            <Plus size={14} strokeWidth={2.4} /> Intégrer une base Notion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Sources</div>
      {rows}
      <button
        type="button"
        onClick={() => ui.set({ notionDialogOpen: true })}
        className="mt-0.5 flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] text-ink-2 hover:bg-press hover:text-ink"
      >
        <Plus size={15} /> Intégrer une base Notion
      </button>
    </div>
  )
}

function SourceRow({ source }: { source: NotionSource }) {
  const app = useApp.getState()
  const menu = useActionMenu([
    {
      label: 'Retirer cette base',
      icon: <Trash2 />,
      danger: true,
      onSelect: () =>
        ui.confirm({
          title: `Retirer « ${source.name} » ?`,
          message: 'Ses tâches ne seront plus affichées. Rien ne sera supprimé dans Notion.',
          confirmLabel: 'Retirer',
          onConfirm: () => app.removeNotionSource(source.id),
        }),
    },
  ])
  return (
    <div onContextMenu={menu.onContextMenu} className="group">
      <Row
        icon={source.icon}
        name={source.name}
        badge="N"
        checked={source.showInCalendar}
        onChange={(v) => app.setNotionVisible(source.id, v)}
        extra={
          <button type="button" onClick={menu.openFromButton} className="rounded p-0.5 text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-hover" aria-label="Options">
            <MoreHorizontal size={14} />
          </button>
        }
      />
      {menu.element}
    </div>
  )
}

function Row({ icon, name, badge, checked, onChange, extra }: { icon: string; name: string; badge?: string; checked: boolean; onChange: (v: boolean) => void; extra?: ReactNode }) {
  const journal = useTheme() === 'journal'
  if (journal) {
    return (
      <div className="flex h-8 items-center gap-2 rounded-[10px] px-1.5 text-[13px] font-medium hover:bg-[#F4F3FF]">
        <span className="w-4 text-center text-sm">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {badge && <span className="rounded-[4px] border-[1.5px] border-[#2F2B6E] px-[3px] font-serif text-[9px] leading-[12px] font-bold">{badge}</span>}
        {extra}
        <JournalSwitch checked={checked} onChange={onChange} label={`Afficher ${name}`} />
      </div>
    )
  }
  return (
    <div className="flex h-7 items-center gap-2 rounded-md px-2 text-[13px] hover:bg-press">
      <span className="w-4 text-center text-sm">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {badge && <span className="rounded-[3px] border border-ink-3 px-[3px] font-serif text-[9px] leading-[12px] font-bold text-ink-3">{badge}</span>}
      {extra}
      <Switch size="sm" checked={checked} onChange={onChange} label={`Afficher ${name}`} />
    </div>
  )
}

/** Interrupteur du thème journal : rose et bleu nuit, comme un sticker. */
function JournalSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn('relative h-5 w-[34px] shrink-0 rounded-full border-2 border-[#2F2B6E] transition-colors', checked ? 'bg-[#E86AAE]' : 'bg-white')}
    >
      <span
        className={cn(
          'absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-[#2F2B6E] transition-all',
          checked ? 'right-[2px] bg-white' : 'left-[2px] bg-[#F7B5D6]',
        )}
      />
    </button>
  )
}
