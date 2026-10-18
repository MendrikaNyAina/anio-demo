import { describe, expect, it } from 'vitest'
import { createSeed } from '@/mock/seed'
import { atTime, clampToDay, isSingleDay, splitByDay } from './dates'
import { buildEntries } from './entries'
import { groupForCategoryPage, normalizeLinks } from './grouping'
import { habitCellState, habitMonthTallies, habitStreaks, habitWeekdayTallies, habitYearStats, isHabitEnded } from './habitTracking'
import { expandHabit } from './habits'
import { buildLookup } from './lookup'
import { weekProgress } from './progress'
import { resolveTaskStyle } from './style'
import { EMPTY_FILTERS, OTHER, type DataState, type Task } from './types'
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
