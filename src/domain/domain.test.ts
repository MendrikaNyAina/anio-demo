import { describe, expect, it } from 'vitest'
import { createSeed } from '@/mock/seed'
import { atTime, clampToDay, isSingleDay, splitByDay } from './dates'
import { buildEntries } from './entries'
import { groupForCategoryPage, normalizeLinks } from './grouping'
import { habitCellState, habitMonthTallies, habitStreaks, habitWeekdayTallies, habitYearStats, isHabitEnded } from './habitTracking'
import { expandHabit } from './habits'
import { buildLookup } from './lookup'
import { clickSituation, fillTemplate } from './mascot'
import { buildMatrix, periodRange, quadrantOf } from './eisenhower'
import { taskProgress, weekProgress } from './progress'
import { globalStats } from './stats'
import { keepRecent, trashDaysLeft } from './trash'
import { resolveTaskStyle } from './style'
import { canDragOccurrence, expandEvent, moveSeries, nextOccurrence, repeatError } from './events'
import { EMPTY_FILTERS, OTHER, type CalendarEvent, type DataState, type EventRepeat, type Slot, type Task } from './types'
import { passesCategoryFilter } from './visibility'

// Le changement d'heure testé plus bas est celui de la France.
process.env.TZ = 'Europe/Paris'

const task = (p: Partial<Task>): Task => ({
  id: 't',
  kind: 'simple',
  title: 'T',
  done: false,
  subtasks: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  categoryIds: [],
  subcategoryIds: [],
  slots: [],
  occurrences: {},
  ...p,
})

function fixture(): DataState {
  return createSeed(new Date(2026, 9, 13, 12))
}

describe('resolveTaskStyle', () => {
  const data = fixture()
  const lookup = buildLookup(data)
  const [projet] = data.categories
  const portfolio = data.subcategories.find((s) => s.name === 'Portfolio')!

  it('prend la sous-catégorie principale en priorité', () => {
    const style = resolveTaskStyle({ primaryCategoryId: projet.id, primarySubcategoryId: portfolio.id }, lookup)
    expect(style).toEqual({ color: portfolio.color, target: portfolio.styleTarget, icon: portfolio.icon })
  })
  it('à défaut, la catégorie principale', () => {
    expect(resolveTaskStyle({ primaryCategoryId: projet.id }, lookup)).toEqual({ color: projet.color, target: projet.styleTarget, icon: projet.icon })
  })
  it('sans catégorie (« Autre ») : aucun style', () => {
    expect(resolveTaskStyle({}, lookup)).toBeNull()
  })
})

describe('groupForCategoryPage', () => {
  const data = fixture()
  const groups = groupForCategoryPage(data)

  it('range les tâches sans catégorie dans « Autre », sans sous-catégorie intermédiaire', () => {
    const other = groups.find((g) => g.key === OTHER)!
    expect(other.subgroups).toHaveLength(0)
    expect(other.tasks.map((t) => t.title)).toContain('Appeler le plombier')
  })
  it('range une tâche sans sous-catégorie dans la sous-catégorie « Autre » de sa catégorie', () => {
    const dessin = groups.find((g) => g.category?.name === 'Dessin')!
    const otherSub = dessin.subgroups.find((g) => !g.subcategory)!
    expect(otherSub.tasks.map((t) => t.title)).toContain('Commander un nouveau stylet')
  })
  it('affiche une tâche multi-catégories dans chacun de ses groupes', () => {
    const titles = groups.flatMap((g) => g.subgroups.flatMap((s) => s.tasks.map((t) => t.title)))
    expect(titles.filter((t) => t === "Maquette de la page d'accueil")).toHaveLength(2)
  })
  it("n'affiche pas les tâches Notion", () => {
    const titles = groups.flatMap((g) => [...g.tasks, ...g.subgroups.flatMap((s) => s.tasks)]).map((t) => t.title)
    expect(titles).not.toContain('Finir Dune')
  })
})

describe('normalizeLinks', () => {
  it('retire une sous-catégorie dont la catégorie n’est plus liée, et recalcule les principales', () => {
    const links = { categoryIds: ['b'], primaryCategoryId: 'a', subcategoryIds: ['sa', 'sb'], primarySubcategoryId: 'sa' }
    normalizeLinks(links, [
      { id: 'sa', categoryId: 'a' },
      { id: 'sb', categoryId: 'b' },
    ])
    expect(links).toEqual({ categoryIds: ['b'], primaryCategoryId: 'b', subcategoryIds: ['sb'], primarySubcategoryId: 'sb' })
  })
})

