import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, FileText, Calendar, CheckCircle2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";

interface Tarefa {
  id: number;
  descricao: string;
  data_vencimento: string | null;
  criada_em: string;
}

const Anotacoes = () => {
  const { user } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDescricao, setNewDescricao] = useState("");
  const [newDataVencimento, setNewDataVencimento] = useState("");
  
  // Edit state
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editDataVencimento, setEditDataVencimento] = useState("");

  useEffect(() => {
    fetchTarefas();

    // Realtime subscription
    const channel = supabase
      .channel("tarefas-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tarefas" },
        () => {
          fetchTarefas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTarefas = async () => {
    try {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .order("data_vencimento", { ascending: true, nullsFirst: false })
        .order("criada_em", { ascending: false });

      if (error) throw error;
      setTarefas(data || []);
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTarefa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDescricao.trim()) {
      toast.error("Digite uma descrição para a tarefa");
      return;
    }

    if (!newDataVencimento) {
      toast.error("Selecione uma data de vencimento");
      return;
    }

    try {
      const { error } = await supabase.from("tarefas").insert({
        descricao: newDescricao.trim(),
        data_vencimento: newDataVencimento,
        user_id: user?.id,
      });

      if (error) throw error;

      toast.success("Tarefa adicionada com sucesso!");
      setNewDescricao("");
      setNewDataVencimento("");
      fetchTarefas();
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      toast.error("Erro ao adicionar tarefa");
    }
  };

  const handleDeleteTarefa = async (id: number) => {
    try {
      const { error } = await supabase.from("tarefas").delete().eq("id", id);

      if (error) throw error;
      toast.success("Tarefa removida!");
      fetchTarefas();
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      toast.error("Erro ao excluir tarefa");
    }
  };

  const handleEditTarefa = (tarefa: Tarefa) => {
    setEditingTarefa(tarefa);
    setEditDescricao(tarefa.descricao);
    setEditDataVencimento(tarefa.data_vencimento || "");
  };

  const handleUpdateTarefa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingTarefa) return;

    if (!editDescricao.trim()) {
      toast.error("Digite uma descrição para a tarefa");
      return;
    }

    if (!editDataVencimento) {
      toast.error("Selecione uma data de vencimento");
      return;
    }

    try {
      const { error } = await supabase
        .from("tarefas")
        .update({
          descricao: editDescricao.trim(),
          data_vencimento: editDataVencimento,
        })
        .eq("id", editingTarefa.id);

      if (error) throw error;

      toast.success("Tarefa atualizada com sucesso!");
      setEditingTarefa(null);
      setEditDescricao("");
      setEditDataVencimento("");
      fetchTarefas();
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const formatDate = (dateStr: string) => {
    // Parse the date string directly without timezone conversion
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  };

  const getBrasiliaDate = () => {
    const now = new Date();
    const brasiliaDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    return brasiliaDateStr; // Format: YYYY-MM-DD
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    const todayBrasilia = getBrasiliaDate();
    return dateStr < todayBrasilia;
  };

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    const todayBrasilia = getBrasiliaDate();
    return dateStr === todayBrasilia;
  };

  // Group tasks by status
  const overdueTasks = tarefas.filter((t) => t.data_vencimento && isOverdue(t.data_vencimento));
  const todayTasks = tarefas.filter((t) => t.data_vencimento && isToday(t.data_vencimento));
  const upcomingTasks = tarefas.filter(
    (t) => t.data_vencimento && !isOverdue(t.data_vencimento) && !isToday(t.data_vencimento)
  );

  return (
    <Layout title="Anotações da Barbara">
      <div className="max-w-4xl mx-auto px-2 sm:px-0">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="text-primary" size={20} />
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-foreground">Anotações</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Gerencie suas tarefas e lembretes</p>
          </div>
        </div>

        {/* Add Task Form */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 md:p-6 mb-4 md:mb-6">
          <h3 className="font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
            <Plus size={18} className="text-primary" />
            Nova Tarefa
          </h3>
          <form onSubmit={handleAddTarefa} className="flex flex-col gap-3 md:flex-row md:gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={newDescricao}
                onChange={(e) => setNewDescricao(e.target.value)}
                placeholder="Descreva a tarefa..."
                className="form-input text-sm"
              />
            </div>
            <div className="flex gap-2 md:gap-4">
              <div className="flex-1 md:w-48 md:flex-none">
                <input
                  type="date"
                  value={newDataVencimento}
                  onChange={(e) => setNewDataVencimento(e.target.value)}
                  className="form-input text-sm"
                />
              </div>
              <button type="submit" className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap text-sm px-4">
                <Plus size={16} />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Carregando...
          </div>
        ) : tarefas.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 md:p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto text-status-green mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">Tudo em dia!</h3>
            <p className="text-sm text-muted-foreground">
              Nenhuma tarefa pendente. Adicione uma nova tarefa acima.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  Atrasadas ({overdueTasks.length})
                </h3>
                <div className="space-y-2">
                  {overdueTasks.map((tarefa) => (
                    <TaskCard
                      key={tarefa.id}
                      tarefa={tarefa}
                      onDelete={handleDeleteTarefa}
                      onEdit={handleEditTarefa}
                      formatDate={formatDate}
                      formatDateTime={formatDateTime}
                      variant="overdue"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Today's Tasks */}
            {todayTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-status-yellow mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-yellow" />
                  Para Hoje ({todayTasks.length})
                </h3>
                <div className="space-y-2">
                  {todayTasks.map((tarefa) => (
                    <TaskCard
                      key={tarefa.id}
                      tarefa={tarefa}
                      onDelete={handleDeleteTarefa}
                      onEdit={handleEditTarefa}
                      formatDate={formatDate}
                      formatDateTime={formatDateTime}
                      variant="today"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Tasks */}
            {upcomingTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Próximas ({upcomingTasks.length})
                </h3>
                <div className="space-y-2">
                  {upcomingTasks.map((tarefa) => (
                    <TaskCard
                      key={tarefa.id}
                      tarefa={tarefa}
                      onDelete={handleDeleteTarefa}
                      onEdit={handleEditTarefa}
                      formatDate={formatDate}
                      formatDateTime={formatDateTime}
                      variant="upcoming"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingTarefa} onOpenChange={(open) => !open && setEditingTarefa(null)}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-[100] bg-foreground/20" />
          <DialogContent className="fixed left-[50%] top-[50%] z-[101] translate-x-[-50%] translate-y-[-50%] w-full h-full max-w-full max-h-full sm:max-w-md sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-lg flex flex-col items-start justify-start border bg-background p-6 shadow-lg">
            <DialogHeader className="w-full">
              <DialogTitle className="flex items-center gap-2">
                <Pencil size={20} className="text-primary" />
                Editar Tarefa
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTarefa} className="space-y-4 mt-4 w-full">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  placeholder="Descreva a tarefa..."
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={editDataVencimento}
                  onChange={(e) => setEditDataVencimento(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTarefa(null)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Salvar
                </button>
              </div>
            </form>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </Layout>
  );
};

interface TaskCardProps {
  tarefa: Tarefa;
  onDelete: (id: number) => void;
  onEdit: (tarefa: Tarefa) => void;
  formatDate: (date: string) => string;
  formatDateTime: (date: string) => string;
  variant: "overdue" | "today" | "upcoming";
}

const TaskCard = ({ tarefa, onDelete, onEdit, formatDate, formatDateTime, variant }: TaskCardProps) => {
  const variantStyles = {
    overdue: "border-l-destructive bg-destructive/5",
    today: "border-l-status-yellow bg-status-yellow/5",
    upcoming: "border-l-primary bg-card",
  };

  return (
    <div
      className={`bg-card rounded-lg border border-border/50 border-l-4 p-3 md:p-4 ${variantStyles[variant]} hover:shadow-md transition-shadow overflow-hidden`}
    >
      <div className="flex items-start justify-between gap-2 md:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-medium text-sm md:text-base leading-relaxed break-all whitespace-pre-wrap">
            {tarefa.descricao}
          </p>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm text-muted-foreground">
            {tarefa.data_vencimento && (
              <span className="flex items-center gap-1">
                <Calendar size={14} className="flex-shrink-0" />
                <span className="font-medium">Validade:</span> {formatDate(tarefa.data_vencimento)}
              </span>
            )}
            <span className="text-xs">
              <span className="font-medium">Criada em:</span> {formatDateTime(tarefa.criada_em)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(tarefa)}
            className="p-1.5 md:p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Editar tarefa"
          >
            <Pencil size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
          <button
            onClick={() => onDelete(tarefa.id)}
            className="p-1.5 md:p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Excluir tarefa"
          >
            <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Anotacoes;