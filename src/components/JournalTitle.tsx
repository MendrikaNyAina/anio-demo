import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Titre de page façon journal d'organisation (inspiration title.jpg) : étiquette en bulle
// sur papier quadrillé bleu-violet pastel, languette posée sur le bord, encoche « croquée »,
// washi tape et petits stickers.

const LINE = '#A3A8EE'
const INK = '#2F2B6E'
const PAPER = '#F4F3FF'
const GRID = 'rgb(140 146 232 / 22%)'

/** Menus (popovers) du thème journal : bord lavande, ombre décalée, Fredoka. Filtres, sélecteur de date, habitudes. */
export const journalMenuClass = 'rounded-[20px] border-2 border-[#A3A8EE] p-2 font-plate text-[#2F2B6E] shadow-[0_5px_0_#DCDDFF,0_14px_30px_rgb(47_43_110/12%)]!'

export function JournalTitle({
  icon,
  title,
  tab,
  description,
  actions,
  className,
}: {
  /** Emoji ou petite illustration. */
  icon: ReactNode
  title: string
  /** Texte de la languette, au-dessus du titre (comme « username » sur l'inspiration). */
  tab: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-7 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <div className="relative inline-block pt-[18px] pb-1">
          <span
            className="absolute top-0 left-7 z-10 inline-flex items-center gap-1.5 rounded-full border-2 bg-[#DCDDFF] px-3 font-plate text-[13px] leading-[24px] font-semibold"
            style={{ borderColor: LINE, color: INK }}
          >
            {tab}
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" fill="#FFE08A" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </span>

          <span
            aria-hidden
            className="pointer-events-none absolute top-[6px] right-10 z-10 h-[22px] w-[92px] rotate-[5deg] opacity-90"
            style={{
              backgroundImage: 'repeating-linear-gradient(-45deg, #C9CDFF 0 7px, #E6DCFF 7px 14px)',
              clipPath: 'polygon(0 12%, 5% 0, 95% 0, 100% 14%, 97% 50%, 100% 86%, 95% 100%, 5% 100%, 0 88%, 3% 50%)',
            }}
          />

          <div
            className="relative inline-flex max-w-full items-center gap-3 rounded-[28px] border-2 py-2.5 pr-10 pl-4 sm:gap-4 sm:py-3 sm:pr-14 sm:pl-5"
            style={{
              borderColor: LINE,
              backgroundColor: PAPER,
              backgroundImage: `linear-gradient(${GRID} 1px, transparent 1px), linear-gradient(90deg, ${GRID} 1px, transparent 1px)`,
              backgroundSize: '18px 18px',
            }}
          >
            <span className="shrink-0 text-[32px] leading-none sm:text-[42px] [&>svg]:size-9 sm:[&>svg]:size-11">{icon}</span>
            <h1 className="font-plate text-[30px] leading-tight font-semibold tracking-tight sm:text-[40px]" style={{ color: INK }}>
              {title}
            </h1>
            {/* Encoche « croquée » sur le bord droit */}
            <span aria-hidden className="pointer-events-none absolute top-[10px] -right-[14px] size-[26px] rounded-full border-2 bg-white" style={{ borderColor: LINE, clipPath: 'inset(0 50% 0 0)' }} />
          </div>

          {/* Stickers */}
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute -bottom-1 -left-3 rotate-[-14deg]">
            <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" fill="#FFE08A" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <svg width="24" height="22" viewBox="0 0 24 22" aria-hidden="true" className="pointer-events-none absolute right-6 -bottom-[6px] rotate-[10deg]">
            <path d="M12 20s-8-5-9.5-10C1.3 6 4 3 7 3c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3 0 5.7 3 4.5 7C20 15 12 20 12 20z" fill="#F9C6DD" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <svg width="46" height="24" viewBox="0 0 46 24" aria-hidden="true" className="pointer-events-none absolute top-[30px] -right-[54px] hidden sm:block">
            <path d="M2 18c6-10 10 4 16-4s9 2 13-6 8 0 13-4" fill="none" stroke="#9E8CF0" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        {description && <p className="mt-3 max-w-[720px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