describe('expandHabit', () => {
  const habit = task({
    kind: 'habit',
    recurrence: { weekdays: [1, 5], startDate: '2026-10-01', endDate: '2026-10-31', startTime: '08:00', durationMin: 30 },
    occurrences: { '2026-10-16': { done: true, start: atTime('2026-10-16', '19:00').toISOString(), end: atTime('2026-10-16', '20:00').toISOString() } },
  })

  it('ne génère que les jours choisis, dans la période', () => {
    const occ = expandHabit(habit, { start: new Date(2026, 9, 12), end: new Date(2026, 9, 19) })
    expect(occ.map((o) => o.date)).toEqual(['2026-10-12', '2026-10-16'])
  })
  it("applique l'exception d'un jour (cochée, heure choisie)", () => {
    const [, friday] = expandHabit(habit, { start: new Date(2026, 9, 12), end: new Date(2026, 9, 19) })
    expect(friday.done).toBe(true)
    expect(friday.start!.getHours()).toBe(19)
  })
  it("reste à 8 h après le passage à l'heure d'hiver (25 octobre 2026)", () => {
    // Lun. 19, ven. 23 (heure d'été), lun. 26, ven. 30 (heure d'hiver).
    const occ = expandHabit(habit, { start: new Date(2026, 9, 19), end: new Date(2026, 10, 3) })
    expect(occ.map((o) => o.start!.getHours())).toEqual([8, 8, 8, 8])
  })
  it("s'arrête à la date de fin", () => {
    const occ = expandHabit(habit, { start: new Date(2026, 10, 1), end: new Date(2026, 10, 30) })
    expect(occ).toHaveLength(0)
  })
  it('une habitude sans heure donne des occurrences en journée entière', () => {
    const free = task({ kind: 'habit', recurrence: { weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: '2026-10-12', durationMin: 60 } })
    const [first] = expandHabit(free, { start: new Date(2026, 9, 12), end: new Date(2026, 9, 13) })
    expect(first.start).toBeUndefined()
  })
})

