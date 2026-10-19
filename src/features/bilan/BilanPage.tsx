import { CalendarClock, CalendarDays, CircleCheck, Hourglass, ListTodo, Settings2 } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { IconView } from '@/components/IconView'
import { journalMenuClass, JournalTitle } from '@/components/JournalTitle'
import { PanelCard, usePanelTone } from '@/components/PanelCard'
import { percent, ProgressBar } from '@/components/ProgressBar'
import { Checkbox } from '@/components/ui/controls'
import { Popover } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { dayRange, toKey } from '@/domain/dates'
import { deadlineLabel, fmtDayLong, fmtTime, KIND_LABEL } from '@/domain/display'
import { buildEntries, type Entry } from '@/domain/entries'
import { projectProgress, singleColorProgress, weekProgress, type ProjectProgress } from '@/domain/progress'
import { tint } from '@/domain/style'
import type { Subcategory } from '@/domain/types'
import { cn, newId } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
import { openEntry, toggleEntryDone } from '@/store/entryActions'
import { emptyDraft, ui } from '@/store/uiStore'
import { DashedAdd } from '@/features/categories/shared'
import { BilanNotion } from './BilanNotion'
import { CompletionCurve, StatsGrid, useGlobalStats } from './GlobalStats'

// Page Bilan (calendrier.md l. 87-91). Thème journal : même univers que la page Habitudes
// (titre en étiquette, cartes lavande à ombre décalée, Fredoka) ; thème Notion : BilanNotion.

const NEUTRAL = '#9B9A97'

/** Lavande du thème journal (pastilles des chiffres du jour). */
const LAVENDER = '#8C92E8'

/** Étiquettes de statut, aux couleurs des tags Notion. */
const STATUS = {
  done: { label: 'fait', bg: '#DBEDDB', fg: '#2B593F' },
  todo: { label: 'à faire', bg: '#FBF3DB', fg: '#89632A' },
}

