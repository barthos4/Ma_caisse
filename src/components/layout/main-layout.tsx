
"use client";
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

interface MainLayoutProps {
  children: ReactNode;
}

const PUBLIC_ROUTES = ['/login', '/signup'];

export function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
      if (isAuthenticated && isPublicRoute) {
        router.replace('/'); 
      } else if (!isAuthenticated && !isPublicRoute) {
        router.replace('/login'); 
      }
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        {/* Basic Skeleton Loading for layout */}
        <div className="flex w-full h-full">
          <Skeleton className="hidden md:block h-full w-[256px] mr-4" /> {/* Sidebar placeholder */}
          <div className="flex-1 space-y-4">
            <Skeleton className="h-12 w-full" /> {/* Header/Toolbar placeholder */}
            <Skeleton className="h-[400px] w-full" /> {/* Content placeholder */}
          </div>
        </div>
      </div>
    );
  }

  const isPublicRouteCurrent = PUBLIC_ROUTES.includes(pathname);

  // If not authenticated and trying to access a protected route,
  // the useEffect above will redirect. This check prevents rendering protected layout parts.
  if (!isAuthenticated && !isPublicRouteCurrent) {
     // Typically, redirection handles this, but as a fallback, render nothing or a minimal loader.
    return (
       <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Redirection...</p>
      </div>
    );
  }
  
  // For login/signup pages, render children without the main app layout (sidebar, etc.)
  if (isPublicRouteCurrent) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Authenticated user on a private route - render the full app layout
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
