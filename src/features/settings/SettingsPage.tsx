import { LogOut, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { ColorPicker } from '@/components/ColorPicker'
import { PageHeader } from '@/components/PageHeader'
import { ProgressBar } from '@/components/ProgressBar'
import { Button } from '@/components/ui/button'
import { inputClass, Segmented, Switch } from '@/components/ui/controls'
import { Popover } from '@/components/ui/popover'
import { fmtDuration } from '@/domain/display'
import { QUADRANTS } from '@/domain/eisenhower'
import type { Progress } from '@/domain/progress'
import { DEFAULT_EISENHOWER_COLORS } from '@/domain/types'
import { Page } from '@/features/layout/AppShell'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { ui } from '@/store/uiStore'

/** Aperçu du réglage « Barres de progression » : quelques catégories de la palette. */
const PREVIEW: Progress = {
  done: 7,
  total: 12,
  segments: [
    { color: '#337EA9', count: 3 },
    { color: '#D9730D', count: 2 },
    { color: '#C14C8A', count: 2 },
  ],
}

/** Page Paramètres (calendrier.md l. 73-81), plus quelques réglages propres à la démo. */
export function SettingsPage() {
  const settings = useApp((s) => s.data.settings)
  const update = useApp((s) => s.updateSettings)
  const app = useApp.getState()

  return (
    <Page>
      <PageHeader icon="⚙️" title="Paramètres" />

      <Section title="Calendrier">
        <Setting label="Ouvrir la page après une création rapide" hint="En vue semaine et jour, après avoir créé une tâche simple (sa page) ou un événement (son formulaire) directement dans la grille.">
          <Switch checked={settings.openFormAfterQuickCreate} onChange={(v) => update({ openFormAfterQuickCreate: v })} />
        </Setting>
        <Setting label="Durée par défaut d'une tâche" hint="Utilisée au double-clic dans la grille et quand on place une tâche sans durée.">
          <select className={cn(inputClass, 'w-[120px]')} value={settings.defaultDurationMin} onChange={(e) => update({ defaultDurationMin: Number(e.target.value) })}>
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {fmtDuration(m)}
              </option>
            ))}
          </select>
        </Setting>
      </Section>

      <Section title="Couleurs par défaut">
        <Setting label="Nouvelle catégorie">
          <ColorSetting color={settings.defaultCategoryColor} onChange={(c) => update({ defaultCategoryColor: c })} />
        </Setting>
        <Setting label="Nouvel événement">
          <ColorSetting color={settings.defaultEventColor} onChange={(c) => update({ defaultEventColor: c })} dotted />
        </Setting>
      </Section>

      <Section title="Couleur des tâches">
        <Setting label="Colorer les tâches selon…" hint="Leur catégorie / sous-catégorie, ou leur place dans la matrice d'Eisenhower (urgence × importance). Les habitudes gardent la couleur de leur catégorie.">
          <Segmented
            value={settings.colorMode}
            onChange={(colorMode) => update({ colorMode })}
            options={[
              { value: 'category', label: 'Catégories' },
              { value: 'eisenhower', label: 'Eisenhower' },
            ]}
          />
        </Setting>
        {QUADRANTS.map((q) => (
          <Setting key={q.id} label={q.title} hint={settings.colorMode === 'category' ? 'Utilisée par la vue Matrice du calendrier.' : undefined}>
            <ColorSetting color={settings.eisenhowerColors[q.id]} onChange={(c) => update({ eisenhowerColors: { ...settings.eisenhowerColors, [q.id]: c } })} />
          </Setting>
        ))}
        <Setting label="Couleurs d'origine" hint="Rouge, bleu, orange et gris.">
          <Button variant="outline" onClick={() => update({ eisenhowerColors: { ...DEFAULT_EISENHOWER_COLORS } })}>
            <RotateCcw size={14} /> Rétablir
          </Button>
        </Setting>
      </Section>

      <Section title="Apparence">
        <Setting label="Thème" hint="Journal : titres en étiquette, couleurs lavande, stickers et barres de progression décorées. Notion : tout reste sobre, comme dans Notion.">
          <Segmented
            value={settings.theme ?? 'journal'}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'journal', label: 'Journal' },
              { value: 'notion', label: 'Notion' },
            ]}
          />
        </Setting>
        <Setting label="Afficher la mascotte">
          <Switch checked={settings.showMascot} onChange={(v) => update({ showMascot: v })} />
        </Setting>
        <Setting label="Tâche cochée" hint="À comparer dans la démo : simplement ternie, ou ternie et hachurée.">
          <Segmented
            value={settings.doneStyle}
            onChange={(doneStyle) => update({ doneStyle })}
            options={[
              { value: 'faded', label: 'Ternie' },
              { value: 'hatched', label: 'Hachurée' },
            ]}
          />
        </Setting>
        {(settings.theme ?? 'journal') === 'journal' && (
          <Setting label="Barres de progression" hint="Pilules, fiole magique ou ruban fleuri : appliqué à toutes les barres (calendrier, Bilan, catégories).">
            <div className="flex flex-col items-start gap-2.5 sm:items-end">
              <Segmented
                value={settings.progressStyle ?? 'pills'}
                onChange={(progressStyle) => update({ progressStyle })}
                options={[
                  { value: 'pills', label: 'Pilules' },
                  { value: 'potion', label: 'Fiole' },
                  { value: 'ribbon', label: 'Ruban' },
                ]}
              />
              <ProgressBar progress={PREVIEW} className="w-[240px]" />
            </div>
          </Setting>
        )}
        <Setting label="Ouverture d'une tâche" hint="Comme dans Notion : en panneau sur le côté, ou en fenêtre centrée.">
          <Segmented
            value={settings.peekMode}
            onChange={(peekMode) => update({ peekMode })}
            options={[
              { value: 'side', label: 'Panneau latéral' },
              { value: 'center', label: 'Fenêtre centrée' },
            ]}
          />
        </Setting>
      </Section>

      <Section title="Démo">
        <Setting label="Simuler une erreur réseau Notion" hint="Les modifications de tâches Notion échoueront et seront annulées, pour voir le comportement.">
          <Switch checked={settings.simulateNotionFailure} onChange={(v) => update({ simulateNotionFailure: v })} />
        </Setting>
        <Setting label="Réinitialiser les données" hint="Revenir aux données d'exemple, placées autour de la semaine en cours.">
          <Button
            variant="outline"
            onClick={() =>
              ui.confirm({
                title: 'Réinitialiser la démo ?',
                message: 'Toutes tes modifications seront remplacées par les données de départ.',
                confirmLabel: 'Réinitialiser',
                onConfirm: () => app.resetDemo(),
              })
            }
          >
            <RotateCcw size={14} /> Réinitialiser
          </Button>
        </Setting>
        <Setting label="Se déconnecter">
          <Button variant="outline" onClick={() => app.logout()}>
            <LogOut size={14} /> Déconnexion
          </Button>
        </Setting>
      </Section>
    </Page>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-1 border-b border-line pb-2 text-sm font-semibold">{title}</h2>
      <div className="divide-y divide-line">{children}</div>
    </section>
  )
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    // Téléphone : le réglage passe sous son libellé.
    <div className="flex flex-col items-start gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div>
        <div className="text-sm">{label}</div>
        {hint && <div className="mt-0.5 max-w-[460px] text-xs text-ink-3">{hint}</div>}
      </div>
      <div className="max-w-full sm:shrink-0">{children}</div>
    </div>
  )
}

function ColorSetting({ color, onChange, dotted }: { color: string; onChange: (c: string) => void; dotted?: boolean }) {
  return (
    <Popover
      align="end"
      trigger={
        <button type="button" className="flex items-center gap-2 rounded-md border border-line px-2 py-1 hover:bg-hover">
          <span className={cn('size-4 rounded', dotted && 'border-2 border-dotted')} style={dotted ? { borderColor: color } : { background: color }} />
          <span className="font-mono text-xs uppercase">{color}</span>
        </button>
      }
    >
      <ColorPicker color={color} onColorChange={onChange} />
    </Popover>
  )
}
