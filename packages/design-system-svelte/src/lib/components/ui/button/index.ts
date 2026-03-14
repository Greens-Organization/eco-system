import { cva, type VariantProps } from 'class-variance-authority'
import Button from './button.svelte'

export const buttonVariants = cva(
  'cursor-pointer whitespace-nowrap focus-visible:outline-hidden inline-flex items-center justify-center text-sm font-medium ring-offset-background transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        mono: 'bg-zinc-950 text-white dark:bg-zinc-300 dark:text-black hover:bg-zinc-950/90 dark:hover:bg-zinc-300/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        outline: 'bg-background text-accent-foreground border border-input hover:bg-accent',
        dashed: 'text-accent-foreground border border-input border-dashed bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'text-accent-foreground hover:bg-accent hover:text-accent-foreground',
        dim: 'text-muted-foreground hover:text-foreground',
      },
      size: {
        lg: 'h-10 px-4 text-sm gap-1.5 [&_svg:not([class*=size-])]:size-4',
        md: 'h-9 px-3 gap-1.5 text-sm [&_svg:not([class*=size-])]:size-4',
        sm: 'h-8 px-2.5 gap-1.25 text-xs [&_svg:not([class*=size-])]:size-3.5',
        xs: 'h-7 px-2 gap-1 text-xs [&_svg:not([class*=size-])]:size-3.5',
        icon: 'size-9 [&_svg:not([class*=size-])]:size-4 shrink-0',
      },
      radius: {
        md: 'rounded-md',
        full: 'rounded-full',
      },
      mode: {
        default: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        icon: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        link: 'text-primary h-auto p-0 bg-transparent rounded-none hover:bg-transparent',
      },
    },
    compoundVariants: [
      { variant: 'primary', mode: 'default', class: 'shadow-xs shadow-black/5' },
      { variant: 'secondary', mode: 'default', class: 'shadow-xs shadow-black/5' },
      { variant: 'outline', mode: 'default', class: 'shadow-xs shadow-black/5' },
      { variant: 'dashed', mode: 'default', class: 'shadow-xs shadow-black/5' },
      { variant: 'destructive', mode: 'default', class: 'shadow-xs shadow-black/5' },
      {
        variant: 'ghost',
        mode: 'default',
        class: '[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60',
      },
      {
        variant: 'outline',
        mode: 'default',
        class: '[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60',
      },
      { size: 'sm', mode: 'icon', class: 'w-7 h-7 p-0' },
      { size: 'md', mode: 'icon', class: 'w-8.5 h-8.5 p-0' },
      { size: 'lg', mode: 'icon', class: 'w-10 h-10 p-0' },
      { variant: 'ghost', mode: 'icon', class: 'text-muted-foreground' },
    ],
    defaultVariants: {
      variant: 'primary',
      mode: 'default',
      size: 'md',
      radius: 'md',
    },
  }
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
export { Button }
