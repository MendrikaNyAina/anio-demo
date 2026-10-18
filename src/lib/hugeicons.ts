import type { IconSvgElement } from '@hugeicons/react'
import { useEffect, useState } from 'react'

// Icônes Hugeicons (jeu gratuit, licence MIT). Le jeu complet (~6 000 icônes) est lourd :
// il est chargé à la demande, une seule fois, dans un fichier séparé du reste de l'application.

export type HugeiconsSet = Map<string, IconSvgElement>

let cache: HugeiconsSet | null = null
let pending: Promise<HugeiconsSet> | null = null

export function loadHugeicons(): Promise<HugeiconsSet> {
  if (cache) return Promise.resolve(cache)
  pending ??= import('@hugeicons/core-free-icons').then((mod) => {
    // Chaque icône est exportée sous plusieurs alias : on garde le nom canonique « …Icon ».
    const set: HugeiconsSet = new Map()
    for (const [name, data] of Object.entries(mod)) {
      if (name.endsWith('Icon') && Array.isArray(data)) set.set(name, data as IconSvgElement)
    }
    cache = set
    return set
  })
  return pending
}

/** Le jeu d'icônes, une fois chargé (null avant). `enabled` = faux : ne déclenche pas le chargement. */
export function useHugeicons(enabled = true): HugeiconsSet | null {
  const [set, setSet] = useState<HugeiconsSet | null>(cache)
  useEffect(() => {
    if (!enabled || set) return
    let alive = true
    void loadHugeicons().then((loaded) => alive && setSet(loaded))
    return () => {
      alive = false
    }
  }, [enabled, set])
  return set
}

/** « Home01Icon » → « Home 01 », pour l'info-bulle et la recherche. */
export const hugeiconLabel = (name: string) =>
  name
    .replace(/Icon$/, '')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Z])/g, '$1 $2')
