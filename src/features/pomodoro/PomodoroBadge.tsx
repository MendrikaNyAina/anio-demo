import { cn } from '@/lib/utils'
import { fmtClock, usePomodoro, useRemainingMs } from '@/store/pomodoroStore'

/** Temps restant à côté de l'entrée « Pomodoro » du menu, tant qu'une phase est lancée. */
export function PomodoroBadge({ journal }: { journal?: boolean }) {
  const status = usePomodoro((s) => s.status)
  if (status === 'idle') return null
  return <Badge journal={journal} paused={status === 'paused'} />
}

function Badge({ journal, paused }: { journal?: boolean; paused: boolean }) {
  const remaining = useRemainingMs()
  return (
    <span
      className={cn(
        'ml-auto rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums',
        journal ? 'border-[1.5px] border-[#A3A8EE] bg-[#F9C6DD] text-[#2F2B6E]' : 'bg-[#FDEBEC] text-[#9F2F2D]',
        paused && 'opacity-60',
      )}
    >
      {fmtClock(remaining)}
    </span>
  )
}
