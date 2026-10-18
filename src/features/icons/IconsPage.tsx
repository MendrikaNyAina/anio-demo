import { ImagePlus, MoreHorizontal, Pencil, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { InlineEditableText } from '@/components/InlineEditableText'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { inputClass, Segmented } from '@/components/ui/controls'
import { Modal } from '@/components/ui/dialog'
import { useActionMenu } from '@/components/ui/menu'
import { fmtDay } from '@/domain/display'
import type { IconAsset } from '@/domain/types'
import { Page } from '@/features/layout/AppShell'
import { cn, isSvgDataUrl, pickFile, readImageAsDataUrl, svgTextToDataUrl } from '@/lib/utils'
import { useApp, withUndo } from '@/store/appStore'

/** Page Icônes (calendrier.md l. 83-85) : historique des images importées, chacune avec son nom. */
export function IconsPage() {
  const icons = useApp((s) => s.data.icons)
  const [adding, setAdding] = useState(false)

  return (
    <Page>
      <PageHeader
        icon="🖼️"
        title="Icônes"
        description="Tes images d'icônes, utilisables pour les catégories et sous-catégories. Une icône SVG prend la couleur de la catégorie qui l'utilise."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <ImagePlus size={15} /> Ajouter une icône
          </Button>
        }
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {icons.map((icon) => (
          <IconCard key={icon.id} icon={icon} />
        ))}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d3d1cb] text-sm text-ink-3 hover:bg-hover hover:text-ink"
        >
          <Upload size={20} />
          Importer une image
        </button>
      </div>
      {adding && <AddIconDialog onClose={() => setAdding(false)} />}
    </Page>
  )
}

function IconCard({ icon }: { icon: IconAsset }) {
  const usage = useApp((s) => [...s.data.categories, ...s.data.subcategories].filter((c) => c.icon?.type === 'image' && c.icon.iconId === icon.id).length)
  const app = useApp.getState()
  const [renaming, setRenaming] = useState(false)
  const menu = useActionMenu([
    { label: 'Renommer', icon: <Pencil />, onSelect: () => setRenaming(true) },
    'separator',
    { label: 'Supprimer', icon: <Trash2 />, danger: true, onSelect: () => withUndo('Icône supprimée', () => app.deleteIcon(icon.id)) },
  ])
  return (
    <div onContextMenu={menu.onContextMenu} className={cn('group relative rounded-xl border border-line p-3 transition-shadow hover:shadow-[0_2px_8px_rgb(0_0_0/6%)]', menu.isOpen && 'bg-hover')}>
      <div className="mb-3 flex h-[72px] items-center justify-center rounded-lg bg-sidebar">
        <img src={icon.dataUrl} alt={icon.name} className="size-12 rounded-md object-contain" />
      </div>
      {isSvgDataUrl(icon.dataUrl) && (
        <span className="absolute top-2 left-2 rounded-md bg-[#E8DEEE] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B3F86]" title="Prend la couleur de la catégorie qui l'utilise">
          SVG · couleur auto
        </span>
      )}
      <InlineEditableText
        value={icon.name}
        startEditing={renaming}
        onEnd={() => setRenaming(false)}
        onSave={(name) => app.renameIcon(icon.id, name)}
        className="block text-sm font-medium"
        inputClassName="text-sm"
      />
      <div className="mt-0.5 text-xs text-ink-3">
        Ajoutée le {fmtDay(new Date(icon.createdAt))} · {usage === 0 ? 'inutilisée' : `${usage} catégorie${usage > 1 ? 's' : ''}`}
      </div>
      <button type="button" onClick={menu.openFromButton} className="absolute top-2 right-2 rounded p-1 text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-press hover:text-ink" aria-label="Actions">
        <MoreHorizontal size={16} />
      </button>
      {menu.element}
    </div>
  )
}

function AddIconDialog({ onClose }: { onClose: () => void }) {
  const addIcon = useApp((s) => s.addIcon)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [source, setSource] = useState<'file' | 'code'>('file')
  const [code, setCode] = useState('')
  const codeError = source === 'code' && code.trim() !== '' && !dataUrl

  const onCode = (text: string) => {
    setCode(text)
    setDataUrl(svgTextToDataUrl(text))
  }

  const choose = async () => {
    const file = await pickFile('image/png,image/jpeg,image/webp,image/svg+xml')
    if (!file) return
    if (file.size > 2_000_000) return toast.error('Image trop lourde (2 Mo maximum).')
    setDataUrl(await readImageAsDataUrl(file, 128))
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
  }

  const save = () => {
    if (!dataUrl) return
    addIcon(name.trim() || 'Sans nom', dataUrl)
    toast.success('Icône ajoutée')
    onClose()
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Ajouter une icône"
      description="PNG, JPEG, WebP ou SVG. Une icône SVG prend la couleur de la catégorie qui l'utilise."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={save} disabled={!dataUrl}>
            Ajouter
          </Button>
        </>
      }
    >
      <Segmented
        value={source}
        onChange={(next) => {
          setSource(next)
          setDataUrl(null)
        }}
        options={[
          { value: 'file', label: 'Fichier' },
          { value: 'code', label: 'Coller un SVG' },
        ]}
        className="mb-3"
      />
      {source === 'code' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="icon-svg">
            Code SVG
          </label>
          <textarea
            id="icon-svg"
            value={code}
            onChange={(e) => onCode(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder='<svg viewBox="0 0 24 24">…</svg>'
            className={cn(inputClass, 'h-auto py-2 font-mono text-xs')}
          />
          {codeError && <p className="mt-1 text-xs text-danger">Ce n'est pas un SVG complet : il doit commencer par &lt;svg et finir par &lt;/svg&gt;.</p>}
          {dataUrl && <SvgColorPreview dataUrl={dataUrl} />}
        </div>
      )}
      <div className="flex items-center gap-4 pt-1">
        <button type="button" onClick={source === 'file' ? choose : undefined} disabled={source === 'code'} className="flex size-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#d3d1cb] bg-sidebar text-ink-3 hover:bg-hover">
          {dataUrl ? <img src={dataUrl} alt="" className="size-16 rounded-md object-contain" /> : <Upload size={22} />}
        </button>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="icon-name">
            Nom de l'icône
          </label>
          <input id="icon-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex. Logo du projet" className={inputClass} />
          {source === 'file' && dataUrl && isSvgDataUrl(dataUrl) && <SvgColorPreview dataUrl={dataUrl} />}
          {source === 'file' && !dataUrl && (
            <Button size="sm" variant="outline" className="mt-2" onClick={choose}>
              Choisir une image…
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

/** Aperçu d'un SVG dans quelques couleurs de catégorie, pour montrer qu'il prendra la leur. */
function SvgColorPreview({ dataUrl }: { dataUrl: string }) {
  const mask = `url("${dataUrl}") center / contain no-repeat`
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-ink-2">
      Aperçu :
      {['#337EA9', '#C14C8A', '#448361'].map((color) => (
        <span key={color} aria-hidden className="size-6 rounded-md" style={{ background: color, mask, WebkitMask: mask }} />
      ))}
    </div>
  )
}
