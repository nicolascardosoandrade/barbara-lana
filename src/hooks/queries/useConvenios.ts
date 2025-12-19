import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Convenio {
  id: number;
  nome_convenio: string;
  consulta: string;
  duracao: string;
  valor: number;
  pagamento: number;
  ativo: boolean;
  user_id?: string;
}

export const useConvenios = (onlyActive = false) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["convenios", user?.id, onlyActive],
    queryFn: async () => {
      let queryBuilder = supabase
        .from("convenios")
        .select("*")
        .order("nome_convenio", { ascending: true });

      if (onlyActive) {
        queryBuilder = queryBuilder.eq("ativo", true);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return data as Convenio[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes - convenios change less often
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("convenios-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "convenios" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["convenios"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
};

export const useCreateConvenio = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (convenio: Omit<Convenio, "id">) => {
      const { data, error } = await supabase
        .from("convenios")
        .insert({ ...convenio, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convenios"] });
      toast.success("Convênio cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar convênio");
    },
  });
};

export const useUpdateConvenio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...convenio }: Partial<Convenio> & { id: number }) => {
      const { data, error } = await supabase
        .from("convenios")
        .update(convenio)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convenios"] });
      toast.success("Convênio atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar convênio");
    },
  });
};

export const useDeleteConvenio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("convenios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convenios"] });
      toast.success("Convênio excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir convênio");
    },
  });
};

export const useDeleteConvenios = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from("convenios").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["convenios"] });
      toast.success(`${ids.length} convênio(s) excluído(s) com sucesso!`);
    },
    onError: () => {
      toast.error("Erro ao excluir convênios");
    },
  });
};