describe('événements répétés', () => {
  const ev = (slot: Slot, repeat?: EventRepeat): CalendarEvent => ({ id: 'e', title: 'E', color: '#337EA9', slot, repeat })
  const day = (key: string): Slot => ({ id: 's', allDay: true, startsOn: key, endsOn: key })
  const year = (y: number) => ({ start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) })
  const days = (slots: Slot[]) => slots.map((s) => (s.allDay ? s.startsOn : s.start))

  it('sans répétition : le créneau seul, s’il touche la période', () => {
    expect(days(expandEvent(ev(day('2026-10-14')), year(2026)))).toEqual(['2026-10-14'])
    expect(expandEvent(ev(day('2026-10-14')), year(2027))).toEqual([])
  })
  it('un anniversaire revient chaque année, même très ancien, mais pas avant sa date', () => {
    const birthday = ev(day('1990-10-14'), 'yearly')
    expect(days(expandEvent(birthday, year(2027)))).toEqual(['2027-10-14'])
    expect(expandEvent(birthday, year(1989))).toEqual([])
  })
  it('un 29 février tombe le 28 les années non bissextiles', () => {
    expect(days(expandEvent(ev(day('2024-02-29'), 'yearly'), year(2027)))).toEqual(['2027-02-28'])
    expect(days(expandEvent(ev(day('2024-02-29'), 'yearly'), year(2028)))).toEqual(['2028-02-29'])
  })
  it('un événement du 31 tombe en fin de mois court, puis revient au 31', () => {
    const range = { start: new Date(2026, 1, 1), end: new Date(2026, 3, 1) }
    expect(days(expandEvent(ev(day('2026-01-31'), 'monthly'), range))).toEqual(['2026-02-28', '2026-03-31'])
  })
  it('chaque semaine, le même jour', () => {
    const range = { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) }
    expect(days(expandEvent(ev(day('2026-10-05'), 'weekly'), range))).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
  })
  it('garde la durée d’un événement de plusieurs jours, y compris s’il a commencé avant la période', () => {
    const trip: Slot = { id: 's', allDay: true, startsOn: '2026-03-30', endsOn: '2026-04-02' }
    const [occ] = expandEvent(ev(trip, 'yearly'), { start: new Date(2027, 3, 1), end: new Date(2027, 4, 1) })
    expect(occ).toMatchObject({ startsOn: '2027-03-30', endsOn: '2027-04-02' })
  })
  it('garde l’heure locale après le changement d’heure', () => {
    const call: Slot = { id: 's', allDay: false, start: atTime('2026-10-19', '18:00').toISOString(), end: atTime('2026-10-19', '19:00').toISOString() }
    const [occ] = expandEvent(ev(call, 'weekly'), { start: new Date(2026, 10, 2), end: new Date(2026, 10, 3) })
    expect(occ.allDay === false && new Date(occ.start).getHours()).toBe(18)
  })
  it('prochaine occurrence : null pour un événement passé, la suivante pour un événement répété', () => {
    const now = new Date(2026, 9, 20)
    expect(nextOccurrence(ev(day('2026-10-14')), now)).toBeNull()
    expect(nextOccurrence(ev(day('2020-10-14'), 'yearly'), now)).toMatchObject({ startsOn: '2027-10-14' })
    expect(nextOccurrence(ev(day('2020-10-20'), 'yearly'), now)).toMatchObject({ startsOn: '2026-10-20' })
  })
  it('respecte les bornes de la répétition, incluses', () => {
    const range = { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) }
    const weekly = { ...ev(day('2026-10-05'), 'weekly'), repeatStart: '2026-10-12', repeatEnd: '2026-10-19' }
    expect(days(expandEvent(weekly, range))).toEqual(['2026-10-12', '2026-10-19'])
  })
  it('un anniversaire arrêté n’a plus de prochaine occurrence', () => {
    const ended = { ...ev(day('1990-10-14'), 'yearly'), repeatEnd: '2025-12-31' }
    expect(nextOccurrence(ended, new Date(2026, 9, 20))).toBeNull()
    expect(days(expandEvent(ended, year(2025)))).toEqual(['2025-10-14'])
  })
  it('prochaine occurrence d’une répétition qui commence plus tard', () => {
    const later = { ...ev(day('2020-10-14'), 'yearly'), repeatStart: '2029-01-01' }
    expect(nextOccurrence(later, new Date(2026, 9, 20))).toMatchObject({ startsOn: '2029-10-14' })
  })
  it('refuse une fin de répétition avant son début', () => {
    expect(repeatError({ ...ev(day('2026-10-14'), 'yearly'), repeatEnd: '2026-10-01' })).not.toBeNull()
    expect(repeatError({ ...ev(day('2026-10-14'), 'yearly'), repeatStart: '2026-01-01', repeatEnd: '2026-10-01' })).toBeNull()
    expect(repeatError({ ...ev(day('2026-10-14')), repeatEnd: '2026-10-01' })).toBeNull()
  })
  it('chaque occurrence devient une entrée du calendrier, avec sa propre clé', () => {
    const data = { ...createSeed(), tasks: [], events: [ev(day('2026-10-05'), 'weekly')] }
    const entries = buildEntries(data, { range: { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) } })
    expect(entries).toHaveLength(4)
    expect(new Set(entries.map((e) => e.key)).size).toBe(4)
    expect(entries.every((e) => e.eventId === 'e')).toBe(true)
  })
  it('glisser une occurrence décale toute la série', () => {
    const birthday = ev(day('1990-10-14'), 'yearly')
    expect(moveSeries(birthday, new Date(2027, 9, 14), day('2027-10-16'))).toMatchObject({ startsOn: '1990-10-16' })
    // Occurrence de février d'un événement du 31 janvier (tombée le 28) glissée au 25 : la série passe au 25.
    const rent = ev(day('2026-01-31'), 'monthly')
    expect(moveSeries(rent, new Date(2026, 1, 28), day('2026-02-25'))).toMatchObject({ startsOn: '2026-01-25' })
    expect(canDragOccurrence('weekly')).toBe(false)
    expect(canDragOccurrence('yearly')).toBe(true)
  })
})

