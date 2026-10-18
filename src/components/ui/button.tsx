import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'icon' | 'icon-sm'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-[#0b6ec5] shadow-[inset_0_-1px_0_rgb(0_0_0/10%)]',
  ghost: 'text-ink hover:bg-hover active:bg-press',
  subtle: 'text-ink-2 hover:bg-hover hover:text-ink active:bg-press',
  outline: 'border border-line text-ink hover:bg-hover active:bg-press bg-white',
  danger: 'bg-danger text-white hover:bg-[#b93c37]',
}

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2 text-[13px] gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
  icon: 'h-7 w-7 justify-center',
  'icon-sm': 'h-6 w-6 justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center rounded-md font-medium whitespace-nowrap transition-colors select-none',
        'disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
})
