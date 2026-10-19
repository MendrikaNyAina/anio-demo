import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/appStore'
import { JournalTitle } from './JournalTitle'
import { PageHeader } from './PageHeader'

/**
 * Cadre d'une page dans les deux thèmes : titre en étiquette sur toute la largeur (journal, comme le Bilan)
 * ou en-tête Notion dans une colonne centrée (comme les Paramètres).
 */
export function ThemedPage({
  icon,
  tab,
  title,
  description,
  actions,
  wide,
  children,
}: {
  icon: string
  /** Languette du titre journal. */
  tab: string
  title: string
  description?: string
  actions?: ReactNode
  /** Notion : pleine largeur au lieu de la colonne centrée. */
  wide?: boolean
  children: ReactNode
}) {
  const journal = useTheme() === 'journal'
  return (
    <div className="h-full overflow-y-auto">
      {journal ? (
        <div className="px-4 pt-4 pb-24 sm:px-6 sm:pt-6">
          <JournalTitle icon={icon} tab={tab} title={title} description={description} actions={actions} className="mb-6" />
          {children}
        </div>
      ) : (
        <div className={cn('mx-auto w-full px-4 pt-8 pb-24 sm:px-12 sm:pt-14', wide ? 'max-w-[1240px]' : 'max-w-[920px]')}>
          <PageHeader icon={icon} title={title} description={description} actions={actions} />
          {children}
        </div>
      )}
    </div>
  )
}
