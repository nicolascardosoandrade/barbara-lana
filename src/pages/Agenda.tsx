import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPortal } from "react-dom";
import { Layout } from "@/components/layout/Layout";
import { supabase, formatarMoeda } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, Clock, User, MapPin, Video, X, ThumbsUp, XCircle, Phone, CalendarDays, CalendarCheck, Coffee, Pencil, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AgendamentoFormModal } from "@/components/AgendamentoFormModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Agendamento {
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
  valor: number;
  color: string;
  observacoes: string | null;
}

interface CompromissoPessoal {
  id: number;
  nome: string;
  data_compromisso: string;
  inicio: string;
  fim: string;
  status: string;
  observacoes: string | null;
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  green: { bg: "bg-status-green/10", border: "border-status-green", text: "text-status-green" },
  blue: { bg: "bg-status-blue/10", border: "border-status-blue", text: "text-status-blue" },
  red: { bg: "bg-status-red/10", border: "border-status-red", text: "text-status-red" },
  lilac: { bg: "bg-status-lilac/10", border: "border-status-lilac", text: "text-status-lilac" },
};

const statusOptions = [
  { color: "blue", label: "Atendido", icon: ThumbsUp, bgColor: "bg-status-blue/20", iconBg: "bg-status-blue" },
  { color: "red", label: "Cancelado", icon: XCircle, bgColor: "bg-status-red/20", iconBg: "bg-status-red" },
  { color: "lilac", label: "Não Desmarcado", icon: Clock, bgColor: "bg-status-lilac/20", iconBg: "bg-status-lilac" },
  { color: "green", label: "Agendado", icon: CalendarCheck, bgColor: "bg-status-green/20", iconBg: "bg-status-green" },
  { color: "agenda-semanal", label: "Agenda Semanal", icon: CalendarDays, bgColor: "bg-status-lilac/20", iconBg: "bg-status-lilac" },
];

