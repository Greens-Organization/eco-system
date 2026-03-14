// Providers
export { DesignSystemProvider } from './providers'

// Utils
export { cn } from './utils/cn'
export { genericAvatar } from './utils/generic-avatar'

// Components
export { Button, buttonVariants } from './components/ui/button'
export { Badge, badgeVariants } from './components/ui/badge'
export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from './components/ui/breadcrumb'
export {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarInset,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  getSidebarContext,
} from './components/ui/sidebar'

// Re-export Bits UI DropdownMenu for flexible usage
export { DropdownMenu, DropdownMenuPrimitive } from './components/ui/dropdown-menu'

// Individual component default exports (Svelte-native usage)
export { default as AvatarComponent } from './components/ui/avatar/avatar.svelte'
export { default as InputComponent } from './components/ui/input/input.svelte'
export { default as SelectComponent } from './components/ui/select/select.svelte'
export { default as SeparatorComponent } from './components/ui/separator/separator.svelte'
export { default as SkeletonComponent } from './components/ui/skeleton/skeleton.svelte'
export { default as TooltipComponent } from './components/ui/tooltip/tooltip.svelte'
export { default as ModeToggle } from './components/ui/toggle/mode-toggle.svelte'
