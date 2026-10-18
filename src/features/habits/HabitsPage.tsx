import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { JournalTitle } from '@/components/JournalTitle'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { toKey } from '@/domain/dates'
import { isHabitEnded, isHabitScheduled } from '@/domain/habitTracking'
import { buildLookup } from '@/domain/lookup'
import { resolveTaskStyle } from '@/domain/style'
import type { ID, Task } from '@/domain/types'
import { useApp, useTheme } from '@/store/appStore'
import { emptyDraft, ui } from '@/store/uiStore'
import { HabitTabs } from './HabitTabs'
import { HabitTracker } from './HabitTracker'

const NEUTRAL = '#9B9A97'

/**
 * Page Suivi des habitudes (calendrier.md, fin) : un onglet par habitude en cours,
 * les habitudes terminées dans « … » (cochées = remises dans les onglets), et le tableau de l'année.
 */
export function HabitsPage() {
  const data = useApp((s) => s.data)
  const activeId = useApp((s) => s.prefs.habitActiveId)
  const shownEnded = useApp((s) => s.prefs.habitShownEnded) ?? []
  const setPrefs = useApp((s) => s.setPrefs)
  const journal = useTheme() === 'journal'
  const lookup = useMemo(() => buildLookup(data), [data])

  const { running, ended } = useMemo(() => {
    const today = new Date()
    const habits = data.tasks.filter((t) => t.kind === 'habit' && t.recurrence && !t.source)
    return {
      running: habits.filter((h) => !isHabitEnded(h, today)),
      // Les plus récemment terminées d'abord.
      ended: habits.filter((h) => isHabitEnded(h, today)).sort((a, b) => b.recurrence!.endDate!.localeCompare(a.recurrence!.endDate!)),
    }
  }, [data.tasks])

  const tabs = [...running, ...ended.filter((h) => shownEnded.includes(h.id))]
  const todayHabits = running.filter((h) => isHabitScheduled(h, new Date()))
  const active = tabs.find((h) => h.id === activeId) ?? tabs[0]

  const colorOf = (habit: Task) => resolveTaskStyle(habit, lookup)?.color ?? NEUTRAL
  const select = (id: ID) => setPrefs({ habitActiveId: id })
  const toggleShown = (id: ID) => setPrefs({ habitShownEnded: shownEnded.includes(id) ? shownEnded.filter((x) => x !== id) : [...shownEnded, id] })
  const create = () =>
    ui.openTaskForm({
      draft: emptyDraft('habit', { recurrence: { weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: toKey(new Date()), durationMin: data.settings.defaultDurationMin } }),
    })

  // Catégorie affichée dans le résumé : la sous-catégorie principale, à défaut la catégorie principale.
  const sub = active?.primarySubcategoryId ? lookup.subcategories.get(active.primarySubcategoryId) : undefined
  const cat = active?.primaryCategoryId ? lookup.categories.get(active.primaryCategoryId) : undefined
  const group = sub ?? cat

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        {journal ? (
          <JournalTitle icon="🌱" tab="mes routines" title="Mes habitudes" className="mb-4" />
        ) : (
          <PageHeader
            icon="🌱"
            title="Habitudes"
            description="Une case par jour prévu : cochée quand c'est fait, grisée quand c'est raté."
          />
        )}
      </div>

      <HabitTabs
        tabs={tabs}
        activeId={active?.id}
        ended={ended}
        shownEnded={shownEnded}
        colorOf={colorOf}
        onSelect={select}
        onToggleShown={toggleShown}
        onCreate={create}
      />

      {active ? (
        // `key` : changer d'habitude repart sur son année par défaut.
        <HabitTracker
          key={active.id}
          habit={active}
          color={colorOf(active)}
          label={group?.name}
          icon={group?.icon}
          todayHabits={todayHabits}
          colorOf={colorOf}
          onSelect={select}
        />
      ) : (
        <div className="flex flex-col items-start gap-3 px-4 py-10 text-sm text-ink-2 sm:px-6">
          <p>{ended.length > 0 ? 'Aucune habitude en cours. Les habitudes terminées sont dans « … ».' : 'Aucune habitude pour le moment.'}</p>
          <Button variant="primary" onClick={create}>
            <Plus size={15} /> Nouvelle habitude
          </Button>
        </div>
      )}
    </div>
  )
}
