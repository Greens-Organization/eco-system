import { getContext, setContext } from 'svelte'

const SIDEBAR_KEY = Symbol('sidebar')

interface SidebarContext {
  open: boolean
  toggle: () => void
  isMobile: boolean
}

export function setSidebarContext(ctx: SidebarContext) {
  return setContext(SIDEBAR_KEY, ctx)
}

export function getSidebarContext(): SidebarContext {
  return getContext<SidebarContext>(SIDEBAR_KEY)
}
