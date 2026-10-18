import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/appStore'
import { journalMenuClass } from '../JournalTitle'

export interface Point {
  x: number
  y: number
}

export type MenuItem =
  | {
      label: string
      icon?: ReactNode
      onSelect: (at: Point) => void
      danger?: boolean
      disabled?: boolean
      hint?: string
    }
  | 'separator'

interface ActionMenuProps {
  at: Point | null
  items: MenuItem[]
  onClose: () => void
}

/** Menu flottant ouvert à une position : utilisé pour le clic droit ET les « 3 points ». */
export function ActionMenu({ at, items, onClose }: ActionMenuProps) {
  const journal = useTheme() === 'journal'
  return (
    <DropdownMenu.Root open={!!at} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DropdownMenu.Trigger asChild>
        <span aria-hidden style={{ position: 'fixed', left: at?.x ?? 0, top: at?.y ?? 0, width: 0, height: 0 }} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={2}
          collisionPadding={8}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={cn('z-50 min-w-[200px] animate-pop bg-white outline-none', journal ? cn(journalMenuClass, 'p-1.5') : 'rounded-lg p-1 shadow-pop')}
        >
          {items.map((item, i) =>
            item === 'separator' ? (
              <DropdownMenu.Separator key={i} className={journal ? 'mx-1 my-1.5 border-t-2 border-dashed border-[#DCDDFF]' : 'my-1 h-px bg-line'} />
            ) : (
              <DropdownMenu.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={() => at && item.onSelect(at)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm outline-none select-none data-[disabled]:cursor-default data-[disabled]:opacity-40',
                  journal ? 'rounded-[10px] font-medium data-[highlighted]:bg-[#F4F3FF]' : 'rounded-md data-[highlighted]:bg-hover',
                  item.danger && 'text-danger',
                )}
              >
                <span className={cn('flex w-4 justify-center [&>svg]:size-4', journal ? 'text-[#6E6BC4]' : 'text-ink-2')}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className={cn('text-xs', journal ? 'text-[#5B57A6]' : 'text-ink-3')}>{item.hint}</span>}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** Raccourci : un menu par ligne, ouvrable au clic droit ou depuis un bouton. */
export function useActionMenu(items: MenuItem[]) {
  const [at, setAt] = useState<Point | null>(null)
  return {
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setAt({ x: e.clientX, y: e.clientY })
    },
    openFromButton: (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation()
      const r = e.currentTarget.getBoundingClientRect()
      setAt({ x: r.right - 200, y: r.bottom })
    },
    isOpen: !!at,
    element: <ActionMenu at={at} items={items} onClose={() => setAt(null)} />,
  }
}
