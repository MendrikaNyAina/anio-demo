import { MessageCircle, Plus, RotateCcw, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { PanelCard } from '@/components/PanelCard'
import { ThemedPage } from '@/components/ThemedPage'
import { Button } from '@/components/ui/button'
import { inputClass, Switch } from '@/components/ui/controls'
import { fillTemplate, MASCOT_CODES, mascotContext, randomLine } from '@/domain/mascot'
import { DEFAULT_MASCOT_LINES, type MascotLines } from '@/domain/types'
import { GhostCat } from '@/features/layout/Mascot'
import { cn } from '@/lib/utils'
import { useApp, useTheme } from '@/store/appStore'
import { ui } from '@/store/uiStore'

// Page Mascotte : ce que dit le petit fantôme, avec des codes remplacés par les chiffres du jour.

const LISTS: { key: keyof MascotLines; title: string; hint: string }[] = [
  { key: 'clickTodo', title: 'Au clic, s’il reste des tâches', hint: 'Quand tu cliques sur la mascotte et qu’il reste quelque chose à faire aujourd’hui.' },
  { key: 'clickDone', title: 'Au clic, quand tout est fait', hint: 'Toutes les tâches et habitudes du jour sont cochées.' },
  { key: 'clickEmpty', title: 'Au clic, quand rien n’est prévu', hint: 'Aucune tâche ni habitude aujourd’hui.' },
  { key: 'idle', title: 'Au repos', hint: 'De temps en temps, quand elle se pose quelque part sur l’écran.' },
]

/** Champ ciblé par les boutons de codes : la liste, la ligne et la position du curseur. */
type Target = { list: keyof MascotLines; index: number; at: number }

export function MascotPage() {
  const data = useApp((s) => s.data)
  const session = useApp((s) => s.session)
  const lines = data.settings.mascot
  const updateSettings = useApp((s) => s.updateSettings)
  const journal = useTheme() === 'journal'
  const ctx = useMemo(() => mascotContext(data, session?.name ?? ''), [data, session])
  const target = useRef<Target | null>(null)
  const [preview, setPreview] = useState<string>(() => fillTemplate(randomLine(lines.clickTodo) ?? '', ctx))

  const setList = (list: keyof MascotLines, next: string[]) => updateSettings({ mascot: { ...lines, [list]: next } })
  const setLine = (list: keyof MascotLines, index: number, text: string) => setList(list, lines[list].map((l, i) => (i === index ? text : l)))

  /** Insère `{code}` à l'endroit du curseur, ou dans une nouvelle phrase « au clic » si aucun champ n'a été choisi. */
  const insert = (code: string) => {
    const token = `{${code}}`
    const t = target.current
    if (!t || t.index >= lines[t.list].length) {
      setList('clickTodo', [...lines.clickTodo, token])
      target.current = { list: 'clickTodo', index: lines.clickTodo.length, at: token.length }
      return
    }
    const text = lines[t.list][t.index]
    setLine(t.list, t.index, text.slice(0, t.at) + token + text.slice(t.at))
    target.current = { ...t, at: t.at + token.length }
  }

  return (
    <ThemedPage
      icon="👻"
      tab="ma mascotte"
      title="Mascotte"
      description="Choisis ce que dit le petit fantôme. Les codes entre accolades sont remplacés par tes chiffres du jour."
      actions={
        <Button
          variant="outline"
          onClick={() =>
            ui.confirm({
              title: 'Remettre les phrases par défaut ?',
              message: 'Tes phrases personnalisées seront remplacées.',
              confirmLabel: 'Remettre',
              onConfirm: () => updateSettings({ mascot: structuredClone(DEFAULT_MASCOT_LINES) }),
            })
          }
        >
          <RotateCcw size={14} /> Phrases par défaut
        </Button>
      }
    >
      <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
          {LISTS.map((list) => (
            <PanelCard key={list.key} title={list.title}>
              <p className="mb-2 text-xs text-ink-3">{list.hint}</p>
              <div className="flex flex-col gap-2">
                {lines[list.key].map((line, index) => (
                  <div key={index} className="group">
                    <div className="flex items-center gap-1.5">
                      <input
                        value={line}
                        placeholder="Nouvelle phrase…"
                        aria-label={`${list.title}, phrase ${index + 1}`}
                        onChange={(e) => {
                          setLine(list.key, index, e.target.value)
                          target.current = { list: list.key, index, at: e.target.selectionStart ?? e.target.value.length }
                        }}
                        onSelect={(e) => (target.current = { list: list.key, index, at: e.currentTarget.selectionStart ?? line.length })}
                        onFocus={(e) => (target.current = { list: list.key, index, at: e.currentTarget.selectionStart ?? line.length })}
                        className={cn(inputClass, journal && 'rounded-[10px] border-[#C9CDFF] focus:border-[#8C92E8]')}
                      />
                      <button
                        type="button"
                        onClick={() => setPreview(fillTemplate(line, ctx))}
                        title="Faire dire cette phrase"
                        aria-label="Faire dire cette phrase"
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-hover hover:text-ink"
                      >
                        <MessageCircle size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setList(list.key, lines[list.key].filter((_, i) => i !== index))}
                        title="Supprimer la phrase"
                        aria-label="Supprimer la phrase"
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-hover hover:text-ink"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    {/\{\w+\}/.test(line) && <p className="mt-0.5 truncate pl-2 text-xs text-ink-3">→ {fillTemplate(line, ctx)}</p>}
                  </div>
                ))}
                {lines[list.key].length === 0 && <p className="text-sm text-ink-2">Aucune phrase : la mascotte utilisera celles par défaut.</p>}
              </div>
              <Button
                size="sm"
                variant="subtle"
                className="mt-2"
                onClick={() => {
                  setList(list.key, [...lines[list.key], ''])
                  target.current = { list: list.key, index: lines[list.key].length, at: 0 }
                }}
              >
                <Plus size={14} /> Ajouter une phrase
              </Button>
            </PanelCard>
          ))}
        </div>

        <aside className="flex max-w-[420px] min-w-0 flex-[1_1_300px] flex-col gap-5 xl:sticky xl:top-4">
          <PanelCard title="Aperçu">
            <div className="flex flex-col items-center gap-3 pt-2 pb-3">
              <div
                className={cn(
                  'w-max max-w-full px-3 py-1.5 text-center text-[13px]',
                  journal ? 'rounded-2xl border-2 border-[#A3A8EE] bg-white font-plate font-medium text-[#2F2B6E] shadow-[0_4px_0_#DCDDFF]' : 'rounded-xl bg-white shadow-pop',
                )}
              >
                {preview || '…'}
              </div>
              <div className="size-20">
                <GhostCat mood="happy" facing={1} />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const all = LISTS.flatMap((l) => lines[l.key])
                  setPreview(fillTemplate(randomLine(all) ?? '', ctx))
                }}
              >
                Une phrase au hasard
              </Button>
            </div>
          </PanelCard>

          <PanelCard title="Codes">
            <p className="mb-2 text-xs text-ink-3">Clique sur un code pour l’insérer à l’endroit du curseur dans la phrase choisie.</p>
            <div className="flex flex-col gap-1">
              {MASCOT_CODES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  // Garde le focus (et le curseur) dans le champ en cours.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(c.code)}
                  className={cn('flex items-center gap-2 px-2 py-1 text-left text-[13px]', journal ? 'rounded-[10px] hover:bg-[#F4F3FF]' : 'rounded-md hover:bg-hover')}
                >
                  <code className={cn('shrink-0 rounded px-1.5 py-0.5 font-mono text-xs', journal ? 'bg-[#DCDDFF] text-[#2F2B6E]' : 'bg-[#F1F1EF] text-[#EB5757]')}>{`{${c.code}}`}</code>
                  <span className="min-w-0 flex-1 truncate text-ink-2">{c.label}</span>
                  <span className="max-w-[90px] shrink-0 truncate text-xs text-ink-3">{ctx[c.code]}</span>
                </button>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Affichage">
            <div className="flex items-center justify-between gap-3 text-sm">
              Afficher la mascotte
              <Switch checked={data.settings.showMascot} onChange={(showMascot) => updateSettings({ showMascot })} label="Afficher la mascotte" />
            </div>
          </PanelCard>
        </aside>
      </div>
    </ThemedPage>
  )
}
