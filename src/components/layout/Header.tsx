import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSidebarContext } from "./SidebarContext";
import { UserMenu } from "./UserMenu";
import { useSearch } from "@/contexts/SearchContext";

export function Header() {
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const location = useLocation();
  const { toggleSidebar } = useSidebarContext();
  const { executeSearch, getPlaceholder, searchQuery, setSearchQuery } = useSearch();

  // Limpar busca quando mudar de página
  useEffect(() => {
    setLocalSearchQuery("");
    setSearchQuery("");
  }, [location.pathname, setSearchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchQuery.trim()) {
      executeSearch(localSearchQuery.trim());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    setSearchQuery(value);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border h-14 flex items-center w-full px-4">
      {/* Left section - Menu button and Title */}
      <div className="flex items-center shrink-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="Menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="hidden sm:block text-base md:text-lg font-semibold text-sidebar-foreground ml-2 whitespace-nowrap">
          SistemaAeR - Bárbara Lana
        </h1>
      </div>

      {/* Center section - Search */}
      <div className="flex-1 flex justify-center px-2 sm:px-4">
        <form onSubmit={handleSearch} className="w-full max-w-md">
          <input
            type="text"
            placeholder={getPlaceholder()}
            value={localSearchQuery}
            onChange={handleInputChange}
            className="w-full px-4 py-2 rounded-lg border border-sidebar-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </form>
      </div>

      {/* Right section - User menu */}
      <UserMenu />
    </header>
  );
}