describe('filtre catégories : la sous-catégorie prime', () => {
  const data = fixture()
  const lookup = buildLookup(data)
  const projet = data.categories.find((c) => c.name === 'Projet')!
  const portfolio = data.subcategories.find((s) => s.name === 'Portfolio')!
  const shifterra = data.subcategories.find((s) => s.name === 'Shifterra')!
  const inShifterra = task({ categoryIds: [projet.id], subcategoryIds: [shifterra.id] })

  it('catégorie seule : toutes ses tâches', () => {
    expect(passesCategoryFilter(inShifterra, { ...EMPTY_FILTERS, categoryIds: [projet.id] }, lookup)).toBe(true)
  })
  it('catégorie + une de ses sous-catégories : seulement celle-ci', () => {
    expect(passesCategoryFilter(inShifterra, { ...EMPTY_FILTERS, categoryIds: [projet.id], subcategoryIds: [portfolio.id] }, lookup)).toBe(false)
  })
  it('« Autre » sélectionne les tâches sans catégorie', () => {
    expect(passesCategoryFilter(task({}), { ...EMPTY_FILTERS, categoryIds: [OTHER] }, lookup)).toBe(true)
  })
})

describe('weekProgress', () => {
  it('compte une tâche étalée une seule fois, chaque occurrence d’habitude, et ignore les événements', () => {
    const data = fixture()
    const week = { start: new Date(2026, 9, 12), end: new Date(2026, 9, 19) }
    const entries = buildEntries(data, { range: week, respectSwitches: false })
    const progress = weekProgress(entries)
    const spreadSlots = entries.filter((e) => e.title === 'Créer les visuels des pages')
    expect(spreadSlots).toHaveLength(3)
    const sportOccurrences = entries.filter((e) => e.title === 'Sport').length
    expect(sportOccurrences).toBe(7)
    // Unités attendues : tâches (une par tâche) + occurrences d'habitudes, sans événements.
    const tasks = new Set(entries.filter((e) => e.type === 'simple' || e.type === 'spread').map((e) => e.taskId))
    const habits = entries.filter((e) => e.type === 'habit').length
    expect(progress.total).toBe(tasks.size + habits)
  })
})

describe('suivi des habitudes', () => {
  // Lundi, mercredi, vendredi, du 1er au 31 octobre 2026 ; « aujourd'hui » = mercredi 14 octobre.
  const today = new Date(2026, 9, 14, 12)
  const habit = task({
    kind: 'habit',
    recurrence: { weekdays: [1, 3, 5], startDate: '2026-10-01', endDate: '2026-10-31', durationMin: 30 },
    occurrences: { '2026-10-05': { done: true }, '2026-10-09': { done: true } },
  })

  it("distingue fait, raté, aujourd'hui, à venir et non prévu", () => {
    expect(habitCellState(habit, new Date(2026, 9, 5), today)).toBe('done') // lundi coché
    expect(habitCellState(habit, new Date(2026, 9, 7), today)).toBe('missed') // mercredi passé non coché
    expect(habitCellState(habit, new Date(2026, 9, 14), today)).toBe('today')
    expect(habitCellState(habit, new Date(2026, 9, 16), today)).toBe('future')
    expect(habitCellState(habit, new Date(2026, 9, 6), today)).toBe('none') // mardi : pas prévu
    expect(habitCellState(habit, new Date(2026, 8, 30), today)).toBe('none') // avant le début
    expect(habitCellState(habit, new Date(2026, 10, 2), today)).toBe('none') // après la fin
  })

  it("compte les occurrences dues jusqu'à aujourd'hui", () => {
    // Prévus jusqu'au 14 : 2 (ven.), 5, 7, 9, 12, 14 → 6 ; faits : 5 et 9 ; ratés : 2, 7, 12.
    expect(habitYearStats(habit, 2026, today)).toEqual({ done: 2, missed: 3, due: 6 })
  })

  it('considère une habitude terminée seulement après sa date de fin', () => {
    expect(isHabitEnded(habit, today)).toBe(false)
    expect(isHabitEnded(habit, new Date(2026, 10, 1))).toBe(true)
    expect(isHabitEnded(task({ kind: 'habit', recurrence: { weekdays: [1], startDate: '2020-01-01', durationMin: 30 } }), today)).toBe(false)
  })

  it('compte les séries en occurrences, sans casser la série pour aujourd\'hui', () => {
    // Faits : 9, 12 ; ratés : 2, 5, 7 ; aujourd'hui (14) pas encore coché.
    const h = task({ ...habit, occurrences: { '2026-10-09': { done: true }, '2026-10-12': { done: true }, '2026-10-05': { done: false } } })
    expect(habitStreaks(h, today)).toEqual({ current: 2, best: 2 })
    // Un raté entre deux : la série repart à zéro.
    const broken = task({ ...habit, occurrences: { '2026-10-02': { done: true }, '2026-10-05': { done: true }, '2026-10-12': { done: true } } })
    expect(habitStreaks(broken, today)).toEqual({ current: 1, best: 2 })
  })

  it('répartit la réussite par mois et par jour de la semaine', () => {
    const months = habitMonthTallies(habit, 2026, today)
    expect(months[9]).toEqual({ done: 2, due: 6 })
    expect(months[8]).toEqual({ done: 0, due: 0 })
    const days = habitWeekdayTallies(habit, today)
    expect(days[0]).toEqual({ done: 1, due: 2 }) // lundis 5 (fait) et 12
    expect(days[2]).toEqual({ done: 0, due: 2 }) // mercredis 7 et 14 (aujourd'hui)
    expect(days[4]).toEqual({ done: 1, due: 2 }) // vendredis 2 et 9 (fait)
    expect(days[1]).toEqual({ done: 0, due: 0 }) // mardi : jamais prévu
  })
})

