import { addDays, startOfMonth, startOfWeek, subMinutes } from 'date-fns'
import { atTime, fromKey, isoDay, toKey } from '@/domain/dates'
import {
  DEFAULT_EISENHOWER_COLORS,
  DEFAULT_MASCOT_LINES,
  DEFAULT_POMODORO,
  EMPTY_FILTERS,
  type CalendarEvent,
  type CalendarView,
  type Category,
  type DataState,
  type IconAsset,
  type Recurrence,
  type Slot,
  type Subcategory,
  type Task,
} from '@/domain/types'
import { newId } from '@/lib/utils'
import { NOTION_CATALOG, notionTasks } from './notionCatalog'

/** Données de démo, toujours placées autour de la semaine en cours. */
export function createSeed(now = new Date()): DataState {
  const monday = startOfWeek(now, { weekStartsOn: 1 })
  const key = (day: number) => toKey(addDays(monday, day))
  const timed = (day: number, from: string, to: string): Slot => ({
    id: newId(),
    allDay: false,
    start: atTime(key(day), from).toISOString(),
    end: atTime(key(day), to).toISOString(),
  })
  const allDay = (day: number): Slot => ({ id: newId(), allDay: true, startsOn: key(day), endsOn: key(day) })

  let order = 0
  const created = () => subMinutes(now, 600 - order++ * 7).toISOString()

  // Icônes « uploadées » d'exemple (de simples SVG).
  const svg = (body: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`)}`
  const icons: IconAsset[] = [
    {
      id: newId(),
      name: 'Logo Shifterra',
      dataUrl: svg('<rect width="64" height="64" rx="14" fill="#D9730D"/><path d="M18 40c8 6 20 6 28-2M20 24h24" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/>'),
      createdAt: subMinutes(now, 4000).toISOString(),
    },
    {
      id: newId(),
      name: 'Pastille lune',
      dataUrl: svg('<circle cx="32" cy="32" r="28" fill="#9065B0"/><circle cx="40" cy="26" r="18" fill="#F4F0F7"/>'),
      createdAt: subMinutes(now, 3000).toISOString(),
    },
  ]

  const category = (name: string, emoji: string, color: string, styleTarget: Category['styleTarget'], position: number): Category => ({
    id: newId(),
    name,
    color,
    styleTarget,
    icon: { type: 'emoji', value: emoji },
    position,
  })
  const projet = category('Projet', '📁', '#337EA9', 'background', 0)
  const dessin = category('Dessin', '🎨', '#9065B0', 'label', 1)
  const perso = category('Perso', '🏠', '#448361', 'border', 2)

  const sub = (parent: Category, name: string, icon: Subcategory['icon'], color: string, styleTarget: Category['styleTarget'], position: number, extra: Partial<Subcategory> = {}): Subcategory => ({
    id: newId(),
    categoryId: parent.id,
    name,
    color,
    styleTarget,
    icon,
    position,
    isProject: false,
    deadlineHasTime: false,
    ...extra,
  })
  const portfolio = sub(projet, 'Portfolio', { type: 'emoji', value: '🌐' }, '#337EA9', 'background', 0, {
    isProject: true,
    description: 'Refonte complète du portfolio : nouvelles pages, galerie et visuels.',
    deadline: key(17),
  })
  const shifterra = sub(projet, 'Shifterra', { type: 'image', iconId: icons[0].id }, '#D9730D', 'background', 1, {
    isProject: true,
    description: 'Site vitrine Shifterra.',
    deadline: atTime(key(40), '18:00').toISOString(),
    deadlineHasTime: true,
  })
  const ikaly = sub(projet, 'Ikaly mobile', { type: 'emoji', value: '📱' }, '#448361', 'border', 2, {
    isProject: true,
    description: 'Application mobile Ikaly : corrections et nouvelles fonctionnalités.',
    deadline: key(60),
  })
  const painting = sub(dessin, 'Digital painting', { type: 'emoji', value: '🖌️' }, '#9065B0', 'background', 0)
  const croquis = sub(dessin, 'Croquis', { type: 'emoji', value: '✏️' }, '#C14C8A', 'label', 1)
  const sport = sub(perso, 'Sport', { type: 'emoji', value: '🏃' }, '#D44C47', 'background', 0)
  const maison = sub(perso, 'Maison', { type: 'emoji', value: '🧹' }, '#9F6B53', 'label', 1)

  const inSub = (s: Subcategory) => ({
    categoryIds: [s.categoryId],
    primaryCategoryId: s.categoryId,
    subcategoryIds: [s.id],
    primarySubcategoryId: s.id,
  })
  const inCat = (c: Category) => ({ categoryIds: [c.id], primaryCategoryId: c.id })
  const task = (p: Partial<Task> & Pick<Task, 'title'>): Task => ({
    id: newId(),
    kind: 'simple',
    done: false,
    subtasks: [],
    createdAt: created(),
    categoryIds: [],
    subcategoryIds: [],
    slots: [],
    occurrences: {},
    ...p,
  })

  /**
   * Occurrences passées cochées d'une habitude (environ 4 sur 5, de façon déterministe),
   * pour que la page Suivi des habitudes ait de l'historique à montrer.
   */
  const history = (rec: Recurrence, seed: number): Task['occurrences'] => {
    const out: Task['occurrences'] = {}
    const yesterday = toKey(addDays(now, -1))
    const last = rec.endDate && rec.endDate < yesterday ? rec.endDate : yesterday
    let i = 0
    for (let d = fromKey(rec.startDate); toKey(d) <= last; d = addDays(d, 1)) {
      if (!rec.weekdays.includes(isoDay(d))) continue
      if ((i++ * 7 + seed) % 5 !== 0) out[toKey(d)] = { done: true }
    }
    return out
  }
  const habit = (title: string, sub: Subcategory, recurrence: Recurrence, seed: number, extra: Task['occurrences'] = {}): Task =>
    task({ title, kind: 'habit', ...inSub(sub), recurrence, occurrences: { ...history(recurrence, seed), ...extra } })

  const tasks: Task[] = [
    // Portfolio
    task({ title: 'Écrire la page À propos', ...inSub(portfolio), slots: [timed(0, '14:00', '15:00')], done: true, priority: 'medium' }),
    task({ title: 'Choisir la palette de couleurs', ...inSub(portfolio), slots: [allDay(0)], done: true }),
    task({
      title: 'Créer les visuels des pages',
      urgent: false,
      kind: 'spread',
      priority: 'high',
      ...inSub(portfolio),
      slots: [timed(1, '09:00', '12:00'), timed(2, '14:00', '18:00'), timed(3, '09:00', '11:00')],
      subtasks: [
        { id: newId(), title: 'Visuel du header', done: true },
        { id: newId(), title: 'Visuel du footer', done: false },
        { id: newId(), title: 'Miniatures de la galerie', done: false },
      ],
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Brief' }] },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Style doux, couleurs pastel, beaucoup de blanc. Références dans le ' },
              { type: 'text', text: 'moodboard', marks: [{ type: 'link', attrs: { href: 'https://www.notion.so' } }] },
              { type: 'text', text: '.' },
            ],
          },
          { type: 'bulletList', content: ['Header 1440 px', 'Footer', 'Miniatures 4:5'].map((t) => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] })) },
        ],
      },
    }),
    task({ title: 'Intégrer la galerie', ...inSub(portfolio), slots: [timed(4, '10:00', '12:30')], urgent: false, priority: 'medium' }),
    task({ title: 'Optimiser les images', ...inSub(portfolio), priority: 'low' }),

    // Shifterra (dont une tâche multi-catégories)
    task({
      title: "Maquette de la page d'accueil",
      categoryIds: [projet.id, dessin.id],
      primaryCategoryId: projet.id,
      subcategoryIds: [shifterra.id, painting.id],
      primarySubcategoryId: shifterra.id,
      slots: [timed(3, '13:00', '15:00')],
      priority: 'high',
    }),
    task({ title: "Écrire la doc de l'API", ...inSub(shifterra), priority: 'low' }),
    task({ title: 'Préparer la présentation', ...inSub(shifterra), slots: [allDay(4)], priority: 'high', urgent: true }),
    task({ title: 'Revue de code', ...inSub(shifterra), slots: [timed(2, '09:00', '10:00')], done: true }),
    task({ title: 'Sprint Shifterra', kind: 'spread', ...inSub(shifterra), slots: [allDay(-4), allDay(-3), allDay(7), allDay(8)] }),

    // Dessin
    task({ title: 'Peindre le portrait de Lova', kind: 'spread', ...inSub(painting), slots: [timed(5, '10:00', '13:00'), timed(6, '14:00', '17:00')] }),
    task({ title: 'Étude de lumière', ...inSub(painting), slots: [allDay(2)] }),
    task({ title: 'Croquis au café', ...inSub(croquis), slots: [timed(3, '17:30', '18:30')], urgent: false, priority: 'low' }),
    task({ title: 'Commander un nouveau stylet', ...inCat(dessin), priority: 'medium' }),

    // Perso
    task({ title: 'Courses de la semaine', ...inSub(maison) }),
    task({ title: 'Arroser les plantes', ...inSub(maison), slots: [allDay(2)], urgent: true, priority: 'low' }),
    task({ title: 'Payer la facture internet', ...inSub(maison), slots: [allDay(2)], priority: 'high', urgent: true }),
    task({ title: 'Grand ménage', ...inSub(maison), slots: [timed(5, '09:00', '10:30')] }),
    task({ title: 'Envoyer le devis du plombier', ...inCat(perso), slots: [allDay(2)] }),

    // Sans catégorie → « Autre »
    task({ title: 'Appeler le plombier', slots: [allDay(2)], urgent: true, priority: 'low' }),
    task({ title: 'Lire 30 pages', slots: [allDay(1)], done: true }),
    task({ title: 'Préparer le rendez-vous à la banque' }),

    // Habitudes
    habit(
      'Sport',
      sport,
      { weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: toKey(addDays(startOfMonth(now), -60)), endDate: toKey(addDays(startOfMonth(now), 91)), startTime: '07:00', durationMin: 30 },
      1,
      { [key(0)]: { done: true }, [key(-1)]: { done: true } },
    ),
    // Sans heure : l'heure est choisie jour par jour (ici lundi, 20 h).
    habit('Dessin quotidien', painting, { weekdays: [1, 3, 5], startDate: key(-120), durationMin: 60 }, 2, {
      [key(0)]: { done: true, start: atTime(key(0), '20:00').toISOString(), end: atTime(key(0), '21:00').toISOString() },
    }),
    habit('Réviser Flutter', ikaly, { weekdays: [2, 4], startDate: key(-7), endDate: key(30), startTime: '20:00', durationMin: 45 }, 3),
  ]

  // Ikaly : plus de 50 tâches pour voir la pagination (surtout passées et finies).
  const ikalyTopics = ['Corriger le crash au démarrage', "Traduire l'écran de profil", 'Ajouter le mode sombre', 'Optimiser la liste des produits', 'Revoir les icônes', 'Tester sur Android 14', 'Corriger le scroll du panier', 'Ajouter les notifications', 'Mettre à jour les dépendances', 'Écrire les tests du paiement', 'Améliorer le chargement']
  for (let i = 0; i < 55; i++) {
    const day = i < 45 ? -60 + i : 8 + (i - 45) * 2
    tasks.push(task({ title: `IK-${101 + i} · ${ikalyTopics[i % ikalyTopics.length]}`, ...inSub(ikaly), slots: [allDay(day)], done: i < 45, priority: i % 7 === 0 ? 'high' : undefined }))
  }

  // Habitudes terminées : elles ne sont plus dans les onglets du suivi, mais dans la liste « … »
  // (assez nombreuses pour voir le chargement au fil du scroll).
  const daily = [1, 2, 3, 4, 5, 6, 7]
  tasks.push(
    habit('Étirements du matin', sport, { weekdays: daily, startDate: key(-200), endDate: key(-110), durationMin: 15 }, 4),
    habit('Croquis dans le métro', croquis, { weekdays: [1, 3, 5], startDate: key(-150), endDate: key(-60), durationMin: 20 }, 5),
    habit('Ranger 10 minutes', maison, { weekdays: daily, startDate: key(-120), endDate: key(-40), durationMin: 10 }, 6),
    habit('Une page de veille design', portfolio, { weekdays: [2, 4], startDate: key(-90), endDate: key(-20), durationMin: 30 }, 7),
  )
  const challenges = ['Pas de sucre', 'Marcher 8 000 pas', 'Boire 2 L d\'eau', 'Lire 20 pages', 'Dormir avant minuit', 'Pas d\'écran le soir', 'Un dessin par jour', 'Gainage']
  const challengeSubs = [sport, maison, sport, painting, maison, maison, croquis, sport]
  for (let i = 0; i < 26; i++) {
    const start = -460 + i * 14
    tasks.push(habit(`Défi 30 jours · ${challenges[i % challenges.length]}`, challengeSubs[i % challengeSubs.length], { weekdays: daily, startDate: key(start), endDate: key(start + 29), durationMin: 15 }, 8 + i))
  }

  // Date de fin des tâches faites : le jour de leur créneau (sinon la veille), pour la courbe du Bilan.
  for (const t of tasks) {
    if (t.kind === 'habit' || !t.done) continue
    const first = t.slots[0]
    const day = first ? (first.allDay ? first.startsOn : toKey(new Date(first.start))) : toKey(addDays(now, -1))
    t.doneAt = atTime(day, '18:00').toISOString()
    if (t.kind === 'spread') for (const s of t.slots) s.done = true
  }

  const event = (title: string, color: string, slot: Slot): CalendarEvent => ({ id: newId(), title, color, slot })
  const events: CalendarEvent[] = [
    event('Atelier aquarelle', '#9065B0', timed(-7, '18:00', '20:00')),
    event('Dentiste', '#D44C47', timed(2, '10:00', '10:45')),
    event('Anniversaire de Hery', '#CB912F', allDay(3)),
    event('Réunion client', '#337EA9', timed(3, '14:00', '15:00')),
    event('Salon BD', '#9065B0', allDay(5)),
    event('Appel famille', '#448361', timed(6, '18:00', '19:00')),
    event('Concert', '#C14C8A', timed(11, '20:00', '23:00')),
  ]

  const lectures = NOTION_CATALOG[0]
  tasks.push(...notionTasks(lectures, now))

  const view = (mode: CalendarView['mode'], name: string, position: number, filters = EMPTY_FILTERS): CalendarView => ({
    id: newId(),
    mode,
    name,
    position,
    filters: { ...filters },
    unscheduledOpen: true,
  })

  return {
    categories: [projet, dessin, perso],
    subcategories: [portfolio, shifterra, ikaly, painting, croquis, sport, maison],
    tasks,
    events,
    icons,
    notionSources: [{ id: lectures.id, name: lectures.name, icon: lectures.icon, showInCalendar: true }],
    views: [
      view('month', 'Mois', 0),
      view('week', 'Ma semaine', 0),
      view('week', 'Projets', 1, { ...EMPTY_FILTERS, categoryIds: [projet.id] }),
      view('day', 'Aujourd’hui', 0),
    ],
    settings: {
      openFormAfterQuickCreate: false,
      defaultDurationMin: 30,
      defaultCategoryColor: '#337EA9',
      defaultEventColor: '#C14C8A',
      showMascot: true,
      doneStyle: 'faded',
      peekMode: 'side',
      progressStyle: 'pills',
      theme: 'journal',
      showPlatformTasks: true,
      simulateNotionFailure: false,
      bilanSubcategoryIds: [portfolio.id, shifterra.id, ikaly.id],
      colorMode: 'category',
      eisenhowerColors: { ...DEFAULT_EISENHOWER_COLORS },
      pomodoro: { ...DEFAULT_POMODORO },
      mascot: structuredClone(DEFAULT_MASCOT_LINES),
    },
    trash: [],
    pomodoroSessions: [],
  }
}
