import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  /** Empêche la fermeture par clic à l'extérieur / Échap (formulaires en cours). */
  dismissable?: boolean
}

/** Fenêtre centrée façon Notion. */
export function Modal({ open, onOpenChange, title, description, children, footer, className, dismissable = true }: ModalProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-[rgb(15_15_15/35%)]" />
        <RadixDialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          onPointerDownOutside={(e) => !dismissable && e.preventDefault()}
          onEscapeKeyDown={(e) => !dismissable && e.preventDefault()}
          className={cn(
            'fixed top-[10vh] left-1/2 z-50 flex max-h-[80vh] w-[min(520px,calc(100vw-32px))] -translate-x-1/2 flex-col',
            'animate-pop rounded-xl bg-white shadow-pop outline-none',
            className,
          )}
        >
          <div className="flex items-start gap-3 px-5 pt-4 pb-2">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className="mt-0.5 text-[13px] text-ink-2">{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close className="-mr-1 rounded-md p-1 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Fermer">
              <X size={16} />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
