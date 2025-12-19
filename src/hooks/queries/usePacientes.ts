import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Paciente {
  id: number;
  nome_completo: string;
  genero: string;
  responsavel: string | null;
  telefone: string;
  email: string;
  data_nascimento: string;
  cpf: string;
  convenio: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  situacao: string;
  user_id?: string;
}

export const usePacientes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pacientes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .order("nome_completo", { ascending: true });

      if (error) throw error;
      return data as Paciente[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("pacientes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pacientes" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pacientes", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
};

export const usePaciente = (id: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["paciente", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Paciente | null;
    },
    enabled: !!user && !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreatePaciente = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paciente: Omit<Paciente, "id">) => {
      const { data, error } = await supabase
        .from("pacientes")
        .insert({ ...paciente, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      toast.success("Paciente cadastrado com sucesso!");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("CPF já cadastrado para outro paciente");
      } else {
        toast.error(error.message || "Erro ao cadastrar paciente");
      }
    },
  });
};

export const useUpdatePaciente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...paciente }: Partial<Paciente> & { id: number }) => {
      const { data, error } = await supabase
        .from("pacientes")
        .update(paciente)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["paciente", variables.id] });
      toast.success("Paciente atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar paciente");
    },
  });
};

export const useDeletePaciente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("pacientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      toast.success("Paciente excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir paciente");
    },
  });
};

export const useDeletePacientes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from("pacientes").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      toast.success(`${ids.length} paciente(s) excluído(s) com sucesso!`);
    },
    onError: () => {
      toast.error("Erro ao excluir pacientes");
    },
  });
};
