import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Hauteur d'une rangée de la grille (px) : plus c'est petit, plus l'empilement est précis. */
const ROW = 4
/** Espace vertical entre deux cartes (px), identique à l'espace horizontal. */
const GAP = 16
/** Largeur minimale d'une carte : assez pour lire une ligne de tâche avec ses dates. */
const MIN_CARD_WIDTH = 440

/** Espace vertical transmis aux cases, pour qu'il égale l'espace horizontal choisi. */
const MasonryGap = createContext(GAP)

// Cible = la carte sous le pointeur ; à défaut (entre deux cartes), la plus proche.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : closestCenter(args)
}

/**
 * Grille « Pinterest » : les cartes s'empilent en colonnes sans trous, dans l'ordre de lecture
 * (gauche → droite puis vers le bas). Chaque carte occupe autant de petites rangées que sa hauteur,
 * recalculée dès qu'elle change (accordéon ouvert ou fermé).
 *
 * Glisser-déposer : pendant le déplacement, un aperçu suit la souris et la carte visée est
 * entourée ; au lâcher, la carte prend sa place. Pas de réarrangement en direct : avec des cartes
 * de hauteurs différentes, il ferait sauter la grille sous le pointeur.
 */
export function CategoryMasonry({
  ids,
  onReorder,
  children,
  renderOverlay,
  minCardWidth = MIN_CARD_WIDTH,
  gap = GAP,
}: {
  ids: string[]
  onReorder: (ids: string[]) => void
  children: ReactNode
  renderOverlay: (id: string) => ReactNode
  /** Largeur minimale d'une carte : le nombre de colonnes en découle. */
  minCardWidth?: number
  gap?: number
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const [activeId, setActiveId] = useState<string | null>(null)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from >= 0 && to >= 0) onReorder(arrayMove(ids, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <MasonryGap.Provider value={gap}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${minCardWidth}px, 100%), 1fr))`, gridAutoRows: ROW, columnGap: gap }}>
          {children}
        </div>
      </MasonryGap.Provider>
      <DragOverlay dropAnimation={null}>{activeId ? renderOverlay(activeId) : null}</DragOverlay>
    </DndContext>
  )
}

/** Une case de la grille, dont la hauteur suit son contenu. */
export function MasonryItem({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [span, setSpan] = useState(1)
  const gap = useContext(MasonryGap)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSpan(Math.ceil((el.getBoundingClientRect().height + gap) / ROW))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [gap])

  return (
    <div style={{ gridRowEnd: `span ${span}` }}>
      <div ref={ref}>{children}</div>
    </div>
  )
}

/** À utiliser dans une carte : la rend déplaçable (par sa poignée) et cible de dépôt. */
export function useMasonryCard(id: string, enabled = true) {
  const drag = useDraggable({ id, disabled: !enabled })
  const drop = useDroppable({ id, disabled: !enabled })
  return {
    setNodeRef: (node: HTMLElement | null) => {
      drag.setNodeRef(node)
      drop.setNodeRef(node)
    },
    handleProps: { ...drag.attributes, ...drag.listeners },
    isDragging: drag.isDragging,
    isOver: drop.isOver && !drag.isDragging,
  }
}
