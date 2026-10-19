import { useNavigate } from 'react-router'
import { Segmented } from '@/components/ui/controls'

export type CalendarScreenMode = 'month' | 'week' | 'day' | 'matrix'

/** Mois / Semaine / Jour / Matrice d'Eisenhower, en haut à droite du planning. */
export function ModeSwitch({ value }: { value: CalendarScreenMode }) {
  const navigate = useNavigate()
  return (
    <Segmented<CalendarScreenMode>
      value={value}
      onChange={(m) => navigate(`/calendar/${m}`)}
      options={[
        { value: 'month', label: 'Mois' },
        { value: 'week', label: 'Semaine' },
        { value: 'day', label: 'Jour' },
        { value: 'matrix', label: 'Matrice' },
      ]}
    />
  )
}
