import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** En-tête de page façon Notion : grande icône, grand titre, actions à droite. */
export function PageHeader({
  icon,
  title,
  description,
  actions,
  className,
}: {
  icon: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <div className="mb-2 text-[36px] leading-none sm:text-[44px]">{icon}</div>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1 text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
