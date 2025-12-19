import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CompromissoPessoal {
  id: number;
  nome: string;
  data_compromisso: string;
  inicio: string;
  fim: string;
  status: string;
  observacoes: string | null;
  user_id?: string;
}

export const useCompromissos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["compromissos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compromissos_pessoais")
        .select("*")
        .order("data_compromisso", { ascending: false });

      if (error) throw error;
      return data as CompromissoPessoal[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("compromissos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "compromissos_pessoais" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["compromissos", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
};

export const useCompromissosByDateRange = (startDate: string, endDate: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["compromissos", user?.id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compromissos_pessoais")
        .select("*")
        .gte("data_compromisso", startDate)
        .lte("data_compromisso", endDate)
        .order("data_compromisso")
        .order("inicio");

      if (error) throw error;
      return data as CompromissoPessoal[];
    },
    enabled: !!user && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 2,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`compromissos-range-${startDate}-${endDate}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "compromissos_pessoais" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["compromissos", user.id, startDate, endDate] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, startDate, endDate]);

  return query;
};

export const useCreateCompromisso = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (compromisso: Omit<CompromissoPessoal, "id">) => {
      const { data, error } = await supabase
        .from("compromissos_pessoais")
        .insert({ ...compromisso, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compromissos"] });
      toast.success("Compromisso cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar compromisso");
    },
  });
};

export const useUpdateCompromisso = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...compromisso }: Partial<CompromissoPessoal> & { id: number }) => {
      const { data, error } = await supabase
        .from("compromissos_pessoais")
        .update(compromisso)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compromissos"] });
      toast.success("Compromisso atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar compromisso");
    },
  });
};

export const useDeleteCompromisso = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("compromissos_pessoais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compromissos"] });
      toast.success("Compromisso excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir compromisso");
    },
  });
};
