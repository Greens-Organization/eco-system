import { DropdownMenu as BitsDropdownMenu } from 'bits-ui'
import { cn } from '../../../utils/cn'
import DropdownMenuRoot from './dropdown-menu.svelte'

export {
  DropdownMenuRoot as DropdownMenu,
  BitsDropdownMenu as DropdownMenuPrimitive,
}

// Re-export commonly used Bits UI sub-components for convenience
export const DropdownMenuTrigger = BitsDropdownMenu.Trigger
export const DropdownMenuContent = BitsDropdownMenu.Content
export const DropdownMenuItem = BitsDropdownMenu.Item
export const DropdownMenuSeparator = BitsDropdownMenu.Separator
export const DropdownMenuLabel = BitsDropdownMenu.Label
export const DropdownMenuGroup = BitsDropdownMenu.Group
export const DropdownMenuSub = BitsDropdownMenu.Sub
export const DropdownMenuSubTrigger = BitsDropdownMenu.SubTrigger
export const DropdownMenuSubContent = BitsDropdownMenu.SubContent
