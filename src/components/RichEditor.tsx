import ImageExtension from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { pickFile, readImageAsDataUrl } from '@/lib/utils'

/** Page d'une tâche façon Notion : texte, titres, listes, liens et images. */
export function RichEditor({ content, onChange }: { content?: JSONContent; onChange: (content: JSONContent) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pending = useRef<JSONContent | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: true, autolink: true } }),
      ImageExtension,
      Placeholder.configure({ placeholder: 'Écris quelque chose, ajoute une image ou un lien…' }),
    ],
    content: content ?? '',
    onUpdate: ({ editor }) => {
      // Sauvegarde différée : on n'écrit pas à chaque frappe.
      pending.current = editor.getJSON()
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (pending.current) onChangeRef.current(pending.current)
        pending.current = null
      }, 400)
    },
  })

  // Rien ne se perd si on ferme la page avant la fin du délai.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (pending.current) onChangeRef.current(pending.current)
    },
    [],
  )

  if (!editor) return null

  const insertImage = async () => {
    const file = await pickFile('image/*')
    if (!file) return
    const src = await readImageAsDataUrl(file, 900)
    editor.chain().focus().setImage({ src, alt: file.name }).run()
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Adresse du lien', previous ?? 'https://')
    if (url === null) return
    if (url === '' || url === 'https://') editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const tool = (label: string, icon: ReactNode, run: () => void) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className="flex size-7 items-center justify-center rounded-md text-ink-2 hover:bg-hover hover:text-ink"
    >
      {icon}
    </button>
  )

  return (
    <div className="rich-editor">
      <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center gap-0.5 bg-white/95 py-1 backdrop-blur">
        {tool('Titre', <Heading2 size={16} />, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {tool('Gras', <Bold size={15} />, () => editor.chain().focus().toggleBold().run())}
        {tool('Italique', <Italic size={15} />, () => editor.chain().focus().toggleItalic().run())}
        {tool('Liste à puces', <List size={16} />, () => editor.chain().focus().toggleBulletList().run())}
        {tool('Liste numérotée', <ListOrdered size={16} />, () => editor.chain().focus().toggleOrderedList().run())}
        {tool('Citation', <Quote size={15} />, () => editor.chain().focus().toggleBlockquote().run())}
        <span className="mx-1 h-4 w-px bg-line" />
        {tool('Lien', <Link2 size={16} />, setLink)}
        {tool('Image', <ImagePlus size={16} />, insertImage)}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
