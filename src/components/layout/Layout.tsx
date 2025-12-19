import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SidebarProvider, useSidebarContext } from "./SidebarContext";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  hideHeader?: boolean;
}

function LayoutContent({ children, hideHeader }: LayoutProps) {
  const { isExpanded } = useSidebarContext();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      {/* Topbar fixa no topo */}
      <div className={cn("fixed top-0 left-0 right-0 z-50", hideHeader && "hidden md:block")}>
        <Header />
      </div>
      
      {/* Espaçador para compensar o header fixo */}
      <div className={cn("h-14", hideHeader && "hidden md:block")} />
      
      <div className="flex flex-1">
        {/* Sidebar - hidden on mobile when hideHeader is true */}
        <div className={cn(hideHeader && "hidden md:block")}>
          <Sidebar />
        </div>
        
        {/* Main content - margin only on desktop */}
        <main
          className={cn(
            "flex-1 p-3 sm:p-4 md:p-6 animate-fade-in transition-all duration-300",
            "pb-6 sm:pb-4 md:pb-6", // Extra bottom padding on mobile for safe area
            // No margin on mobile (sidebar overlays), margin on desktop
            isExpanded ? "md:ml-64" : "md:ml-16"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function Layout({ children, title, hideHeader }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent title={title} hideHeader={hideHeader}>{children}</LayoutContent>
    </SidebarProvider>
  );
}
