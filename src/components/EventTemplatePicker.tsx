import { Repeat, X } from 'lucide-react'
import { REPEAT_LABEL } from '@/domain/display'
import type { EventTemplate } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, withUndo } from '@/store/appStore'
import { Tag } from './ui/TagSelect'

/**
 * Modèles d'événements en étiquettes : un clic en applique un (formulaire, page Événements),
 * la croix au survol le supprime.
 */
export function EventTemplatePicker({ label, onPick, className }: { label: string; onPick: (t: EventTemplate) => void; className?: string }) {
  const templates = useApp((s) => s.data.eventTemplates)
  const deleteEventTemplate = useApp((s) => s.deleteEventTemplate)
  if (templates.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <span className="mr-1 text-xs text-ink-3">{label}</span>
      {templates.map((t) => (
        <span key={t.id} className="group/tpl relative inline-flex">
          <button
            type="button"
            onClick={() => onPick(t)}
            title={t.repeat === 'none' ? 'Sans répétition' : `Répété : ${REPEAT_LABEL[t.repeat].toLowerCase()}`}
            className="flex items-center gap-1 rounded-md p-0.5 hover:bg-hover"
          >
            <Tag label={t.name} color={t.color} />
            {t.repeat !== 'none' && <Repeat size={12} className="text-ink-3" />}
          </button>
          <button
            type="button"
            aria-label={`Supprimer le modèle ${t.name}`}
            onClick={() => withUndo('Modèle supprimé', () => deleteEventTemplate(t.id))}
            className="absolute -top-1 -right-1 hidden size-4 items-center justify-center rounded-full border border-line bg-white text-ink-3 group-hover/tpl:flex hover:text-ink"
          >
            <X size={10} />
          </button>
        </span>
      ))}
    </div>
  )
}
