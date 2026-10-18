import * as RadixPopover from '@radix-ui/react-popover'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const contentClass = 'z-50 animate-pop rounded-lg bg-white p-1 shadow-pop outline-none'

interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Popover({ trigger, children, open, onOpenChange, align = 'start', side = 'bottom', className }: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content align={align} side={side} sideOffset={4} collisionPadding={8} className={cn(contentClass, className)}>
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}

interface AnchoredPopoverProps {
  x: number
  y: number
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  className?: string
}

/** Popover positionné à des coordonnées (clic droit, menu 3 points, clic dans le calendrier). */
export function AnchoredPopover({ x, y, open, onOpenChange, children, className }: AnchoredPopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Anchor asChild>
        <span aria-hidden style={{ position: 'fixed', left: x, top: y, width: 0, height: 0 }} />
      </RadixPopover.Anchor>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(contentClass, className)}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