describe('icônes SVG collées', () => {
  it('accepte un SVG complet et refuse le reste', async () => {
    const { isSvgDataUrl, svgTextToDataUrl } = await import('@/lib/utils')
    const url = svgTextToDataUrl('  <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>\n')
    expect(url && isSvgDataUrl(url)).toBe(true)
    expect(svgTextToDataUrl('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>')).not.toBeNull()
    expect(svgTextToDataUrl('<div>pas un svg</div>')).toBeNull()
    expect(svgTextToDataUrl('<svg viewBox="0 0 24 24">')).toBeNull() // incomplet
  })
})

describe('créneaux de tâche : un seul jour', () => {
  it('découpe une journée entière de plusieurs jours en un créneau par jour', () => {
    let n = 0
    const slots = splitByDay({ id: 's', allDay: true, startsOn: '2026-10-30', endsOn: '2026-11-01' }, () => `n${++n}`)
    expect(slots).toEqual([
      { id: 's', allDay: true, startsOn: '2026-10-30', endsOn: '2026-10-30' },
      { id: 'n1', allDay: true, startsOn: '2026-10-31', endsOn: '2026-10-31' },
      { id: 'n2', allDay: true, startsOn: '2026-11-01', endsOn: '2026-11-01' },
    ])
  })
  it('ramène un créneau horaire qui passe minuit à 23:59 le même jour', () => {
    const start = atTime('2026-10-13', '22:00').toISOString()
    const slot = clampToDay({ id: 's', allDay: false, start, end: atTime('2026-10-14', '01:00').toISOString() })
    expect(slot).toEqual({ id: 's', allDay: false, start, end: atTime('2026-10-13', '23:59').toISOString() })
  })
  it('laisse intact un créneau déjà sur un seul jour (fin exclusive à minuit comprise)', () => {
    const slot = { id: 's', allDay: false as const, start: atTime('2026-10-13', '09:00').toISOString(), end: atTime('2026-10-13', '10:00').toISOString() }
    expect(clampToDay(slot)).toBe(slot)
    expect(isSingleDay({ start: atTime('2026-10-13', '00:00'), end: atTime('2026-10-14', '00:00') })).toBe(true)
    expect(isSingleDay({ start: atTime('2026-10-13', '23:00'), end: atTime('2026-10-14', '00:30') })).toBe(false)
  })
})

