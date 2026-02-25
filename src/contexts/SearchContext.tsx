import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Função para normalizar texto removendo acentos
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Função para verificar se um texto contém outro (insensível a acentos)
export function matchesSearch(text: string | null | undefined, query: string): boolean {
  if (!text || !query) return !query;
  return normalizeText(text).includes(normalizeText(query));
}

interface SearchConfig {
  placeholder: string;
  onSearch: (query: string) => void;
  enabled: boolean;
}

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  registerSearch: (config: SearchConfig) => void;
  unregisterSearch: () => void;
  currentConfig: SearchConfig | null;
  executeSearch: (query: string) => void;
  getPlaceholder: () => string;
  normalizeText: (text: string) => string;
  matchesSearch: (text: string | null | undefined, query: string) => boolean;
}

const defaultConfig: SearchConfig = {
  placeholder: "Procurar...",
  onSearch: () => {},
  enabled: false,
};

// Configurações padrão por rota
const routeConfigs: Record<string, { placeholder: string; searchParam?: string }> = {
  "/": { placeholder: "Procurar tarefa..." },
  "/pacientes": { placeholder: "Procurar paciente...", searchParam: "search" },
  "/agendamentos": { placeholder: "Procurar agendamento..." },
  "/agenda": { placeholder: "Procurar na agenda..." },
  "/convenios": { placeholder: "Procurar convênio..." },
  "/financeiro": { placeholder: "Procurar no financeiro..." },
  "/aniversariantes": { placeholder: "Procurar aniversariante..." },
  "/anotacoes": { placeholder: "Procurar anotação..." },
  "/filtrar-idades": { placeholder: "Procurar paciente..." },
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentConfig, setCurrentConfig] = useState<SearchConfig | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const registerSearch = useCallback((config: SearchConfig) => {
    setCurrentConfig(config);
  }, []);

  const unregisterSearch = useCallback(() => {
    setCurrentConfig(null);
    setSearchQuery("");
  }, []);

  const getPlaceholder = useCallback(() => {
    if (currentConfig?.enabled) {
      return currentConfig.placeholder;
    }
    const routeConfig = routeConfigs[location.pathname];
    return routeConfig?.placeholder || "Procurar...";
  }, [currentConfig, location.pathname]);

  const executeSearch = useCallback((query: string) => {
    if (currentConfig?.enabled && currentConfig.onSearch) {
      currentConfig.onSearch(query);
    } else {
      // Fallback: navegar para pacientes com busca (comportamento original)
      const routeConfig = routeConfigs[location.pathname];
      if (routeConfig?.searchParam && query.trim()) {
        navigate(`${location.pathname}?${routeConfig.searchParam}=${encodeURIComponent(query.trim())}`);
      }
    }
  }, [currentConfig, location.pathname, navigate]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        registerSearch,
        unregisterSearch,
        currentConfig,
        executeSearch,
        getPlaceholder,
        normalizeText,
        matchesSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
