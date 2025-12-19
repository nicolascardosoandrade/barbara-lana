import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DataPrefetchProvider } from "@/components/DataPrefetchProvider";

import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Convenios from "./pages/Convenios";
import Pacientes from "./pages/Pacientes";
import PacienteDetalhes from "./pages/PacienteDetalhes";
import Agendamentos from "./pages/Agendamentos";
import Agenda from "./pages/Agenda";
import FiltrarIdades from "./pages/FiltrarIdades";
import Aniversariantes from "./pages/Aniversariantes";
import Anotacoes from "./pages/Anotacoes";
import Financeiro from "./pages/Financeiro";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes default
      gcTime: 1000 * 60 * 15, // 15 minutes garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="sistema-aer-theme">
      <AuthProvider>
        <DataPrefetchProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/convenios" element={<ProtectedRoute><Convenios /></ProtectedRoute>} />
                <Route path="/pacientes" element={<ProtectedRoute><Pacientes /></ProtectedRoute>} />
                <Route path="/pacientes/:id" element={<ProtectedRoute><PacienteDetalhes /></ProtectedRoute>} />
                <Route path="/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />
                <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
                <Route path="/filtrar-idades" element={<ProtectedRoute><FiltrarIdades /></ProtectedRoute>} />
                <Route path="/aniversariantes" element={<ProtectedRoute><Aniversariantes /></ProtectedRoute>} />
                <Route path="/anotacoes" element={<ProtectedRoute><Anotacoes /></ProtectedRoute>} />
                <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </DataPrefetchProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
