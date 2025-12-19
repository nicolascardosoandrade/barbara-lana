import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Agendamento {
  id: number;
  data_consulta: string;
  nome_paciente: string;
  telefone: string | null;
  inicio: string;
  fim: string;
  convenio: string;
  consulta: string;
  modalidade: string;
  frequencia: string;
  observacoes: string | null;
  valor: number;
  color: string;
  status_pagamento: string;
  user_id?: string;
}

export const useAgendamentos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["agendamentos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .order("data_consulta", { ascending: true })
        .order("inicio", { ascending: true });

      if (error) throw error;
      return data as Agendamento[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("agendamentos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["agendamentos", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
};

export const useAgendamentosByDateRange = (startDate: string, endDate: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["agendamentos", user?.id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .gte("data_consulta", startDate)
        .lte("data_consulta", endDate)
        .order("data_consulta")
        .order("inicio");

      if (error) throw error;
      return data as Agendamento[];
    },
    enabled: !!user && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 2,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`agendamentos-range-${startDate}-${endDate}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["agendamentos", user.id, startDate, endDate] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, startDate, endDate]);

  return query;
};

export const useCreateAgendamento = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agendamento: Omit<Agendamento, "id">) => {
      const { data, error } = await supabase
        .from("agendamentos")
        .insert({ ...agendamento, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar agendamento");
    },
  });
};

export const useUpdateAgendamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...agendamento }: Partial<Agendamento> & { id: number }) => {
      const { data, error } = await supabase
        .from("agendamentos")
        .update(agendamento)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar agendamento");
    },
  });
};

export const useDeleteAgendamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("agendamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir agendamento");
    },
  });
};

export const useDeleteAgendamentos = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from("agendamentos").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success(`${ids.length} agendamento(s) excluído(s) com sucesso!`);
    },
    onError: () => {
      toast.error("Erro ao excluir agendamentos");
    },
  });
};
