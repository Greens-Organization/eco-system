'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@pack/design-system/components/ui/base-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPositioner,
  DropdownMenuTrigger,
} from '@pack/design-system/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@pack/design-system/components/ui/sidebar';
import { getInitials } from '@pack/design-system/utils/formatters'
import { generateURLDiceBearAvatar } from '@pack/design-system/utils/others'
import { EllipsisVertical, LogOut, Moon, Sun, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { authClient } from '@/lib/auth';

export function UserAvatar() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { data, isPending } = authClient.useSession();
  const userData = data?.user;

  const avatarSrc = userData?.image
    ? userData.image
    : generateURLDiceBearAvatar(userData?.email);

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            disabled
          >
            <Avatar className="in-data-[state=expanded]:size-6 transition-[width,height] duration-200 ease-in-out">
              <AvatarFallback className="animate-pulse bg-muted-foreground/30"></AvatarFallback>
            </Avatar>
            <div className="ms-2 flex-1 animate-pulse text-left text-sm leading-tight">
              <span className="truncate font-medium">Carregando...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="in-data-[state=expanded]:size-6 transition-[width,height] duration-200 ease-in-out">
                <AvatarImage src={avatarSrc} alt={userData?.name} />
                <AvatarFallback>
                  {getInitials(data?.user?.name ?? 'GG')}
                </AvatarFallback>
              </Avatar>
              <div className="ms-1 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userData?.name}</span>
              </div>
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent/50 in-[[data-slot=dropdown-menu-trigger]:hover]:bg-transparent">
                <EllipsisVertical className="size-5 opacity-40" size={20} />
              </div>
            </SidebarMenuButton>
          } />
          <DropdownMenuPositioner side={isMobile ? 'bottom' : 'right'} align='end'  sideOffset={4}>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          >
            <DropdownMenuItem
              className="gap-3 px-1"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'light' ? (
                <Moon
                  size={20}
                  className="text-muted-foreground/70"
                  aria-hidden="true"
                />
              ) : (
                <Sun
                  size={20}
                  className="text-muted-foreground/70"
                  aria-hidden="true"
                />
              )}
              <span>Mudar tema</span>
            </DropdownMenuItem>
              <DropdownMenuItem className="px-1" render={
              <Link href="/perfil" className="flex items-center gap-3">
                <User
                  size={20}
                  className="text-muted-foreground/70"
                  aria-hidden="true"
                />
                <span>Perfil</span>
              </Link>
            }/>
            <DropdownMenuItem
              className="gap-3 px-1"
              onClick={async () => {
                await authClient.signOut({ fetchOptions: {} });
                router.push('/entrar');
              }}
            >
              <LogOut
                size={20}
                className="text-destructive/70"
                aria-hidden="true"
              />
              <span className="text-destructive/70">Sair</span>
            </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPositioner>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
