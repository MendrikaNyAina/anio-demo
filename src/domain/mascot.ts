import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { dayRange, toKey } from './dates'
import { buildEntries } from './entries'
import type { DataState } from './types'

// Phrases de la mascotte : des gabarits avec des codes entre accolades, remplis avec les chiffres du jour.

export const MASCOT_CODES: { code: string; label: string }[] = [
  { code: 'prenom', label: 'Ton prénom' },
  { code: 'restantes', label: 'Tâches restantes aujourd’hui' },
  { code: 'faites', label: 'Tâches faites aujourd’hui' },
  { code: 'total', label: 'Tâches prévues aujourd’hui' },
  { code: 'habitudes', label: 'Habitudes restantes aujourd’hui' },
  { code: 'evenements', label: 'Événements aujourd’hui' },
  { code: 'prochaine', label: 'Prochaine tâche à heure fixe' },
  { code: 'heure', label: 'Heure actuelle' },
  { code: 'jour', label: 'Jour de la semaine' },
  { code: 'pomodoros', label: 'Pomodoros faits aujourd’hui' },
]

export type MascotContext = Record<string, string>

export function mascotContext(data: DataState, name: string, now = new Date()): MascotContext {
  const today = buildEntries(data, { range: dayRange(now), respectSwitches: false })
  const todo = today.filter((e) => e.done !== undefined)
  const habits = todo.filter((e) => e.type === 'habit')
  const next = todo.filter((e) => !e.allDay && !e.done && e.start > now).sort((a, b) => +a.start - +b.start)[0]
  const todayKey = toKey(now)
  return {
    prenom: name,
    restantes: String(todo.filter((e) => !e.done).length),
    faites: String(todo.filter((e) => e.done).length),
    total: String(todo.length),
    habitudes: String(habits.filter((e) => !e.done).length),
    evenements: String(today.filter((e) => e.type === 'event').length),
    prochaine: next ? `${next.title || 'Sans titre'} à ${format(next.start, 'HH:mm')}` : 'rien',
    heure: format(now, 'HH:mm'),
    jour: format(now, 'EEEE', { locale: fr }),
    pomodoros: String(data.pomodoroSessions.filter((s) => toKey(new Date(s.startedAt)) === todayKey).length),
  }
}

/** Remplace les codes connus ; un code inconnu reste tel quel pour qu'on voie la faute de frappe. */
export const fillTemplate = (text: string, ctx: MascotContext) => text.replace(/\{(\w+)\}/g, (all, code: string) => ctx[code] ?? all)

/** Une phrase au hasard parmi celles qui ne sont pas vides. */
export function randomLine(lines: string[]): string | undefined {
  const usable = lines.filter((l) => l.trim())
  return usable.length ? usable[Math.floor(Math.random() * usable.length)] : undefined
}

/** Situation au clic : il reste des tâches, tout est fait, ou rien n'est prévu. */
export function clickSituation(ctx: MascotContext): 'clickTodo' | 'clickDone' | 'clickEmpty' {
  if (ctx.total === '0') return 'clickEmpty'
  return ctx.restantes === '0' ? 'clickDone' : 'clickTodo'
}
