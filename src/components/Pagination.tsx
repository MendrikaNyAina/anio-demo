import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'

export const PAGE_SIZE = 50

export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  const from = page * PAGE_SIZE + 1
  const to = Math.min(total, (page + 1) * PAGE_SIZE)
  return (
    <div className="flex items-center justify-end gap-1 py-1 pr-2 text-xs text-ink-2">
      <span className="mr-1 tabular-nums">
        {from}–{to} sur {total}
      </span>
      <Button size="icon-sm" variant="subtle" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Page précédente">
        <ChevronLeft size={14} />
      </Button>
      <Button size="icon-sm" variant="subtle" disabled={page >= pages - 1} onClick={() => onChange(page + 1)} aria-label="Page suivante">
        <ChevronRight size={14} />
      </Button>
    </div>
  )
}
