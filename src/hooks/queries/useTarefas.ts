import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Tarefa {
  id: number;
  descricao: string;
  data_vencimento: string | null;
  criada_em: string;
  user_id?: string;
}

export const useTarefas = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tarefas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .order("data_vencimento", { ascending: true, nullsFirst: false })
        .order("criada_em", { ascending: false });

      if (error) throw error;
      return data as Tarefa[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("tarefas-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tarefas" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tarefas", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
};

export const useCreateTarefa = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefa: Omit<Tarefa, "id" | "criada_em">) => {
      const { data, error } = await supabase
        .from("tarefas")
        .insert({ ...tarefa, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success("Tarefa adicionada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar tarefa");
    },
  });
};

export const useUpdateTarefa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...tarefa }: Partial<Tarefa> & { id: number }) => {
      const { data, error } = await supabase
        .from("tarefas")
        .update(tarefa)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success("Tarefa atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar tarefa");
    },
  });
};

export const useDeleteTarefa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("tarefas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success("Tarefa removida!");
    },
    onError: () => {
      toast.error("Erro ao excluir tarefa");
    },
  });
};