const Agenda = () => {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [compromissos, setCompromissos] = useState<CompromissoPessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [selectedCompromisso, setSelectedCompromisso] = useState<CompromissoPessoal | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingAgendamento, setViewingAgendamento] = useState<Agendamento | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);

  const handleEditAgendamento = () => {
    if (selectedAgendamento) {
      setEditingAgendamento(selectedAgendamento);
      setShowEditModal(true);
      setSelectedAgendamento(null);
    }
  };

  const handleDeleteAgendamento = async () => {
    if (!selectedAgendamento) return;
    
    if (!confirm("Deseja realmente excluir este agendamento?")) return;

    try {
      const { error } = await supabase.from("agendamentos").delete().eq("id", selectedAgendamento.id);

      if (error) throw error;
      toast.success("Agendamento excluído com sucesso!");
      setSelectedAgendamento(null);
      fetchAgendamentos();
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error("Erro ao excluir agendamento");
    }
  };

  const handleViewDetails = () => {
    if (selectedAgendamento) {
      setViewingAgendamento(selectedAgendamento);
      setShowDetailsModal(true);
      setSelectedAgendamento(null);
    }
  };

  const handleEditFromDetails = () => {
    if (viewingAgendamento) {
      setEditingAgendamento(viewingAgendamento);
      setShowEditModal(true);
      setShowDetailsModal(false);
      setViewingAgendamento(null);
    }
  };

  const handleDeleteFromDetails = async () => {
    if (!viewingAgendamento) return;
    
    if (!confirm("Deseja realmente excluir este agendamento?")) return;

    try {
      const { error } = await supabase.from("agendamentos").delete().eq("id", viewingAgendamento.id);

      if (error) throw error;
      toast.success("Agendamento excluído com sucesso!");
      setShowDetailsModal(false);
      setViewingAgendamento(null);
      fetchAgendamentos();
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error("Erro ao excluir agendamento");
    }
  };

  const handleStatusChangeFromDetails = async (newColor: string) => {
    if (!viewingAgendamento) return;

    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ color: newColor })
        .eq("id", viewingAgendamento.id);

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
      setViewingAgendamento({ ...viewingAgendamento, color: newColor });
      fetchAgendamentos();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, [currentDate]);

  // Realtime subscription para sincronizar mudanças entre páginas
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("agenda-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos" },
        () => {
          fetchAgendamentos();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "compromissos_pessoais" },
        () => {
          fetchAgendamentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentDate]);

  const fetchAgendamentos = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const [agendamentosRes, compromissosRes] = await Promise.all([
        supabase
          .from("agendamentos")
          .select("*")
          .gte("data_consulta", startOfMonth.toISOString().split("T")[0])
          .lte("data_consulta", endOfMonth.toISOString().split("T")[0])
          .order("data_consulta")
          .order("inicio"),
        supabase
          .from("compromissos_pessoais")
          .select("*")
          .gte("data_compromisso", startOfMonth.toISOString().split("T")[0])
          .lte("data_compromisso", endOfMonth.toISOString().split("T")[0])
          .order("data_compromisso")
          .order("inicio"),
      ]);

      if (agendamentosRes.error) throw agendamentosRes.error;
      if (compromissosRes.error) throw compromissosRes.error;

      setAgendamentos(agendamentosRes.data || []);
      setCompromissos(compromissosRes.data || []);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getAgendamentosForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return agendamentos.filter((a) => a.data_consulta === dateStr);
  };

  const getCompromissosForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return compromissos.filter((c) => c.data_compromisso === dateStr);
  };

  const getCompromissosForTimeSlot = (date: Date, timeSlot: string) => {
    const dateStr = date.toISOString().split("T")[0];
    return compromissos.filter((c) => {
      if (c.data_compromisso !== dateStr) return false;
      const inicioFormatado = c.inicio.substring(0, 5);
      return inicioFormatado === timeSlot;
    });
  };

  const handleCompromissoClick = (comp: CompromissoPessoal) => {
    setSelectedCompromisso(comp);
  };

  const handleCompromissoStatusChange = async (newStatus: string) => {
    if (!selectedCompromisso) return;

    try {
      const { error } = await supabase
        .from("compromissos_pessoais")
        .update({ status: newStatus })
        .eq("id", selectedCompromisso.id);

      if (error) throw error;

      toast.success("Status do compromisso atualizado!");
      fetchAgendamentos();
      setSelectedCompromisso(null);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
    return currentDate.toLocaleDateString("pt-BR", options);
  };

  const handleAgendamentoClick = (ag: Agendamento) => {
    setSelectedAgendamento(ag);
    setObservacoes(ag.observacoes || "");
  };

  const handleStatusChange = async (newColor: string) => {
    if (!selectedAgendamento) return;

    // Agenda Semanal tem lógica especial
    if (newColor === "agenda-semanal") {
      await handleAgendaSemanal();
      return;
    }

    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ color: newColor, observacoes })
        .eq("id", selectedAgendamento.id);

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
      fetchAgendamentos();
      setSelectedAgendamento(null);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleAgendaSemanal = async () => {
    if (!selectedAgendamento) return;

    try {
      const baseDate = new Date(selectedAgendamento.data_consulta + "T00:00:00");
      const newAgendamentos = [];

      for (let i = 1; i <= 6; i++) {
        const newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() + (7 * i));

        newAgendamentos.push({
          nome_paciente: selectedAgendamento.nome_paciente,
          telefone: selectedAgendamento.telefone,
          data_consulta: newDate.toISOString().split("T")[0],
          inicio: selectedAgendamento.inicio,
          fim: selectedAgendamento.fim,
          convenio: selectedAgendamento.convenio,
          consulta: selectedAgendamento.consulta,
          modalidade: selectedAgendamento.modalidade,
          frequencia: "Semanal",
          valor: selectedAgendamento.valor,
          color: "green",
          observacoes: selectedAgendamento.observacoes,
          user_id: user?.id,
        });
      }

      const { error } = await supabase
        .from("agendamentos")
        .insert(newAgendamentos);

      if (error) throw error;

      toast.success("6 agendamentos semanais criados com sucesso!");
      fetchAgendamentos();
      setSelectedAgendamento(null);
    } catch (error) {
      console.error("Erro ao criar agendamentos semanais:", error);
      toast.error("Erro ao criar agendamentos semanais");
    }
  };

  const handleSaveObservacoes = async () => {
    if (!selectedAgendamento) return;

    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ observacoes })
        .eq("id", selectedAgendamento.id);

      if (error) throw error;

      toast.success("Observações salvas!");
      fetchAgendamentos();
    } catch (error) {
      console.error("Erro ao salvar observações:", error);
      toast.error("Erro ao salvar observações");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
    });
  };

  // Gerar slots de horário de 30 em 30 min (06:00 às 22:00) para cobrir todos agendamentos
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 22) {
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Calcula a altura proporcional de um agendamento baseado na duração real em minutos
  const calculateHeightForAgendamento = (inicio: string, fim: string) => {
    const [inicioHour, inicioMin] = inicio.substring(0, 5).split(":").map(Number);
    const [fimHour, fimMin] = fim.substring(0, 5).split(":").map(Number);
    const inicioMinutes = inicioHour * 60 + inicioMin;
    const fimMinutes = fimHour * 60 + fimMin;
    const durationMinutes = fimMinutes - inicioMinutes;
    // Cada slot de 30 min = 28px de altura base, então 1 minuto = 28/30 px
    const pixelsPerMinute = 28 / 30;
    return Math.max(20, durationMinutes * pixelsPerMinute - 4); // -4 para margem
  };

  // Calcula quantos slots de 30min um agendamento ocupa (para compromissos)
  const calculateSlotSpan = (inicio: string, fim: string) => {
    const [inicioHour, inicioMin] = inicio.substring(0, 5).split(":").map(Number);
    const [fimHour, fimMin] = fim.substring(0, 5).split(":").map(Number);
    const inicioMinutes = inicioHour * 60 + inicioMin;
    const fimMinutes = fimHour * 60 + fimMin;
    const durationMinutes = fimMinutes - inicioMinutes;
    return Math.max(1, Math.ceil(durationMinutes / 30));
  };

  // Retorna todos os agendamentos que começam dentro deste slot de 30min (slot: 15:00 → retorna agendamentos que começam entre 15:00 e 15:29)
  const getAgendamentosForTimeSlot = (date: Date, timeSlot: string) => {
    const dateStr = date.toISOString().split("T")[0];
    const [slotHour, slotMin] = timeSlot.split(":").map(Number);
    const slotStartMinutes = slotHour * 60 + slotMin;
    const slotEndMinutes = slotStartMinutes + 30;
    
    return agendamentos.filter((a) => {
      if (a.data_consulta !== dateStr) return false;
      const [inicioHour, inicioMin] = a.inicio.substring(0, 5).split(":").map(Number);
      const inicioMinutes = inicioHour * 60 + inicioMin;
      // Retorna se o agendamento começa dentro deste slot de 30min
      return inicioMinutes >= slotStartMinutes && inicioMinutes < slotEndMinutes;
    });
  };
  const isSlotOccupiedByPreviousCompromisso = (date: Date, timeSlot: string) => {
    const dateStr = date.toISOString().split("T")[0];
    const [slotHour, slotMin] = timeSlot.split(":").map(Number);
    const slotMinutes = slotHour * 60 + slotMin;
    
    return compromissos.some((c) => {
      if (c.data_compromisso !== dateStr) return false;
      const [inicioHour, inicioMin] = c.inicio.substring(0, 5).split(":").map(Number);
      const inicioMinutes = inicioHour * 60 + inicioMin;
      if (inicioMinutes >= slotMinutes) return false;
      const slotSpan = calculateSlotSpan(c.inicio, c.fim);
      const endSlotMinutes = inicioMinutes + (slotSpan * 30);
      return slotMinutes < endSlotMinutes;
    });
  };

  const weekDays = getWeekDays();
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const dayNamesShort = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <Layout title="Agenda">
      <TooltipProvider>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-2xl font-bold text-foreground capitalize">{formatDateHeader()}</h2>
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setShowAgendamentoModal(true)}
                className="btn-primary flex items-center justify-center gap-2 h-10 px-3 md:px-4 text-sm"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
              <button
                onClick={() => navigateDate("prev")}
                className="p-1.5 md:p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft size={18} className="md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => navigateDate("next")}
                className="p-1.5 md:p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center bg-muted rounded-lg p-0.5 md:p-1">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors ${
                    view === v
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 md:gap-4 mb-4 md:mb-6">
          {[
            { color: "green", label: "Agendado" },
            { color: "blue", label: "Atendido" },
            { color: "red", label: "Cancelado" },
            { color: "lilac", label: "Não Desmarcado" },
          ].map(({ color, label }) => (
            <div key={color} className="flex items-center gap-1.5 md:gap-2">
              <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-status-${color}`} />
              <span className="text-xs md:text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            {/* Week View - Desktop */}
            {view === "week" && (
              <>
                {/* Desktop Grid */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse table-fixed">
                    {/* Header com dias da semana */}
                    <thead>
                      <tr className="border-b border-border/50 bg-card">
                        <th className="w-[50px]"></th>
                        {weekDays.map((date, index) => {
                          const isToday = date.toDateString() === new Date().toDateString();
                          const dayAbbrev = dayNames[index].toLowerCase() + ".";
                          return (
                            <th
                              key={index}
                              className={`py-2 text-center border-l border-border/30 font-medium text-sm ${isToday ? "bg-primary/5 text-primary" : "text-foreground"}`}
                            >
                              {dayAbbrev} {date.getDate().toString().padStart(2, "0")}/{(date.getMonth() + 1).toString().padStart(2, "0")}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    
                    {/* Body com horários */}
                    <tbody className="max-h-[700px]">
                      {timeSlots.map((timeSlot, slotIndex) => (
                        <tr key={timeSlot} className="border-b border-border/30 h-7">
                          {/* Coluna de horário */}
                          <td className="w-[50px] py-1 text-xs text-muted-foreground font-medium text-right pr-2 align-top">
                            {timeSlot}
                          </td>
                          
                          {/* Células dos dias */}
                          {weekDays.map((date, dayIndex) => {
                            const slotAgendamentos = getAgendamentosForTimeSlot(date, timeSlot);
                            const slotCompromissos = getCompromissosForTimeSlot(date, timeSlot);
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isOccupiedByCompromisso = isSlotOccupiedByPreviousCompromisso(date, timeSlot);
                            
                            const hasAnyContent = slotAgendamentos.length > 0 || slotCompromissos.length > 0 || isOccupiedByCompromisso;
                            const slotEndMin = parseInt(timeSlot.split(":")[0]) * 60 + parseInt(timeSlot.split(":")[1]) + 30;
                            const slotEndHour = Math.floor(slotEndMin / 60).toString().padStart(2, "0");
                            const slotEndMinute = (slotEndMin % 60).toString().padStart(2, "0");
                            const slotEndTime = `${slotEndHour}:${slotEndMinute}`;
                            
                            return (
                              <td
                                key={`${timeSlot}-${dayIndex}`}
                                className={`p-0.5 border-l border-border/30 hover:bg-muted/30 transition-colors align-top relative ${isToday ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}
                              >
                                {/* Tooltip para slots vazios */}
                                {!hasAnyContent && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="absolute inset-0 cursor-pointer" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                                      <p className="text-xs font-medium">{format(date, "dd/MM/yyyy")}</p>
                                      <p className="text-xs text-muted-foreground">Horário disponível: {timeSlot} - {slotEndTime}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {/* Compromissos Pessoais - só renderiza se não está ocupado por compromisso anterior */}
                                {!isOccupiedByCompromisso && slotCompromissos.map((comp) => {
                                  const slotSpan = calculateSlotSpan(comp.inicio, comp.fim);
                                  const height = slotSpan * 28 - (slotSpan * 4);
                                  return (
                                    <Tooltip key={`comp-${comp.id}`}>
                                      <TooltipTrigger asChild>
                                        <div
                                          onClick={() => handleCompromissoClick(comp)}
                                          className="absolute left-1 right-1 px-1.5 py-0.5 bg-amber-500 cursor-pointer hover:opacity-80 transition-opacity rounded z-10"
                                          style={{ height: `${height}px`, top: 2 }}
                                        >
                                          <span className="text-white text-xs font-medium truncate block">
                                            {comp.nome}
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                                        <p className="text-xs font-medium">{format(date, "dd/MM/yyyy")}</p>
                                        <p className="text-xs">{comp.nome}</p>
                                        <p className="text-xs text-muted-foreground">{comp.inicio.substring(0, 5)} - {comp.fim.substring(0, 5)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                                {/* Agendamentos que iniciam neste slot */}
                                {slotAgendamentos.map((ag) => {
                                  const bgColor = ag.color === "green" ? "bg-status-green" :
                                                  ag.color === "blue" ? "bg-status-blue" :
                                                  ag.color === "red" ? "bg-status-red" :
                                                  ag.color === "yellow" ? "bg-status-lilac" :
                                                  ag.color === "lilac" ? "bg-status-lilac" : "bg-status-green";
                                  // Usar altura proporcional à duração real
                                  const height = calculateHeightForAgendamento(ag.inicio, ag.fim);
                                  
                                  // Calcular offset vertical baseado no minuto de início dentro do slot de 30min
                                  const [agInicioHour, agInicioMin] = ag.inicio.substring(0, 5).split(":").map(Number);
                                  const [slotHour, slotMin] = timeSlot.split(":").map(Number);
                                  const agInicioMinutes = agInicioHour * 60 + agInicioMin;
                                  const slotStartMinutes = slotHour * 60 + slotMin;
                                  const minutesOffset = agInicioMinutes - slotStartMinutes;
                                  const pixelsPerMinute = 28 / 30;
                                  const topOffset = 2 + (minutesOffset * pixelsPerMinute);
                                  
                                  // Para agendamentos que começam neste slot, calcular sobreposição apenas com outros que também começam aqui
                                  const agIndex = slotAgendamentos.findIndex(a => a.id === ag.id);
                                  const totalItems = slotAgendamentos.length;
                                  const gap = 2;
                                  const totalGaps = (totalItems - 1) * gap;
                                  const itemWidth = totalItems > 1 
                                    ? `calc((100% - 8px - ${totalGaps}px) / ${totalItems})`
                                    : "calc(100% - 8px)";
                                  const leftOffset = totalItems > 1 
                                    ? `calc(4px + ${agIndex} * ((100% - 8px - ${totalGaps}px) / ${totalItems} + ${gap}px))`
                                    : "4px";
                                  
                                  return (
                                    <Tooltip key={ag.id}>
                                      <TooltipTrigger asChild>
                                        <div
                                          onClick={() => handleAgendamentoClick(ag)}
                                          className={`absolute px-1.5 py-0.5 ${bgColor} cursor-pointer hover:opacity-80 transition-opacity rounded z-10`}
                                          style={{ 
                                            height: `${height}px`, 
                                            top: topOffset,
                                            left: leftOffset,
                                            width: itemWidth
                                          }}
                                        >
                                          <span className={`text-xs font-medium truncate block ${ag.modalidade === "Online" ? "text-amber-300" : "text-white"}`}>
                                            {ag.nome_paciente}
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                                        <p className="text-xs font-medium">{format(date, "dd/MM/yyyy")}</p>
                                        <p className="text-xs">{ag.nome_paciente}</p>
                                        <p className="text-xs text-muted-foreground">{ag.inicio.substring(0, 5)} - {ag.fim.substring(0, 5)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Grid - Week View - Mesmo padrão do desktop */}
                <div className="md:hidden overflow-x-auto">
                  {/* Header com período da semana */}
                  <div className="text-center text-sm text-muted-foreground mb-3 px-2">
                    {format(weekDays[0], "dd")} - {format(weekDays[6], "dd")} de {format(weekDays[0], "MMMM", { locale: ptBR })}
                  </div>
                  
                  <table className="w-full min-w-[360px] border-collapse table-fixed">
                    {/* Header com dias da semana */}
                    <thead>
                      <tr className="border-b border-border/50 bg-card">
                        <th className="w-[32px]"></th>
                        {weekDays.map((date, index) => {
                          const isToday = date.toDateString() === new Date().toDateString();
                          return (
                            <th
                              key={index}
                              className={`py-1.5 text-center border-l border-border/30 font-medium text-[10px] ${isToday ? "bg-primary/5 text-primary" : "text-foreground"}`}
                            >
                              <div className="text-[9px] uppercase">{dayNamesShort[index]}</div>
                              <div className={`text-[10px] font-bold ${isToday ? "bg-primary text-primary-foreground w-4 h-4 rounded-full mx-auto flex items-center justify-center" : ""}`}>
                                {date.getDate()}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    
                    {/* Body com horários - slots de 30 minutos */}
                    <tbody>
                      {timeSlots.map((timeSlot) => {
                        const [slotHour, slotMin] = timeSlot.split(":").map(Number);
                        const showHour = slotMin === 0;
                        
                        return (
                          <tr key={timeSlot} className="border-b border-border/20 h-6">
                            {/* Coluna de horário - exibe 30 em 30 min */}
                            <td className="w-[36px] py-0.5 text-[8px] text-muted-foreground font-medium text-right pr-1 align-top">
                              {timeSlot}
                            </td>
                            
                            {/* Células dos dias */}
                            {weekDays.map((date, dayIndex) => {
                              const slotAgendamentos = getAgendamentosForTimeSlot(date, timeSlot);
                              const slotCompromissos = getCompromissosForTimeSlot(date, timeSlot);
                              const isToday = date.toDateString() === new Date().toDateString();
                              const isOccupiedByCompromisso = isSlotOccupiedByPreviousCompromisso(date, timeSlot);
                              
                              return (
                                <td
                                  key={`${timeSlot}-${dayIndex}`}
                                  className={`p-0 border-l border-border/20 hover:bg-muted/30 transition-colors align-top relative ${isToday ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}
                                >
                                  {/* Compromissos Pessoais - só renderiza se não está ocupado por compromisso anterior */}
                                  {!isOccupiedByCompromisso && slotCompromissos.map((comp) => {
                                    const slotSpan = calculateSlotSpan(comp.inicio, comp.fim);
                                    // Cada slot = 24px de altura
                                    const height = slotSpan * 24 - 2;
                                    return (
                                      <div
                                        key={`comp-${comp.id}`}
                                        onClick={() => handleCompromissoClick(comp)}
                                        className="absolute left-0.5 right-0.5 px-0.5 py-0.5 bg-amber-500 cursor-pointer hover:opacity-80 transition-opacity rounded z-10"
                                        style={{ height: `${height}px`, top: 1 }}
                                      >
                                        <span className="text-white text-[7px] font-medium truncate block leading-tight">
                                          {comp.nome.split(" ")[0]}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Agendamentos que iniciam neste slot */}
                                  {slotAgendamentos.map((ag) => {
                                    const bgColor = ag.color === "green" ? "bg-status-green" :
                                                    ag.color === "blue" ? "bg-status-blue" :
                                                    ag.color === "red" ? "bg-status-red" :
                                                    ag.color === "yellow" ? "bg-status-lilac" :
                                                    ag.color === "lilac" ? "bg-status-lilac" : "bg-status-green";
                                    
                                    // Altura proporcional à duração real (mesma lógica do desktop, mas com 24px por slot)
                                    const [inicioHour, inicioMin] = ag.inicio.substring(0, 5).split(":").map(Number);
                                    const [fimHour, fimMin] = ag.fim.substring(0, 5).split(":").map(Number);
                                    const inicioMinutes = inicioHour * 60 + inicioMin;
                                    const fimMinutes = fimHour * 60 + fimMin;
                                    const durationMinutes = fimMinutes - inicioMinutes;
                                    // Cada slot de 30 min = 24px de altura, então 1 minuto = 24/30 px
                                    const pixelsPerMinute = 24 / 30;
                                    const height = Math.max(18, durationMinutes * pixelsPerMinute - 2);
                                    
                                    // Calcular offset vertical baseado no minuto de início dentro do slot de 30min
                                    const slotStartMinutes = slotHour * 60 + slotMin;
                                    const minutesOffset = inicioMinutes - slotStartMinutes;
                                    const topOffset = 1 + (minutesOffset * pixelsPerMinute);
                                    
                                    // Para agendamentos que começam neste slot, calcular sobreposição
                                    const agIndex = slotAgendamentos.findIndex(a => a.id === ag.id);
                                    const totalItems = slotAgendamentos.length;
                                    const gap = 1;
                                    const totalGaps = (totalItems - 1) * gap;
                                    const itemWidth = totalItems > 1 
                                      ? `calc((100% - 4px - ${totalGaps}px) / ${totalItems})`
                                      : "calc(100% - 4px)";
                                    const leftOffset = totalItems > 1 
                                      ? `calc(2px + ${agIndex} * ((100% - 4px - ${totalGaps}px) / ${totalItems} + ${gap}px))`
                                      : "2px";
                                    
                                    return (
                                      <div
                                        key={ag.id}
                                        onClick={() => handleAgendamentoClick(ag)}
                                        className={`absolute px-0.5 py-0.5 ${bgColor} cursor-pointer hover:opacity-80 transition-opacity rounded z-10`}
                                        style={{ 
                                          height: `${height}px`, 
                                          top: topOffset,
                                          left: leftOffset,
                                          width: itemWidth
                                        }}
                                      >
                                        <span className={`text-[7px] font-medium block leading-tight overflow-hidden text-ellipsis whitespace-nowrap ${ag.modalidade === "Online" ? "text-amber-300" : "text-white"}`}>
                                          {ag.nome_paciente}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Day View */}
            {view === "day" && (
              <div className="p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold mb-4">
                  {currentDate.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                <div className="space-y-3">
                  {getAgendamentosForDate(currentDate).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum agendamento para este dia
                    </div>
                  ) : (
                    getAgendamentosForDate(currentDate).map((ag) => {
                      const colors = statusColors[ag.color] || statusColors.green;
                      return (
                        <div
                          key={ag.id}
                          onClick={() => handleAgendamentoClick(ag)}
                          className={`p-3 md:p-4 rounded-xl border-l-4 ${colors.bg} ${colors.border} cursor-pointer hover:shadow-md active:scale-[0.99] transition-all`}
                        >
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock size={14} className={`${colors.text} md:w-4 md:h-4`} />
                                <span className={`text-sm font-medium ${colors.text}`}>
                                  {ag.inicio} - {ag.fim}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <User size={14} className="text-muted-foreground md:w-4 md:h-4" />
                                <span className={`font-medium text-sm md:text-base ${ag.modalidade === "Online" ? "text-amber-300" : "text-foreground"}`}>{ag.nome_paciente}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                                {ag.modalidade === "Online" ? (
                                  <Video size={12} className="md:w-3.5 md:h-3.5" />
                                ) : (
                                  <MapPin size={12} className="md:w-3.5 md:h-3.5" />
                                )}
                                <span>{ag.modalidade}</span>
                                <span>•</span>
                                <span>{ag.convenio}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between md:flex-col md:items-end gap-1">
                              <div className="font-semibold text-foreground text-sm md:text-base">
                                {formatarMoeda(ag.valor)}
                              </div>
                              <div className="text-xs md:text-sm text-muted-foreground">{ag.consulta}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Month View */}
            {view === "month" && (
              <div className="p-2 md:p-4">
                {/* Desktop Month View */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-7 gap-1">
                    {dayNames.map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: 42 }, (_, i) => {
                      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      const startOffset = firstDay.getDay();
                      const dayNumber = i - startOffset + 1;
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const dayAgendamentos = getAgendamentosForDate(date);

                      return (
                        <div
                          key={i}
                          className={`min-h-[80px] p-1 border border-border/30 rounded-lg ${
                            isCurrentMonth ? "bg-card" : "bg-muted/30"
                          }`}
                        >
                          <div
                            className={`text-sm mb-1 ${
                              isToday
                                ? "w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                                : isCurrentMonth
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {date.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {dayAgendamentos.slice(0, 2).map((ag) => (
                              <div
                                key={ag.id}
                                onClick={() => handleAgendamentoClick(ag)}
                                className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 ${
                                  ag.color === "yellow" 
                                    ? "bg-status-lilac/20 border-status-lilac" 
                                    : `bg-status-${ag.color}/20 border-status-${ag.color}`
                                } ${ag.modalidade === "Online" ? "text-amber-300" : ag.color === "yellow" ? "text-status-lilac" : `text-status-${ag.color}`}`}
                              >
                                {ag.nome_paciente}
                              </div>
                            ))}
                            {dayAgendamentos.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayAgendamentos.length - 2} mais
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Month View */}
                <div className="md:hidden">
                  <div className="grid grid-cols-7 gap-0.5 mb-2">
                    {dayNamesShort.map((day, i) => (
                      <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: 42 }, (_, i) => {
                      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      const startOffset = firstDay.getDay();
                      const dayNumber = i - startOffset + 1;
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const dayAgendamentos = getAgendamentosForDate(date);

                      return (
                        <div
                          key={i}
                          onClick={() => {
                            if (isCurrentMonth && dayAgendamentos.length > 0) {
                              setCurrentDate(date);
                              setView("day");
                            }
                          }}
                          className={`min-h-[48px] p-1 border border-border/30 rounded ${
                            isCurrentMonth ? "bg-card" : "bg-muted/30"
                          } ${isCurrentMonth && dayAgendamentos.length > 0 ? "cursor-pointer active:bg-muted" : ""}`}
                        >
                          <div
                            className={`text-xs mb-0.5 ${
                              isToday
                                ? "w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]"
                                : isCurrentMonth
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                            }`}
                          >
                            {date.getDate()}
                          </div>
                          {dayAgendamentos.length > 0 && (
                            <div className="flex flex-wrap gap-0.5">
                              {dayAgendamentos.slice(0, 3).map((ag) => (
                                <div
                                  key={ag.id}
                                  className={`w-1.5 h-1.5 rounded-full ${ag.color === "yellow" ? "bg-status-lilac" : `bg-status-${ag.color}`}`}
                                />
                              ))}
                              {dayAgendamentos.length > 3 && (
                                <span className="text-[8px] text-muted-foreground">+{dayAgendamentos.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Popup Modal */}
      {selectedAgendamento && createPortal(
        <div 
          className="fixed inset-0 bg-black/40 flex items-start md:items-center justify-center z-[100] p-0 md:p-4"
          onClick={() => setSelectedAgendamento(null)}
        >
          <div 
            className="bg-card md:rounded-2xl shadow-2xl w-full md:max-w-xl h-dvh md:h-auto md:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header with gradient accent */}
            <div className="px-5 pt-[calc(env(safe-area-inset-top,24px)+16px)] pb-5 md:px-6 md:pt-5 md:pb-6">
              {/* Top row with name and action buttons */}
              <div className="flex items-start justify-between gap-3">
                {/* Patient name - allows wrapping */}
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1 break-words min-w-0 flex-1">{selectedAgendamento.nome_paciente}</h2>
                
                {/* Action buttons - fixed width, no shrink */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={handleViewDetails}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Ver detalhes"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={handleEditAgendamento}
                    className="p-2 rounded-full hover:bg-primary/10 transition-colors text-primary"
                    title="Editar agendamento"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={handleDeleteAgendamento}
                    className="p-2 rounded-full hover:bg-destructive/10 transition-colors text-destructive"
                    title="Excluir agendamento"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedAgendamento(null)}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Patient info details */}
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-primary" />
                  <span className="capitalize">{formatDate(selectedAgendamento.data_consulta)}</span>
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Clock size={14} className="text-primary" />
                  <span>{selectedAgendamento.inicio} - {selectedAgendamento.fim}</span>
                </p>
                {/* Current Status Badge */}
                {(() => {
                  const currentStatus = statusOptions.find(s => s.color === selectedAgendamento.color);
                  if (currentStatus) {
                    const StatusIcon = currentStatus.icon;
                    const colorClass = currentStatus.color === "yellow" ? "text-status-yellow" : `text-status-${currentStatus.color}`;
                    return (
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${currentStatus.bgColor}`}>
                        <StatusIcon size={14} className={colorClass} />
                        <span className={`text-xs font-semibold ${colorClass}`}>{currentStatus.label}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Status Buttons */}
              <div className="flex gap-3 md:gap-4 mt-5 justify-center overflow-x-auto pb-1 scrollbar-hide">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.label}
                      onClick={() => handleStatusChange(option.color)}
                      className="flex flex-col items-center gap-1.5 group flex-shrink-0"
                    >
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full ${option.iconBg} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl active:scale-95 transition-all duration-200`}>
                        <Icon size={22} className="md:w-6 md:h-6" />
                      </div>
                      <span className="text-[10px] md:text-xs font-medium text-muted-foreground whitespace-nowrap">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Details */}
            <div className="px-5 py-4 md:px-6 md:py-5 space-y-3 overflow-y-auto flex-1 md:flex-none md:max-h-[calc(85vh-300px)] pb-[env(safe-area-inset-bottom,16px)]">
              {/* Telefone */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone size={16} className="text-primary" />
                  </div>
                  <div>
                    <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Telefone</span>
                    <p className="text-sm font-medium text-foreground">{selectedAgendamento.telefone || "Não informado"}</p>
                  </div>
                </div>
                {selectedAgendamento.telefone && (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${selectedAgendamento.telefone}`}
                      className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-md"
                    >
                      <Phone size={14} />
                    </a>
                    <a
                      href={`https://wa.me/55${selectedAgendamento.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white hover:opacity-90 active:scale-95 transition-all shadow-md"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-muted/40">
                  <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Convênio</span>
                  <p className="text-sm font-medium text-foreground mt-0.5">{selectedAgendamento.convenio}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consulta</span>
                  <p className="text-sm font-medium text-foreground mt-0.5">{selectedAgendamento.consulta}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modalidade</span>
                  <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                    {selectedAgendamento.modalidade === "Online" ? (
                      <Video size={14} className="text-blue-500" />
                    ) : (
                      <MapPin size={14} className="text-green-500" />
                    )}
                    {selectedAgendamento.modalidade}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frequência</span>
                  <p className="text-sm font-medium text-primary mt-0.5">{selectedAgendamento.frequencia}</p>
                </div>
              </div>

              {/* Observações */}
              <div className="p-3 rounded-xl bg-muted/40">
                <label className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  onBlur={handleSaveObservacoes}
                  className="w-full p-3 border border-border/50 rounded-lg bg-background text-foreground text-sm resize-none h-20 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="Adicionar observações..."
                />
              </div>

              {/* Valor - destacado */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <span className="text-xs md:text-sm font-semibold text-primary uppercase tracking-wide">Valor</span>
                <span className="text-xl md:text-2xl font-bold text-primary">{formatarMoeda(selectedAgendamento.valor)}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Adicionar Agendamento */}
      <AgendamentoFormModal
        isOpen={showAgendamentoModal}
        onClose={() => setShowAgendamentoModal(false)}
        onSuccess={fetchAgendamentos}
      />

      {/* Modal de Editar Agendamento */}
      <AgendamentoFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAgendamento(null);
        }}
        onSuccess={fetchAgendamentos}
        editingId={editingAgendamento?.id}
        initialData={editingAgendamento ? {
          data_consulta: editingAgendamento.data_consulta,
          nome_paciente: editingAgendamento.nome_paciente,
          telefone: editingAgendamento.telefone || "",
          inicio: editingAgendamento.inicio,
          fim: editingAgendamento.fim,
          convenio: editingAgendamento.convenio,
          consulta: editingAgendamento.consulta,
          modalidade: editingAgendamento.modalidade,
          frequencia: editingAgendamento.frequencia,
          observacoes: editingAgendamento.observacoes || "",
          valor: formatarMoeda(editingAgendamento.valor),
        } : null}
      />

      {/* Modal de Detalhes do Agendamento */}
      {showDetailsModal && viewingAgendamento && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-w-4xl md:my-8 animate-scale-in md:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 md:px-6 py-4 pt-[calc(env(safe-area-inset-top,16px)+16px)] md:pt-4 md:rounded-t-xl flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold uppercase tracking-wide">Detalhes do Agendamento</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setViewingAgendamento(null);
                }}
                className="p-2 hover:bg-primary-foreground/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1">
              {/* Informações da Consulta */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-primary border-b border-primary/30 pb-2">
                  Informações da Consulta
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Data da Consulta
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {formatDate(viewingAgendamento.data_consulta)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Nome do Paciente
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.nome_paciente || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Telefone
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.telefone || "Não informado"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Horário de Início
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.inicio || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Horário de Fim
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.fim || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Convênio
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.convenio || "Não informado"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Tipo de Consulta
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.consulta || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Modalidade
                    </label>
                    <div className={`border rounded-lg px-3 py-2.5 text-sm font-medium ${
                      viewingAgendamento.modalidade === "Online"
                        ? "bg-orange-500/10 border-orange-500/30 text-orange-500"
                        : "bg-muted/50 border-border text-foreground"
                    }`}>
                      {viewingAgendamento.modalidade || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Frequência
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.frequencia || "Não informado"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Valor da Consulta
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {formatarMoeda(viewingAgendamento.valor)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Status
                    </label>
                    <select
                      value={viewingAgendamento.color}
                      onChange={(e) => handleStatusChangeFromDetails(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white border-0 cursor-pointer ${
                        viewingAgendamento.color === "green" ? "bg-status-green" :
                        viewingAgendamento.color === "blue" ? "bg-status-blue" :
                        viewingAgendamento.color === "red" ? "bg-status-red" :
                        viewingAgendamento.color === "lilac" ? "bg-status-lilac" : "bg-status-green"
                      }`}
                    >
                      <option value="green">Agendado</option>
                      <option value="blue">Atendido</option>
                      <option value="red">Cancelado</option>
                      <option value="lilac">Não Desmarcado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-primary border-b border-primary/30 pb-2">
                  Observações
                </h4>
                <div className="bg-muted/50 border border-border rounded-lg px-3 py-3 text-sm text-foreground min-h-[100px]">
                  {viewingAgendamento.observacoes || "Não informado"}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 md:gap-3 p-4 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] md:pb-4 border-t border-border flex-shrink-0">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setViewingAgendamento(null);
                }}
                className="px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={handleDeleteFromDetails}
                className="px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors flex items-center gap-1.5 md:gap-2"
              >
                <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                Excluir
              </button>
              <button
                onClick={handleEditFromDetails}
                className="px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 md:gap-2"
              >
                <Pencil size={16} className="md:w-[18px] md:h-[18px]" />
                Editar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </TooltipProvider>
    </Layout>
  );
};

export default Agenda;
