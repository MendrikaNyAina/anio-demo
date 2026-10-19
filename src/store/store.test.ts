import { describe, expect, it } from 'vitest'
import { useApp } from './appStore'

const app = () => useApp.getState()

describe('poubelle (store)', () => {
  it('restaure une catégorie, ses sous-catégories et les liens de ses tâches', () => {
    app().resetDemo()
    const projet = app().data.categories.find((c) => c.name === 'Projet')!
    const linked = app().data.tasks.filter((t) => t.categoryIds.includes(projet.id))
    const before = new Map(linked.map((t) => [t.id, [...t.subcategoryIds]]))
    app().deleteCategory(projet.id)
    expect(app().data.categories.some((c) => c.id === projet.id)).toBe(false)
    expect(app().data.trash).toHaveLength(1)
    app().restoreTrash(app().data.trash[0].id)
    expect(app().data.trash).toHaveLength(0)
    expect(app().data.categories.some((c) => c.id === projet.id)).toBe(true)
    for (const t of app().data.tasks.filter((t) => before.has(t.id))) expect([...t.subcategoryIds].sort()).toEqual(before.get(t.id)!.sort())
  })

  it('une suppression définitive ne passe pas par la poubelle', () => {
    app().resetDemo()
    const id = app().data.tasks[0].id
    app().deleteTask(id, { permanent: true })
    expect(app().data.trash).toHaveLength(0)
  })
})

describe('créneaux cochés', () => {
  it('la tâche étalée est faite quand tous ses créneaux le sont, avec sa date de fin', () => {
    app().resetDemo()
    const t = app().data.tasks.find((x) => x.kind === 'spread' && !x.done && x.slots.length >= 2 && !x.source)!
    for (const s of t.slots) app().toggleSlotDone(t.id, s.id)
    const done = app().data.tasks.find((x) => x.id === t.id)!
    expect(done.done).toBe(true)
    expect(done.doneAt).toBeDefined()
    app().toggleSlotDone(t.id, t.slots[0].id)
    expect(app().data.tasks.find((x) => x.id === t.id)!.done).toBe(false)
    app().toggleTaskDone(t.id)
    expect(app().data.tasks.find((x) => x.id === t.id)!.slots.every((s) => s.done)).toBe(true)
  })

  it('transforme une tâche simple en habitude le jour de son créneau', () => {
    app().resetDemo()
    const t = app().data.tasks.find((x) => x.kind === 'simple' && x.slots.length === 1 && !x.slots[0].allDay && !x.source)!
    app().convertToHabit(t.id)
    const h = app().data.tasks.find((x) => x.id === t.id)!
    expect(h.kind).toBe('habit')
    expect(h.slots).toHaveLength(0)
    expect(h.recurrence?.weekdays).toHaveLength(1)
    expect(h.recurrence?.startTime).toBeDefined()
  })
})
