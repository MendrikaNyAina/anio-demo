import { addDays, startOfWeek } from 'date-fns'
import { atTime, toKey } from '@/domain/dates'
import type { Slot, Task } from '@/domain/types'
import { newId } from '@/lib/utils'

// Faux espace Notion. Dans le vrai projet, ces bases et leurs pages sont lues en direct
// par une Edge Function, jamais importées dans la base (décision Notion de technologie.md).

interface FakePage {
  title: string
  done?: boolean
  /** Décalage en jours depuis le lundi de la semaine en cours. */
  day?: number
  from?: string
  to?: string
}

export interface NotionCatalogDb {
  id: string
  name: string
  icon: string
  hasDates: boolean
  pages: FakePage[]
}

export const NOTION_CATALOG: NotionCatalogDb[] = [
  {
    id: 'notion-lectures',
    name: 'Lectures',
    icon: '📚',
    hasDates: true,
    pages: [
      { title: 'Relire mes notes de lecture', done: true, day: 0, from: '21:00', to: '21:30' },
      { title: 'Lire Atomic Habits – ch. 3', day: 2, from: '21:00', to: '21:30' },
      { title: 'Finir Dune', day: 5 },
      { title: 'Article : UX des calendriers' },
    ],
  },
  {
    id: 'notion-contenus',
    name: 'Idées de contenu',
    icon: '💡',
    hasDates: false,
    pages: [{ title: 'Timelapse du portrait' }, { title: 'Avant / après palette' }, { title: 'Coulisses Shifterra' }],
  },
  {
    id: 'notion-freelance',
    name: 'Suivi freelance',
    icon: '💼',
    hasDates: true,
    pages: [
      { title: 'Facturer le client A', day: 4 },
      { title: 'Point mensuel', day: 3, from: '16:00', to: '17:00' },
      { title: 'Relancer le devis', day: 8, from: '10:00', to: '10:30' },
    ],
  },
]

/** Pages d'une base sous forme de tâches « source Notion ». */
export function notionTasks(db: NotionCatalogDb, now = new Date()): Task[] {
  const monday = startOfWeek(now, { weekStartsOn: 1 })
  return db.pages.map((page, i) => {
    let slots: Slot[] = []
    if (page.day !== undefined) {
      const key = toKey(addDays(monday, page.day))
      slots = [
        page.from && page.to
          ? { id: newId(), allDay: false, start: atTime(key, page.from).toISOString(), end: atTime(key, page.to).toISOString() }
          : { id: newId(), allDay: true, startsOn: key, endsOn: key },
      ]
    }
    return {
      id: newId(),
      kind: 'simple',
      title: page.title,
      done: page.done ?? false,
      subtasks: [],
      createdAt: new Date(now.getTime() - i * 60_000).toISOString(),
      categoryIds: [],
      subcategoryIds: [],
      slots,
      occurrences: {},
      source: { kind: 'notion', sourceId: db.id },
    }
  })
}
