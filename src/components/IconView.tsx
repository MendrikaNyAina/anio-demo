import { HugeiconsIcon } from '@hugeicons/react'
import type { IconRef } from '@/domain/types'
import { hugeiconLabel, useHugeicons } from '@/lib/hugeicons'
import { cn, isSvgDataUrl } from '@/lib/utils'
import { useApp } from '@/store/appStore'

/**
 * Affiche une icône : emoji, image de la page Icônes, ou icône Hugeicons.
 * `color` : couleur de la catégorie / sous-catégorie. Les icônes Hugeicons et les images SVG sont alors
 * dessinées dans cette couleur ; les emojis et les autres images gardent leurs couleurs.
 */
export function IconView({ icon, size = 16, color, className }: { icon?: IconRef; size?: number; color?: string; className?: string }) {
  const image = useApp((s) => (icon?.type === 'image' ? s.data.icons.find((i) => i.id === icon.iconId) : undefined))
  const hugeicons = useHugeicons(icon?.type === 'hugeicon')
  if (!icon) return null

  if (icon.type === 'emoji') {
    return (
      <span className={cn('inline-flex shrink-0 items-center justify-center leading-none', className)} style={{ fontSize: size * 0.95, width: size, height: size }}>
        {icon.value}
      </span>
    )
  }

  if (icon.type === 'hugeicon') {
    const data = hugeicons?.get(icon.name)
    // Pendant le chargement du jeu d'icônes : une place vide de la bonne taille (pas de saut de mise en page).
    if (!data) return <span aria-hidden className={cn('inline-block shrink-0', className)} style={{ width: size, height: size }} />
    return (
      <span role="img" aria-label={hugeiconLabel(icon.name)} className={cn('inline-flex shrink-0', className)} style={{ width: size, height: size }}>
        <HugeiconsIcon icon={data} size={size} color={color ?? 'currentColor'} strokeWidth={1.8} />
      </span>
    )
  }

  if (!image) return null
  if (color && isSvgDataUrl(image.dataUrl)) {
    const mask = `url("${image.dataUrl}") center / contain no-repeat`
    return (
      <span
        role="img"
        aria-label={image.name}
        className={cn('inline-block shrink-0', className)}
        style={{ width: size, height: size, backgroundColor: color, mask, WebkitMask: mask }}
      />
    )
  }
  return <img src={image.dataUrl} alt={image.name} className={cn('shrink-0 rounded-[3px] object-cover', className)} style={{ width: size, height: size }} />
}
