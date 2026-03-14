import { cva, type VariantProps } from 'class-variance-authority'
import Badge from './badge.svelte'

export const badgeVariants = cva(
  'inline-flex items-center justify-center border border-transparent font-medium [&_svg]:-ms-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-green-500 text-white',
        warning: 'bg-yellow-500 text-white',
        info: 'bg-violet-500 text-white',
        outline: 'bg-transparent border border-border text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      appearance: {
        default: '',
        light: '',
        outline: '',
        ghost: 'border-transparent bg-transparent',
      },
      size: {
        lg: 'rounded-md px-2 h-7 min-w-7 gap-1.5 text-xs [&_svg]:size-3.5',
        md: 'rounded-md px-[0.45rem] h-6 min-w-6 gap-1.5 text-xs [&_svg]:size-3.5',
        sm: 'rounded-sm px-[0.325rem] h-5 min-w-5 gap-1 text-[0.6875rem] leading-[0.75rem] [&_svg]:size-3',
        xs: 'rounded-sm px-1 h-4 min-w-4 gap-1 text-[0.625rem] leading-[0.5rem] [&_svg]:size-3',
      },
    },
    compoundVariants: [
      { variant: 'success', appearance: 'light', class: 'text-green-800 bg-green-100 dark:bg-green-950 dark:text-green-600' },
      { variant: 'warning', appearance: 'light', class: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-600' },
      { variant: 'destructive', appearance: 'light', class: 'text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-600' },
      { variant: 'primary', appearance: 'ghost', class: 'text-primary' },
      { variant: 'destructive', appearance: 'ghost', class: 'text-destructive' },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'default',
      size: 'md',
    },
  }
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
export { Badge }
