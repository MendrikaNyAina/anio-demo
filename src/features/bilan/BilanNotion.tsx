import { CalendarClock, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { IconView } from '@/components/IconView'
import { PageHeader } from '@/components/PageHeader'
import { percent, ProgressBar } from '@/components/ProgressBar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/controls'
import { deadlineLabel, fmtDayLong, fmtTime, KIND_LABEL } from '@/domain/display'
import type { Entry } from '@/domain/entries'
import { singleColorProgress, type Progress, type ProjectProgress } from '@/domain/progress'
import { tint } from '@/domain/style'
import type { Subcategory } from '@/domain/types'
import { cn } from '@/lib/utils'
import { Page } from '@/features/layout/AppShell'
import { openEntry, toggleEntryDone } from '@/store/entryActions'
import { ui } from '@/store/uiStore'

/** Bilan du thème Notion : mêmes informations que la version journal, en page sobre (listes et lignes). */
export function BilanNotion({
  today,
  progress,
  events,
  projects,
  nextDeadline,
  picker,
  onAddTask,
}: {
  today: Entry[]
  progress: Progress
  events: number
  projects: ProjectProgress[]
  nextDeadline?: Subcategory
  picker: ReactNode
  onAddTask: () => void
}) {
  const navigate = useNavigate()

  return (
    <Page>
      <PageHeader
        icon="📊"
        title="Bilan du jour"
        description={fmtDayLong(new Date())}
        actions={
          <Button size="sm" variant="outline" onClick={() => navigate('/calendar/day')}>
            Ouvrir la journée
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="À faire aujourd'hui" value={progress.total} />
        <Stat label="Terminées" value={progress.done} />
        <Stat label="Restantes" value={progress.total - progress.done} />
        <Stat label="Événements" value={events} />
      </div>
      <div className="mb-10 flex items-center gap-3">
        <ProgressBar progress={progress} className="flex-1" />
        <span className="text-sm font-semibold tabular-nums">{percent(progress)} %</span>
      </div>

      <Section title="Projets suivis" action={picker}>
        {projects.map(({ subcategory: s, done, total }) => {
          const deadline = s.isProject && s.deadline ? deadlineLabel(s.deadline, s.deadlineHasTime) : null
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => ui.set({ categorySheet: { kind: 'subcategory', id: s.id } })}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-hover"
            >
              <IconView icon={s.icon} size={16} color={s.color} />
              <span className="w-28 shrink-0 truncate font-medium sm:w-40">{s.name}</span>
              <ProgressBar progress={singleColorProgress(done, total, s.color)} className="min-w-0 flex-1" />
              <span className="w-12 shrink-0 text-right text-ink-2 tabular-nums">
                {done}/{total}
              </span>
              <span className="hidden w-36 shrink-0 items-center gap-1 text-xs text-ink-3 sm:flex">
                <CalendarClock size={12} /> {deadline ? deadline.text : 'Pas de deadline'}
              </span>
            </button>
          )
        })}
        {projects.length === 0 && <p className="px-2 py-2 text-sm text-ink-3">Aucun projet suivi. Choisis-en avec le bouton à droite.</p>}
        {nextDeadline && (
          <div className="mt-2 flex items-center gap-2 border-t border-line px-2 pt-3 text-sm">
            <span className="text-ink-3">Prochaine deadline :</span>
            <IconView icon={nextDeadline.icon} size={14} color={nextDeadline.color} />
            <span className="font-medium">{nextDeadline.name}</span>
            <span className="text-ink-2">· {deadlineLabel(nextDeadline.deadline!, nextDeadline.deadlineHasTime).text}</span>
          </div>
        )}
      </Section>

      <Section title={`Tâches du jour (${today.length})`}>
        {today.map((e) => (
          <DayRow key={e.key} entry={e} />
        ))}
        {today.length === 0 && <p className="px-2 py-2 text-sm text-ink-3">Rien de prévu aujourd'hui.</p>}
        <button type="button" onClick={onAddTask} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-3 hover:bg-hover hover:text-ink">
          <Plus size={14} /> Ajouter une tâche aujourd'hui
        </button>
      </Section>
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line px-4 py-3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-1 flex items-center justify-between border-b border-line pb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Ligne d'une entrée du jour : case, titre, couleur de catégorie, horaires et type. */
function DayRow({ entry }: { entry: Entry }) {
  const isEvent = entry.type === 'event'
  const color = isEvent ? entry.eventColor : entry.style?.color
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openEntry(entry)}
      onKeyDown={(e) => e.key === 'Enter' && openEntry(entry)}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-hover"
    >
      {isEvent ? <span className="size-4 shrink-0" /> : <Checkbox checked={!!entry.done} onChange={() => toggleEntryDone(entry)} label="Fait" />}
      <span className="size-2 shrink-0 rounded-full" style={{ background: color ? tint(color, 40) : '#E9E9E7' }} />
      <span className={cn('min-w-0 flex-1 truncate', entry.done && 'text-ink-3 line-through')}>{entry.title || 'Sans titre'}</span>
      <span className="shrink-0 text-xs text-ink-3">{entry.allDay ? 'Journée' : `${fmtTime(entry.start)} – ${fmtTime(entry.end)}`}</span>
      <span className="hidden w-24 shrink-0 text-right text-xs text-ink-3 sm:block">{KIND_LABEL[entry.type]}</span>
    </div>
  )
}
