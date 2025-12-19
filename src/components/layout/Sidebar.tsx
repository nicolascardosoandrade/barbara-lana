import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Info,
  Handshake,
  Filter,
  Users,
  Calendar,
  CalendarCheck,
  Cake,
  FileText,
  DollarSign,
} from "lucide-react";
import { useSidebarContext } from "./SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const menuItems = [
  { icon: Info, label: "Detalhes", path: "/" },
  { icon: Handshake, label: "Convênios", path: "/convenios" },
  { icon: Filter, label: "Filtrar Idades", path: "/filtrar-idades" },
  { icon: Users, label: "Pacientes", path: "/pacientes" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: CalendarCheck, label: "Agendamentos", path: "/agendamentos" },
  { icon: Cake, label: "Aniversariantes do Dia", path: "/aniversariantes" },
  { icon: FileText, label: "Anotações", path: "/anotacoes" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
];

export function Sidebar() {
  const location = useLocation();
  const { isExpanded, closeSidebar } = useSidebarContext();
  const isMobile = useIsMobile();
  const initialPathRef = useRef(location.pathname);

  // Fecha automaticamente após a navegação (quando a rota realmente muda)
  useEffect(() => {
    if (!isMobile) return;
    if (initialPathRef.current === location.pathname) return;

    if (isExpanded) closeSidebar();
    initialPathRef.current = location.pathname;
  }, [location.pathname, isMobile, isExpanded, closeSidebar]);

  const handleLinkClick = () => {
    // No mobile, fecha a sidebar ao clicar em um link
    if (isMobile) {
      closeSidebar();
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      {/* Mobile overlay - closes sidebar when clicking outside */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-14 h-[calc(100vh-3.5rem)] z-40 transition-all duration-300 flex flex-col",
          "bg-gradient-to-b from-sidebar via-sidebar to-sidebar-accent/30",
          "border-r border-sidebar-border",
          // Desktop behavior
          "md:translate-x-0",
          isExpanded ? "md:w-64" : "md:w-16",
          // Mobile behavior - slide in/out, always full width when open
          isExpanded ? "translate-x-0 w-64" : "-translate-x-full w-64"
        )}
      >
        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              const linkContent = (
                <Link
                  to={item.path}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                    // On mobile, always show full item; on desktop, depends on isExpanded
                    "justify-start md:justify-start",
                    !isExpanded && "md:justify-center",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon size={22} className="shrink-0" />
                  {/* On mobile when open, always show text; on desktop, depends on isExpanded */}
                  <span 
                    className={cn(
                      "text-sm font-medium truncate",
                      "block md:block",
                      !isExpanded && "md:hidden"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );

              return (
                <li key={item.path}>
                  {/* Show tooltip only when sidebar is collapsed on desktop */}
                  {!isExpanded ? (
                    <Tooltip>
                      <TooltipTrigger asChild className="hidden md:flex">
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                      {/* Mobile version without tooltip */}
                      <div className="md:hidden">
                        {linkContent}
                      </div>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </TooltipProvider>
  );
}