describe('matrice d’Eisenhower', () => {
  it('range une tâche selon urgence × importance, null si incomplet', () => {
    expect(quadrantOf({ urgent: true, priority: 'high' })).toBe('q1')
    expect(quadrantOf({ urgent: false, priority: 'medium' })).toBe('q2')
    expect(quadrantOf({ urgent: true, priority: 'low' })).toBe('q3')
    expect(quadrantOf({ urgent: false, priority: 'low' })).toBe('q4')
    expect(quadrantOf({ urgent: true })).toBeNull()
    expect(quadrantOf({ priority: 'high' })).toBeNull()
  })

  it('ne garde que les tâches de la période, sans habitudes, une seule fois chacune', () => {
    const day = (d: string) => ({ id: d, allDay: true as const, startsOn: d, endsOn: d })
    const tasks = [
      task({ id: 'a', urgent: true, priority: 'high', slots: [day('2026-10-13'), day('2026-10-14')] }),
      task({ id: 'b', slots: [day('2026-10-14')] }),
      task({ id: 'c', urgent: false, priority: 'low', slots: [day('2026-10-30')] }),
      task({ id: 'h', kind: 'habit', urgent: true, priority: 'high' }),
    ]
    const m = buildMatrix({ tasks }, periodRange('week', new Date(2026, 9, 14)))
    expect(m.quadrants.q1.map((t) => t.id)).toEqual(['a'])
    expect(m.unclassified.map((t) => t.id)).toEqual(['b'])
    expect(m.quadrants.q4).toHaveLength(0)
  })

  it('colore la tâche par son quadrant en mode Eisenhower', () => {
    const data = fixture()
    data.settings.colorMode = 'eisenhower'
    const lookup = buildLookup(data)
    const [projet] = data.categories
    expect(resolveTaskStyle({ primaryCategoryId: projet.id, urgent: true, priority: 'high' }, lookup)?.color).toBe(data.settings.eisenhowerColors.q1)
    expect(resolveTaskStyle({ primaryCategoryId: projet.id, kind: 'habit' }, lookup)?.color).toBe(projet.color)
  })
})

describe('taskProgress', () => {
  it('compte les sous-tâches en priorité', () => {
    const p = taskProgress(task({ subtasks: [{ id: '1', title: 'a', done: true }, { id: '2', title: 'b', done: false }] }), '#000')
    expect([p?.done, p?.total, p?.unit]).toEqual([1, 2, 'subtasks'])
  })
  it('sinon les créneaux cochés d’une tâche étalée', () => {
    const slot = (id: string, done: boolean) => ({ id, allDay: true as const, startsOn: '2026-10-13', endsOn: '2026-10-13', done })
    const p = taskProgress(task({ kind: 'spread', slots: [slot('1', true), slot('2', false), slot('3', true)] }), '#000')
    expect([p?.done, p?.total, p?.unit]).toEqual([2, 3, 'slots'])
  })
  it('rien à mesurer pour une tâche simple sans sous-tâche', () => {
    expect(taskProgress(task({}), '#000')).toBeNull()
  })
})

describe('globalStats', () => {
  it('compte les tâches cochées par jour et les projets terminés', () => {
    const data = fixture()
    const now = new Date(2026, 9, 13, 12)
    const stats = globalStats(data, now, 30)
    expect(stats.curve).toHaveLength(30)
    expect(stats.curve.at(-1)!.day).toBe('2026-10-13')
    expect(stats.completedRecent).toBe(stats.curve.reduce((n, c) => n + c.count, 0))
    expect(stats.projects).toBe(data.subcategories.filter((s) => s.isProject).length)
    expect(stats.categories).toBe(data.categories.length)
  })
})

describe('mascotte', () => {
  it('remplace les codes connus et laisse les inconnus', () => {
    expect(fillTemplate('Encore {restantes} pour {prenom} {oups}', { restantes: '3', prenom: 'Mendrika' })).toBe('Encore 3 pour Mendrika {oups}')
  })
  it('choisit la situation au clic', () => {
    expect(clickSituation({ total: '0', restantes: '0' })).toBe('clickEmpty')
    expect(clickSituation({ total: '4', restantes: '0' })).toBe('clickDone')
    expect(clickSituation({ total: '4', restantes: '1' })).toBe('clickTodo')
  })
})

describe('poubelle', () => {
  it('garde 30 jours', () => {
    const now = new Date(2026, 9, 31)
    const item = (deletedAt: string) => ({ id: deletedAt, kind: 'task' as const, deletedAt })
    expect(keepRecent([item('2026-10-30T10:00:00'), item('2026-09-30T10:00:00')], now).map((i) => i.id)).toEqual(['2026-10-30T10:00:00'])
    expect(trashDaysLeft(item('2026-10-30T10:00:00'), now)).toBe(29)
  })
})
