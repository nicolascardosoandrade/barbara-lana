import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SidebarContextType {
  isExpanded: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SIDEBAR_STORAGE_KEY = "sidebar-expanded";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Check localStorage for saved state, default to false (collapsed)
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isExpanded));
  }, [isExpanded]);

  const toggleSidebar = () => setIsExpanded(!isExpanded);
  const closeSidebar = () => setIsExpanded(false);

  return (
    <SidebarContext.Provider value={{ isExpanded, toggleSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
}
