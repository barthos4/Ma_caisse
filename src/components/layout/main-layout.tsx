"use client";
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background print:block">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col print:m-0 print:p-0 print:shadow-none print:rounded-none">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto print:p-0 print:overflow-visible">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
