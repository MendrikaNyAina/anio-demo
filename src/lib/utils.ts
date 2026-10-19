import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const newId = () => crypto.randomUUID()

/** Les 10 couleurs de Notion (version « texte ») : base de la palette des catégories. */
export const PALETTE: { name: string; value: string }[] = [
  { name: 'Gris', value: '#787774' },
  { name: 'Marron', value: '#9F6B53' },
  { name: 'Orange', value: '#D9730D' },
  { name: 'Jaune', value: '#CB912F' },
  { name: 'Vert', value: '#448361' },
  { name: 'Bleu', value: '#337EA9' },
  { name: 'Violet', value: '#9065B0' },
  { name: 'Rose', value: '#C14C8A' },
  { name: 'Rouge', value: '#D44C47' },
  { name: 'Encre', value: '#37352F' },
]

/** Les 7 couleurs proposées en premier dans les choix de couleur (la roue reste disponible). */
export const PRESET_COLORS: { name: string; value: string }[] = [
  { name: 'Rouge', value: '#D44C47' },
  { name: 'Orange', value: '#D9730D' },
  { name: 'Jaune', value: '#CB912F' },
  { name: 'Vert', value: '#448361' },
  { name: 'Bleu', value: '#337EA9' },
  { name: 'Violet', value: '#9065B0' },
  { name: 'Rose', value: '#C14C8A' },
]

export const isHex =(value: string) => /^#[0-9a-fA-F]{6}$/.test(value)

/** Une icône SVG peut prendre la couleur de sa catégorie (voir IconView). */
export const isSvgDataUrl = (dataUrl: string) => dataUrl.startsWith('data:image/svg+xml')

/**
 * Code SVG collé → image (data URL), ou null s'il ne ressemble pas à un SVG.
 * Le SVG n'est jamais injecté dans la page : il n'est affiché que comme image ou masque,
 * donc un éventuel script qu'il contiendrait ne s'exécute pas.
 */
export function svgTextToDataUrl(text: string): string | null {
  const svg = text.trim()
  if (!/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) return null
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Lit une image et la réduit (canvas) pour qu'elle tienne dans le stockage du navigateur.
 * Le vrai projet l'enverra dans Supabase Storage à la place.
 */
export function readImageAsDataUrl(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const src = String(reader.result)
      if (file.type === 'image/svg+xml') return resolve(src)
      const img = new Image()
      img.onerror = () => reject(new Error('Image illisible'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.85))
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