export function BilanPage() {
  const data = useApp((s) => s.data)
  const session = useApp((s) => s.session)
  const journal = useTheme() === 'journal'
  const navigate = useNavigate()
  const today = useMemo(() => {
    // Le Bilan montre tout le jour, sans tenir compte des switchs d'affichage du calendrier.
    const entries = buildEntries(data, { range: dayRange(new Date()), respectSwitches: false })
    return entries.sort((a, b) => Number(b.allDay) - Number(a.allDay) || +a.start - +b.start)
  }, [data])
  const progress = weekProgress(today)
  const events = today.filter((e) => e.type === 'event').length
  const projects = projectProgress(data, data.settings.bilanSubcategoryIds)
  const stats = useGlobalStats()

  // Prochaine deadline parmi tous les projets (pas seulement ceux suivis).
  const nextDeadline = useMemo(() => {
    const todayKey = toKey(new Date())
    return data.subcategories
      .filter((s) => s.isProject && s.deadline && s.deadline.slice(0, 10) >= todayKey)
      .sort((a, b) => a.deadline!.localeCompare(b.deadline!))[0]
  }, [data.subcategories])

  const addTask = () => {
    const key = toKey(new Date())
    ui.openTaskForm({ draft: emptyDraft('simple', { slots: [{ id: newId(), allDay: true, startsOn: key, endsOn: key }] }) })
  }

  if (!journal) {
    return <BilanNotion today={today} progress={progress} events={events} projects={projects} nextDeadline={nextDeadline} picker={<ProjectProgressPicker />} onAddTask={addTask} />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-16 sm:px-6 sm:pt-6">
        <JournalTitle
          icon="☀️"
          tab="mon bilan"
          title="Bilan du jour"
          className="mb-6"
          description={`Bon retour, ${session?.name ?? ''} · ${fmtDayLong(new Date())}`}
          actions={
            <Button variant="outline" onClick={() => navigate('/calendar/day')}>
              <CalendarDays size={15} /> Ouvrir la journée
            </Button>
          }
        />

        {/* Comme la page Habitudes : contenu à gauche, panneau à droite (dessous sur un écran étroit). */}
        <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
          <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-5">
            <PanelCard title="Aujourd'hui">
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile icon={<ListTodo size={16} />} value={progress.total} label="à faire" />
                <StatTile icon={<CircleCheck size={16} />} value={progress.done} label="terminées" />
                <StatTile icon={<Hourglass size={16} />} value={progress.total - progress.done} label="restantes" />
                <StatTile icon={<CalendarClock size={16} />} value={events} label="événements" />
              </div>
              <div className="flex items-center gap-3">
                <ProgressBar progress={progress} className="flex-1" />
                <span className="text-sm font-semibold tabular-nums">{percent(progress)} %</span>
              </div>
            </PanelCard>

            <PanelCard title="Projets suivis" action={<ProjectProgressPicker />}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                {projects.map((p) => (
                  <ProjectTile key={p.subcategory.id} project={p} />
                ))}
              </div>
              {projects.length === 0 && <p className="text-sm text-ink-2">Choisis des sous-catégories ou des projets à suivre.</p>}
            </PanelCard>

            {nextDeadline && <NextDeadline subcategory={nextDeadline} />}

            <PanelCard title="Statistiques">
              <div className="space-y-5 pb-1">
                <StatsGrid stats={stats} />
                <CompletionCurve curve={stats.curve} />
              </div>
            </PanelCard>
          </div>

          <aside className="flex max-w-[520px] min-w-0 flex-[1_1_380px] flex-col gap-5 sm:min-w-[300px] xl:sticky xl:top-4">
            <PanelCard title={`Tâches du jour · ${progress.done} / ${progress.total}`}>
              <div className="flex flex-col gap-0.5">
                {today.map((e) => (
                  <DayTaskRow key={e.key} entry={e} />
                ))}
              </div>
              {today.length === 0 && <p className="text-sm text-ink-2">Rien de prévu aujourd'hui.</p>}
              <DashedAdd label="Ajouter une tâche aujourd'hui" onClick={addTask} className="mt-3" />
            </PanelCard>
          </aside>
        </div>
      </div>
    </div>
  )
}

function StatTile({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  const t = usePanelTone()
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2.5', t.tile)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-2" style={{ background: tint(LAVENDER, 22) }}>
        {icon}
      </span>
      <span>
        <span className={cn('block text-2xl leading-none font-semibold tabular-nums', t.ink)}>{value}</span>
        <span className={cn('text-xs', t.soft)}>{label}</span>
      </span>
    </div>
  )
}

/** Carte d'un projet suivi : icône sur pastille de sa couleur, deadline, avancement. */
function ProjectTile({ project: { subcategory: s, done, total } }: { project: ProjectProgress }) {
  const t = usePanelTone()
  const deadline = s.isProject && s.deadline ? deadlineLabel(s.deadline, s.deadlineHasTime) : null
  return (
    <button
      type="button"
      onClick={() => ui.set({ categorySheet: { kind: 'subcategory', id: s.id } })}
      title="Ouvrir la fiche"
      className={cn('flex min-h-[168px] flex-col gap-2.5 p-3 text-left transition-transform duration-200 hover:-translate-y-0.5', t.tile)}
    >
      <span className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-[12px] border-[1.5px]" style={{ background: tint(s.color, 30), borderColor: tint(s.color, 60) }}>
          <IconView icon={s.icon} size={18} color={s.color} />
        </span>
        {s.isProject && <span className="rounded-full border border-line bg-white px-2 text-[11px] font-medium text-ink-2">projet</span>}
      </span>
      <span>
        <span className={cn('block truncate text-[17px] leading-tight font-semibold', t.ink)}>{s.name}</span>
        <span className={cn('mt-0.5 flex items-center gap-1 text-xs', t.soft)}>
          <CalendarClock size={12} /> {deadline ? deadline.text : 'Pas de deadline'}
        </span>
      </span>
      <span className="mt-auto">
        <span className={cn('mb-1 flex justify-between text-xs', t.soft)}>
          <span>
            {done} / {total} tâches
          </span>
          <span className={cn('font-semibold', t.ink)}>{total ? Math.round((done / total) * 100) : 0} %</span>
        </span>
        <ProgressBar progress={singleColorProgress(done, total, s.color)} />
      </span>
    </button>
  )
}

function NextDeadline({ subcategory: s }: { subcategory: Subcategory }) {
  const t = usePanelTone()
  return (
    <PanelCard title="Prochaine deadline">
      <div className={cn('flex items-center gap-3 px-3 py-2.5', t.tile)}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border-[1.5px]" style={{ background: tint(s.color, 30), borderColor: tint(s.color, 60) }}>
          <IconView icon={s.icon} size={20} color={s.color} />
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-[17px] font-semibold', t.ink)}>{s.name}</span>
        <span className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: STATUS.todo.bg, color: STATUS.todo.fg }}>
          {deadlineLabel(s.deadline!, s.deadlineHasTime).text}
        </span>
      </div>
    </PanelCard>
  )
}

