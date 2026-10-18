import { useSyncExternalStore } from 'react'

/** Suit une media query CSS (se met à jour quand la fenêtre change de taille). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Écran de téléphone : en dessous du point de rupture `md` de Tailwind (768 px). */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
