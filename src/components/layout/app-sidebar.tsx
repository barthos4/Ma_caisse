
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Home, ArrowLeftRight, LayoutGrid, BarChart3, BookText, Settings, LogOut, Briefcase, ClipboardList } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useAuth } from '@/hooks/use-auth.tsx'; // Updated import path

const navItems = [
  { href: '/', label: 'Tableau de Bord', icon: Home },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/categories', label: 'Catégories', icon: LayoutGrid },
  { href: '/reports', label: 'Rapports', icon: BarChart3 },
  { href: '/etats', label: 'Etats de Caisse', icon: ClipboardList },
  { href: '/journal', label: 'Journal de Caisse', icon: BookText },
];

export function AppSidebar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { logout } = useAuth(); // Get logout function

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} className="print:hidden">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
           <Briefcase className="h-8 w-8 text-primary shrink-0" />
          <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">
            GESTION CAISSE 
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="group-data-[collapsible=icon]:justify-center"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Separator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
             <ThemeSwitcher />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/settings" passHref legacyBehavior>
              <SidebarMenuButton tooltip="Paramètres" className="group-data-[collapsible=icon]:justify-center">
                <Settings className="h-5 w-5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Paramètres</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Déconnexion" 
              className="group-data-[collapsible=icon]:justify-center"
              onClick={logout} // Call logout function on click
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {isMobile && <div className="pt-2"><SidebarTrigger/></div>}
      </SidebarFooter>
    </Sidebar>
  );
}
