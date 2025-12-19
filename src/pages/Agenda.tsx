import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { supabase, formatarMoeda } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, Clock, User, MapPin, Video, X, ThumbsUp, XCircle, Phone, CalendarDays, CalendarCheck, Coffee, Pencil } from "lucide-react";
import { toast } from "sonner";

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
  yellow: { bg: "bg-status-lilac/10", border: "border-status-lilac", text: "text-status-lilac" },
};

const statusOptions = [
  { color: "blue", label: "Atendido", icon: ThumbsUp, bgColor: "bg-status-blue/20", iconBg: "bg-status-blue" },
  { color: "red", label: "Cancelado", icon: XCircle, bgColor: "bg-status-red/20", iconBg: "bg-status-red" },
  { color: "yellow", label: "Não Desmarcado", icon: Clock, bgColor: "bg-status-lilac/20", iconBg: "bg-status-lilac" },
  { color: "green", label: "Agendado", icon: CalendarCheck, bgColor: "bg-status-green/20", iconBg: "bg-status-green" },
  { color: "lilac", label: "Agenda Semanal", icon: CalendarDays, bgColor: "bg-status-lilac/20", iconBg: "bg-status-lilac" },
];

const Agenda = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [compromissos, setCompromissos] = useState<CompromissoPessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [selectedCompromisso, setSelectedCompromisso] = useState<CompromissoPessoal | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const handleEditAgendamento = () => {
    if (selectedAgendamento) {
      navigate(`/agendamentos?edit=${selectedAgendamento.id}`);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, [currentDate]);

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

    // Green (Agendado) agora também atualiza o status no banco

    if (newColor === "lilac") {
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

  // Gerar slots de horário de 30 em 30 min (07:00 às 19:00)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 19; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 19) {
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Calcula quantos slots de 30min um agendamento ocupa
  const calculateSlotSpan = (inicio: string, fim: string) => {
    const [inicioHour, inicioMin] = inicio.substring(0, 5).split(":").map(Number);
    const [fimHour, fimMin] = fim.substring(0, 5).split(":").map(Number);
    const inicioMinutes = inicioHour * 60 + inicioMin;
    const fimMinutes = fimHour * 60 + fimMin;
    const durationMinutes = fimMinutes - inicioMinutes;
    return Math.max(1, Math.ceil(durationMinutes / 30));
  };

  const getAgendamentosForTimeSlot = (date: Date, timeSlot: string) => {
    const dateStr = date.toISOString().split("T")[0];
    return agendamentos.filter((a) => {
      if (a.data_consulta !== dateStr) return false;
      // Compara apenas HH:MM (ignora segundos do banco)
      const inicioFormatado = a.inicio.substring(0, 5);
      return inicioFormatado === timeSlot;
    });
  };

  // Verifica se um slot está ocupado por um agendamento que começou antes
  const isSlotOccupiedByPreviousAgendamento = (date: Date, timeSlot: string) => {
    const dateStr = date.toISOString().split("T")[0];
    const [slotHour, slotMin] = timeSlot.split(":").map(Number);
    const slotMinutes = slotHour * 60 + slotMin;
    
    return agendamentos.some((a) => {
      if (a.data_consulta !== dateStr) return false;
      const [inicioHour, inicioMin] = a.inicio.substring(0, 5).split(":").map(Number);
      const inicioMinutes = inicioHour * 60 + inicioMin;
      // O agendamento começa antes deste slot
      if (inicioMinutes >= slotMinutes) return false;
      // Verifica se ainda está ocupando este slot
      const slotSpan = calculateSlotSpan(a.inicio, a.fim);
      const endSlotMinutes = inicioMinutes + (slotSpan * 30);
      return slotMinutes < endSlotMinutes;
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-2xl font-bold text-foreground capitalize">{formatDateHeader()}</h2>
            <div className="flex items-center gap-1 md:gap-2">
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
                            const isOccupiedByAgendamento = isSlotOccupiedByPreviousAgendamento(date, timeSlot);
                            const isOccupiedByCompromisso = isSlotOccupiedByPreviousCompromisso(date, timeSlot);
                            
                            return (
                              <td
                                key={`${timeSlot}-${dayIndex}`}
                                className={`p-0.5 border-l border-border/30 hover:bg-muted/30 transition-colors align-top relative ${isToday ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}
                              >
                                {/* Compromissos Pessoais - só renderiza se não está ocupado por compromisso anterior */}
                                {!isOccupiedByCompromisso && slotCompromissos.map((comp) => {
                                  const slotSpan = calculateSlotSpan(comp.inicio, comp.fim);
                                  const height = slotSpan * 28 - (slotSpan * 4);
                                  return (
                                    <div
                                      key={`comp-${comp.id}`}
                                      onClick={() => handleCompromissoClick(comp)}
                                      className="absolute left-1 right-1 px-1.5 py-0.5 bg-amber-500 cursor-pointer hover:opacity-80 transition-opacity rounded z-10"
                                      style={{ height: `${height}px`, top: 2 }}
                                    >
                                      <span className="text-white text-xs font-medium truncate block">
                                        {comp.nome}
                                      </span>
                                    </div>
                                  );
                                })}
                                {/* Agendamentos - só renderiza se não está ocupado por agendamento anterior */}
                                {!isOccupiedByAgendamento && slotAgendamentos.map((ag, agIndex) => {
                                  const bgColor = ag.color === "green" ? "bg-status-green" :
                                                  ag.color === "blue" ? "bg-status-blue" :
                                                  ag.color === "red" ? "bg-status-red" :
                                                  ag.color === "yellow" ? "bg-status-lilac" :
                                                  ag.color === "lilac" ? "bg-status-lilac" : "bg-status-green";
                                  const slotSpan = calculateSlotSpan(ag.inicio, ag.fim);
                                  const height = slotSpan * 28 - (slotSpan * 4);
                                  const totalItems = slotAgendamentos.length;
                                  const gap = 4;
                                  const totalGaps = (totalItems - 1) * gap;
                                  const itemWidth = `calc((100% - 8px - ${totalGaps}px) / ${totalItems})`;
                                  const leftOffset = `calc(4px + ${agIndex} * ((100% - 8px - ${totalGaps}px) / ${totalItems} + ${gap}px))`;
                                  return (
                                    <div
                                      key={ag.id}
                                      onClick={() => handleAgendamentoClick(ag)}
                                      className={`absolute px-1.5 py-0.5 ${bgColor} cursor-pointer hover:opacity-80 transition-opacity rounded z-10`}
                                      style={{ 
                                        height: `${height}px`, 
                                        top: 2,
                                        left: totalItems > 1 ? leftOffset : 4,
                                        width: totalItems > 1 ? itemWidth : "calc(100% - 8px)"
                                      }}
                                    >
                                      <span className={`text-xs font-medium truncate block ${ag.modalidade === "Online" ? "text-orange-400" : "text-white"}`}>
                                        {ag.nome_paciente}
                                      </span>
                                    </div>
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

                {/* Mobile Cards - Week View */}
                <div className="md:hidden divide-y divide-border/50">
                  {weekDays.map((date, index) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayAgendamentos = getAgendamentosForDate(date);
                    
                    return (
                      <div key={index} className="p-3">
                        <div className={`flex items-center gap-2 mb-2 ${isToday ? "text-primary" : "text-foreground"}`}>
                          <div className={`text-sm font-semibold ${isToday ? "bg-primary text-primary-foreground px-2 py-0.5 rounded-full" : ""}`}>
                            {dayNames[index]} {date.getDate()}
                          </div>
                          {dayAgendamentos.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({dayAgendamentos.length} {dayAgendamentos.length === 1 ? "consulta" : "consultas"})
                            </span>
                          )}
                        </div>
                        
                        {dayAgendamentos.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Sem agendamentos</p>
                        ) : (
                          <div className="space-y-2">
                            {dayAgendamentos.map((ag) => {
                              const colors = statusColors[ag.color] || statusColors.green;
                              return (
                                <div
                                  key={ag.id}
                                  onClick={() => handleAgendamentoClick(ag)}
                                  className={`p-3 rounded-lg border-l-4 ${colors.bg} ${colors.border} cursor-pointer active:scale-[0.98] transition-transform`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-medium ${colors.text}`}>
                                      {ag.inicio} - {ag.fim}
                                    </span>
                                    {ag.modalidade === "Online" && (
                                      <Video size={14} className="text-status-blue" />
                                    )}
                                  </div>
                                  <div className={`text-sm font-medium ${ag.modalidade === "Online" ? "text-orange-400" : "text-foreground"}`}>
                                    {ag.nome_paciente}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {ag.convenio} • {ag.consulta}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                                <span className={`font-medium text-sm md:text-base ${ag.modalidade === "Online" ? "text-orange-400" : "text-foreground"}`}>{ag.nome_paciente}</span>
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
                                } ${ag.modalidade === "Online" ? "text-orange-400" : ag.color === "yellow" ? "text-status-lilac" : `text-status-${ag.color}`}`}
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
            <div className="relative px-5 pt-[calc(env(safe-area-inset-top,24px)+16px)] pb-5 md:px-6 md:pt-5 md:pb-6 flex-shrink-0">
              {/* Action buttons */}
              <div className="absolute top-[calc(env(safe-area-inset-top,16px)+16px)] right-4 md:top-5 md:right-5 flex items-center gap-1">
                <button
                  onClick={handleEditAgendamento}
                  className="p-2 rounded-full hover:bg-primary/10 transition-colors text-primary"
                  title="Editar agendamento"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => setSelectedAgendamento(null)}
                  className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Patient info */}
              <div className="pr-24">
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">{selectedAgendamento.nome_paciente}</h2>
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
                    return (
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${currentStatus.bgColor}`}>
                        <StatusIcon size={14} className={currentStatus.color === "yellow" ? "text-status-lilac" : `text-status-${currentStatus.color}`} />
                        <span className={`text-xs font-semibold ${currentStatus.color === "yellow" ? "text-status-lilac" : `text-status-${currentStatus.color}`}`}>{currentStatus.label}</span>
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
    </Layout>
  );
};

export default Agenda;
