import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const usePrefetchData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Prefetch essential data in parallel
    const prefetchEssentialData = async () => {
      // Prefetch convenios (used in multiple pages)
      queryClient.prefetchQuery({
        queryKey: ["convenios", user.id, true],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("convenios")
            .select("*")
            .eq("ativo", true)
            .order("nome_convenio");
          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 10,
      });

      // Prefetch pacientes (commonly accessed)
      queryClient.prefetchQuery({
        queryKey: ["pacientes", user.id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("pacientes")
            .select("*")
            .order("nome_completo");
          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 5,
      });

      // Prefetch today's agendamentos
      const today = new Date().toISOString().split("T")[0];
      queryClient.prefetchQuery({
        queryKey: ["agendamentos", user.id, today, today],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("agendamentos")
            .select("*")
            .eq("data_consulta", today)
            .order("inicio");
          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 2,
      });

      // Prefetch tarefas
      queryClient.prefetchQuery({
        queryKey: ["tarefas", user.id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("tarefas")
            .select("*")
            .order("data_vencimento", { ascending: true, nullsFirst: false });
          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 2,
      });
    };

    prefetchEssentialData();
  }, [user, queryClient]);
};

export const useInvalidateAllQueries = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries();
  };
};