/** Ligne d'une entrée du jour : case, pastille de couleur, titre, horaires et type, statut. */
function DayTaskRow({ entry }: { entry: Entry }) {
  const t = usePanelTone()
  const isEvent = entry.type === 'event'
  const color = (isEvent ? entry.eventColor : entry.style?.color) ?? NEUTRAL
  const status = isEvent ? { label: 'événement', bg: tint(color, 25), fg: '#37352F' } : entry.done ? STATUS.done : STATUS.todo

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openEntry(entry)}
      onKeyDown={(e) => e.key === 'Enter' && openEntry(entry)}
      className={cn('flex cursor-pointer items-center gap-2.5 px-2 py-2', t.row)}
    >
      {isEvent ? (
        <span className="size-4 shrink-0 rounded-full border-2 border-dotted" style={{ borderColor: tint(color, 70) }} />
      ) : (
        <Checkbox checked={!!entry.done} onChange={() => toggleEntryDone(entry)} label="Fait" />
      )}
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: tint(color, 55) }} />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-medium', t.ink, entry.done && 'line-through opacity-60')}>{entry.title || 'Sans titre'}</span>
        <span className={cn('block truncate text-xs', t.soft)}>
          {entry.allDay ? 'Toute la journée' : `${fmtTime(entry.start)} – ${fmtTime(entry.end)}`} · {KIND_LABEL[entry.type]}
          {entry.subtitle && ` · ${entry.subtitle}`}
        </span>
      </span>
      <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium" style={{ background: status.bg, color: status.fg }}>
        {status.label}
      </span>
    </div>
  )
}

/** Choix des sous-catégories / projets suivis dans le Bilan (mémorisé dans les réglages). */
function ProjectProgressPicker() {
  const categories = useApp((s) => s.data.categories)
  const subcategories = useApp((s) => s.data.subcategories)
  const selected = useApp((s) => s.data.settings.bilanSubcategoryIds)
  const updateSettings = useApp((s) => s.updateSettings)
  const toggle = (id: string) => updateSettings({ bilanSubcategoryIds: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] })
  const journal = useTheme() === 'journal'

  return (
    <Popover
      align="end"
      className={journal ? cn(journalMenuClass, 'p-2') : undefined}
      trigger={
        <button type="button" className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-2 hover:bg-black/5 hover:text-ink">
          <Settings2 size={14} /> Choisir ({selected.length})
        </button>
      }
    >
      <div className="max-h-[340px] w-[260px] overflow-y-auto p-1">
        {[...categories]
          .sort((a, b) => a.position - b.position)
          .map((c) => {
            const subs = subcategories.filter((s) => s.categoryId === c.id).sort((a, b) => Number(b.isProject) - Number(a.isProject) || a.position - b.position)
            if (subs.length === 0) return null
            return (
              <div key={c.id}>
                <div className={cn('px-2 pt-1.5 pb-0.5 text-[11px] font-medium', journal ? 'text-[#5B57A6]' : 'text-ink-3')}>{c.name}</div>
                {subs.map((s) => (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(s.id)}
                    className={cn('flex cursor-pointer items-center gap-2 px-2 py-1 text-[13px]', journal ? 'rounded-[10px] hover:bg-[#F4F3FF]' : 'rounded-md hover:bg-hover')}
                  >
                    <Checkbox checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
                    <IconView icon={s.icon} size={14} color={s.color} />
                    <span className="flex-1 truncate">{s.name}</span>
                    {s.isProject && <span className={cn('text-[10px] font-medium', journal ? 'text-[#5B57A6]' : 'text-ink-3')}>PROJET</span>}
                  </div>
                ))}
              </div>
            )
          })}
      </div>
    </Popover>
  )
}
