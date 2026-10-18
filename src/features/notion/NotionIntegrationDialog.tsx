import { CheckCircle2, CircleAlert, Database, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { NOTION_CATALOG, type NotionCatalogDb } from '@/mock/notionCatalog'
import { useApp } from '@/store/appStore'
import { ui, useUi } from '@/store/uiStore'

type Step = 'connect' | 'choose' | 'checking' | 'ready' | 'ask' | 'refused' | 'working'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Parcours d'intégration simulé (calendrier.md l. 59) : connexion, choix d'une base,
 * vérification des dates début / fin, et proposition de les créer si elles manquent.
 */
export function NotionIntegrationDialog() {
  const open = useUi((s) => s.notionDialogOpen)
  const sources = useApp((s) => s.data.notionSources)
  const integrate = useApp((s) => s.integrateNotion)
  const [step, setStep] = useState<Step>('connect')
  const [db, setDb] = useState<NotionCatalogDb | null>(null)

  useEffect(() => {
    if (open) {
      setStep(sources.length > 0 ? 'choose' : 'connect')
      setDb(null)
    }
    // On ne réinitialise qu'à l'ouverture (pas quand la liste des sources change).
  }, [open])

  const close = () => ui.set({ notionDialogOpen: false })
  const available = NOTION_CATALOG.filter((d) => !sources.some((s) => s.id === d.id))

  const choose = async (d: NotionCatalogDb) => {
    setDb(d)
    setStep('checking')
    await wait(700)
    setStep(d.hasDates ? 'ready' : 'ask')
  }

  const finish = async (message: string) => {
    if (!db) return
    setStep('working')
    await wait(800)
    integrate(db.id)
    toast.success(message)
    close()
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && close()} title="Intégrer une base Notion" description="Ses tâches s'afficheront dans le calendrier, lues en direct depuis Notion.">
      {step === 'connect' && (
        <div className="py-2 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl border border-line font-serif text-2xl font-bold">N</div>
          <p className="mb-4 text-sm text-ink-2">Autorise l'application à lire tes bases Notion (démo : aucune vraie connexion).</p>
          <Button
            variant="primary"
            onClick={async () => {
              setStep('working')
              await wait(800)
              setStep('choose')
            }}
          >
            Se connecter à Notion
          </Button>
        </div>
      )}

      {step === 'choose' && (
        <div className="space-y-1 py-1">
          <p className="mb-2 text-sm text-ink-2">Choisis une base de ton espace :</p>
          {available.length === 0 && <p className="text-sm text-ink-3">Toutes les bases de la démo sont déjà intégrées.</p>}
          {available.map((d) => (
            <button key={d.id} type="button" onClick={() => choose(d)} className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left hover:bg-hover">
              <span className="text-xl">{d.icon}</span>
              <span className="flex-1">
                <span className="block text-sm font-medium">{d.name}</span>
                <span className="block text-xs text-ink-3">{d.pages.length} pages</span>
              </span>
              <Database size={15} className="text-ink-3" />
            </button>
          ))}
        </div>
      )}

      {(step === 'checking' || step === 'working') && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-2">
          <LoaderCircle size={16} className="animate-spin" />
          {step === 'checking' ? `Vérification des propriétés de « ${db?.name} »…` : 'Communication avec Notion…'}
        </div>
      )}

      {step === 'ready' && db && (
        <div className="py-1">
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#edf3ec] p-3 text-sm">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#448361]" />
            <span>
              « {db.name} » contient bien une <b>date de début</b> et une <b>date de fin</b>. Elle peut être intégrée.
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('choose')}>
              Retour
            </Button>
            <Button variant="primary" onClick={() => finish(`« ${db.name} » est intégrée au calendrier`)}>
              Intégrer
            </Button>
          </div>
        </div>
      )}

      {step === 'ask' && db && (
        <div className="py-1">
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#fbf3db] p-3 text-sm">
            <CircleAlert size={17} className="mt-0.5 shrink-0 text-[#CB912F]" />
            <span>
              « {db.name} » n'a pas de date de début et de fin. Veux-tu créer les propriétés <b>Date début</b> et <b>Date fin</b> dans cette base Notion ?
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('refused')}>
              Non
            </Button>
            <Button variant="primary" onClick={() => finish(`Propriétés créées : « ${db.name} » est intégrée`)}>
              Oui, créer les dates
            </Button>
          </div>
        </div>
      )}

      {step === 'refused' && db && (
        <div className="py-2">
          <p className="mb-4 text-sm text-ink-2">« {db.name} » n'a pas été intégrée : sans dates, ses tâches ne peuvent pas être placées dans le calendrier.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('choose')}>
              Choisir une autre base
            </Button>
            <Button onClick={close}>Fermer</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
