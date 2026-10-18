import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onSave: (value: string) => void
  /** Échap, ou validation à vide d'un élément tout juste créé. */
  onCancel?: () => void
  placeholder?: string
  className?: string
  inputClassName?: string
  /** Démarre directement en saisie (nouvelle ligne). */
  startEditing?: boolean
  /** Clic simple = édition. Sinon l'édition se déclenche par `startEditing` uniquement. */
  editOnClick?: boolean
  /** Appelé dès que la saisie se termine (validée, inchangée ou annulée). */
  onEnd?: () => void
}

/** Texte qui devient un champ au clic (Entrée valide, Échap annule). */
export function InlineEditableText({
  value,
  onSave,
  onCancel,
  placeholder = 'Sans titre',
  className,
  inputClassName,
  startEditing = false,
  editOnClick = true,
  onEnd,
}: Props) {
  const [editing, setEditing] = useState(startEditing)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (startEditing) setEditing(true)
  }, [startEditing])

  useEffect(() => {
    if (editing) {
      setDraft(value)
      requestAnimationFrame(() => inputRef.current?.select())
    }
    // `value` volontairement exclu : on ne réinitialise pas pendant la saisie.
  }, [editing])

  const commit = () => {
    setEditing(false)
    onEnd?.()
    const next = draft.trim()
    if (!next && !value && onCancel) return onCancel()
    if (next !== value) onSave(next || placeholder)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setEditing(false)
            onEnd?.()
            if (!value) onCancel?.()
          }
        }}
        className={cn('w-full min-w-0 rounded-sm bg-white px-1 -mx-1 outline-none ring-1 ring-accent/40', inputClassName ?? className)}
      />
    )
  }

  return (
    <span
      className={cn('min-w-0 truncate', editOnClick && 'cursor-text rounded-sm hover:bg-hover', !value && 'text-ink-3', className)}
      onClick={
        editOnClick
          ? (e) => {
              e.stopPropagation()
              setEditing(true)
            }
          : undefined
      }
    >
      {value || placeholder}
    </span>
  )
}
