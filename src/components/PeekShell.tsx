import * as RadixDialog from '@radix-ui/react-dialog'
import { Maximize2, Minimize2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { Button } from './ui/button'

/**
 * Coque d'une « page » façon Notion : panneau latéral ou fenêtre centrée selon le réglage
 * « Ouverture d'une tâche ». Partagée par la page d'une tâche et la fiche d'une catégorie.
 */
export function PeekShell({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const mode = useApp((s) => s.data.settings.peekMode)
  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={cn('fixed inset-0 z-30', mode === 'center' ? 'bg-[rgb(15_15_15/35%)]' : 'bg-transparent')} />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed z-30 flex flex-col overflow-hidden bg-white shadow-pop outline-none',
            mode === 'side'
              ? 'top-0 right-0 h-full w-[min(560px,100vw)] animate-[pop_150ms_ease-out]'
              : 'top-[6vh] left-1/2 h-[88vh] w-[min(820px,calc(100vw-32px))] -translate-x-1/2 animate-pop rounded-xl',
          )}
        >
          <RadixDialog.Title className="sr-only">{label}</RadixDialog.Title>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

/** Boutons « Fermer » et « panneau / fenêtre » en haut à gauche d'une page. */
export function PeekControls({ onClose }: { onClose: () => void }) {
  const mode = useApp((s) => s.data.settings.peekMode)
  const updateSettings = useApp((s) => s.updateSettings)
  return (
    <>
      <Button size="icon" variant="subtle" onClick={onClose} aria-label="Fermer">
        <X size={16} />
      </Button>
      <Button
        size="icon"
        variant="subtle"
        onClick={() => updateSettings({ peekMode: mode === 'side' ? 'center' : 'side' })}
        title={mode === 'side' ? 'Ouvrir en fenêtre centrée' : 'Ouvrir en panneau latéral'}
      >
        {mode === 'side' ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
      </Button>
    </>
  )
}
