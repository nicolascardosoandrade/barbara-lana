import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { supabase, formatarMoeda } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, X, Search, Calendar, Filter, Square, CheckSquare, FileSpreadsheet, Clock, User, MapPin, Video, Eye, ChevronLeft, ChevronRight, Coffee } from "lucide-react";
import { toast } from "sonner";
import { utils, writeFile } from "xlsx";

// Função para formatar valor como moeda brasileira enquanto digita
const formatarValorInput = (valor: string): string => {
  const apenasNumeros = valor.replace(/\D/g, "");
  if (!apenasNumeros) return "";
  const valorNumerico = parseInt(apenasNumeros) / 100;
  return valorNumerico.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

// Função para converter valor formatado em número
const parsarValorMoeda = (valorFormatado: string): number => {
  const valorLimpo = valorFormatado
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(valorLimpo) || 0;
};

// Função para formatar telefone no formato (00) 00000-0000
const formatarTelefone = (valor: string): string => {
  const apenasNumeros = valor.replace(/\D/g, "").slice(0, 11);
  if (!apenasNumeros) return "";
  if (apenasNumeros.length <= 2) return `(${apenasNumeros}`;
  if (apenasNumeros.length <= 7) return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
  return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7)}`;
};

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
  observacoes: string | null;
  valor: number;
  color: string;
  status_pagamento: string;
}

interface Convenio {
  id: number;
  nome_convenio: string;
  consulta: string;
  duracao: string;
  valor: number;
}

interface Paciente {
  id: number;
  nome_completo: string;
  telefone: string;
  convenio: string;
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

const statusColors: Record<string, { label: string; class: string; bg: string; text: string }> = {
  green: { label: "Agendado", class: "bg-status-green", bg: "bg-status-green/10", text: "text-status-green" },
  blue: { label: "Atendido", class: "bg-status-blue", bg: "bg-status-blue/10", text: "text-status-blue" },
  red: { label: "Cancelado", class: "bg-status-red", bg: "bg-status-red/10", text: "text-status-red" },
  lilac: { label: "Não Desmarcado", class: "bg-status-lilac", bg: "bg-status-lilac/10", text: "text-status-lilac" },
};

const compromissoStatusColors: Record<string, { label: string; class: string; bg: string; text: string }> = {
  pendente: { label: "Pendente", class: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-600" },
  concluido: { label: "Concluído", class: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-600" },
};

const Agendamentos = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [compromissos, setCompromissos] = useState<CompromissoPessoal[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCompromissoModal, setShowCompromissoModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingAgendamento, setViewingAgendamento] = useState<Agendamento | null>(null);
  const [showCompromissoDetailsModal, setShowCompromissoDetailsModal] = useState(false);
  const [viewingCompromisso, setViewingCompromisso] = useState<CompromissoPessoal | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCompromissoId, setEditingCompromissoId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [formData, setFormData] = useState({
    data_consulta: "",
    nome_paciente: "",
    telefone: "",
    inicio: "",
    fim: "",
    convenio: "",
    consulta: "",
    modalidade: "",
    frequencia: "",
    observacoes: "",
    valor: "",
  });

  const [compromissoFormData, setCompromissoFormData] = useState({
    nome: "",
    data_compromisso: "",
    inicio: "",
    fim: "",
    observacoes: "",
  });

  const [showFilter, setShowFilter] = useState(false);
  const [filterConvenio, setFilterConvenio] = useState("");
  const [filterModalidade, setFilterModalidade] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedCompromissoIds, setSelectedCompromissoIds] = useState<number[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [compromissosPage, setCompromissosPage] = useState(1);
  const compromissosPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  // Handle edit param from URL (coming from Agenda page)
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && agendamentos.length > 0) {
      const agendamento = agendamentos.find(a => a.id === parseInt(editId));
      if (agendamento) {
        setEditingId(agendamento.id);
        setFormData({
          data_consulta: agendamento.data_consulta,
          nome_paciente: agendamento.nome_paciente,
          telefone: agendamento.telefone || "",
          inicio: agendamento.inicio,
          fim: agendamento.fim,
          convenio: agendamento.convenio,
          consulta: agendamento.consulta,
          modalidade: agendamento.modalidade,
          frequencia: agendamento.frequencia,
          observacoes: agendamento.observacoes || "",
          valor: formatarMoeda(agendamento.valor),
        });
        setShowModal(true);
        // Clear the URL param
        setSearchParams({});
      }
    }
  }, [searchParams, agendamentos]);

  const fetchData = async () => {
    try {
      const [agendamentosRes, conveniosRes, pacientesRes, compromissosRes] = await Promise.all([
        supabase.from("agendamentos").select("*").order("data_consulta", { ascending: true }).order("inicio", { ascending: true }),
        supabase.from("convenios").select("*").eq("ativo", true),
        supabase.from("pacientes").select("id, nome_completo, telefone, convenio").eq("situacao", "Ativo"),
        supabase.from("compromissos_pessoais").select("*").order("data_compromisso", { ascending: false }),
      ]);

      if (agendamentosRes.error) throw agendamentosRes.error;
      if (conveniosRes.error) throw conveniosRes.error;
      if (pacientesRes.error) throw pacientesRes.error;
      if (compromissosRes.error) throw compromissosRes.error;

      setAgendamentos(agendamentosRes.data || []);
      setConvenios(conveniosRes.data || []);
      setPacientes(pacientesRes.data || []);
      setCompromissos(compromissosRes.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handlePacienteSelect = (nome: string) => {
    const paciente = pacientes.find((p) => p.nome_completo === nome);
    if (paciente) {
      setFormData((prev) => ({
        ...prev,
        nome_paciente: paciente.nome_completo,
        telefone: paciente.telefone,
        convenio: paciente.convenio,
      }));

      const conv = convenios.find((c) => c.nome_convenio === paciente.convenio);
      if (conv) {
        setFormData((prev) => ({
          ...prev,
          consulta: conv.consulta,
          valor: formatarMoeda(conv.valor),
        }));
      }
    }
  };

  const handleConvenioChange = (nomeConvenio: string) => {
    const conv = convenios.find((c) => c.nome_convenio === nomeConvenio);
    if (conv) {
      setFormData((prev) => ({
        ...prev,
        convenio: nomeConvenio,
        consulta: conv.consulta,
        valor: formatarMoeda(conv.valor),
      }));
    } else {
      setFormData((prev) => ({ ...prev, convenio: nomeConvenio }));
    }
  };

  // Função para verificar conflito com compromissos pessoais
  const verificarConflitoCompromisso = (data: string, inicio: string, fim: string, excludeAgendamentoId?: number): CompromissoPessoal | null => {
    const compromissoConflitante = compromissos.find((c) => {
      if (c.data_compromisso !== data) return false;
      
      const inicioNovo = inicio.replace(":", "");
      const fimNovo = fim.replace(":", "");
      const inicioCompromisso = c.inicio.substring(0, 5).replace(":", "");
      const fimCompromisso = c.fim.substring(0, 5).replace(":", "");
      
      // Verifica sobreposição de horários
      return !(fimNovo <= inicioCompromisso || inicioNovo >= fimCompromisso);
    });
    
    return compromissoConflitante || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar conflito com compromissos pessoais
    const conflito = verificarConflitoCompromisso(
      formData.data_consulta,
      formData.inicio,
      formData.fim,
      editingId || undefined
    );

    if (conflito) {
      toast.error(`Conflito com compromisso: "${conflito.nome}" (${conflito.inicio.substring(0, 5)} - ${conflito.fim.substring(0, 5)})`);
      return;
    }

    try {
      const agendamentoData = {
        data_consulta: formData.data_consulta,
        nome_paciente: formData.nome_paciente,
        telefone: formData.telefone || null,
        inicio: formData.inicio,
        fim: formData.fim,
        convenio: formData.convenio,
        consulta: formData.consulta,
        modalidade: formData.modalidade,
        frequencia: formData.frequencia,
        observacoes: formData.observacoes || null,
        valor: parsarValorMoeda(formData.valor),
      };

      if (editingId) {
        const { error } = await supabase
          .from("agendamentos")
          .update(agendamentoData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Agendamento atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("agendamentos").insert({
          ...agendamentoData,
          user_id: user?.id,
        });

        if (error) throw error;
        toast.success("Agendamento cadastrado com sucesso!");
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Erro ao salvar agendamento:", error);
      toast.error(error.message || "Erro ao salvar agendamento");
    }
  };

  // Funções para Compromissos Pessoais
  const handleCompromissoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const compromissoData = {
        nome: compromissoFormData.nome,
        data_compromisso: compromissoFormData.data_compromisso,
        inicio: compromissoFormData.inicio,
        fim: compromissoFormData.fim,
        observacoes: compromissoFormData.observacoes || null,
      };

      if (editingCompromissoId) {
        const { error } = await supabase
          .from("compromissos_pessoais")
          .update(compromissoData)
          .eq("id", editingCompromissoId);

        if (error) throw error;
        toast.success("Compromisso atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("compromissos_pessoais").insert({
          ...compromissoData,
          user_id: user?.id,
        });

        if (error) throw error;
        toast.success("Compromisso cadastrado com sucesso!");
      }

      setShowCompromissoModal(false);
      resetCompromissoForm();
      fetchData();
    } catch (error: any) {
      console.error("Erro ao salvar compromisso:", error);
      toast.error(error.message || "Erro ao salvar compromisso");
    }
  };

  const handleCompromissoStatusChange = async (id: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("compromissos_pessoais")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success("Status do compromisso atualizado!");
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleViewCompromissoDetails = (compromisso: CompromissoPessoal) => {
    setViewingCompromisso(compromisso);
    setShowCompromissoDetailsModal(true);
  };

  const handleEditCompromissoFromDetails = () => {
    if (viewingCompromisso) {
      handleEditCompromisso(viewingCompromisso);
      setShowCompromissoDetailsModal(false);
    }
  };

  const handleDeleteCompromissoFromDetails = async () => {
    if (!viewingCompromisso) return;
    
    if (!confirm("Deseja realmente excluir este compromisso?")) return;

    try {
      const { error } = await supabase.from("compromissos_pessoais").delete().eq("id", viewingCompromisso.id);

      if (error) throw error;
      toast.success("Compromisso excluído com sucesso!");
      setShowCompromissoDetailsModal(false);
      setViewingCompromisso(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir compromisso:", error);
      toast.error("Erro ao excluir compromisso");
    }
  };

  const handleEditCompromisso = (compromisso: CompromissoPessoal) => {
    setEditingCompromissoId(compromisso.id);
    setCompromissoFormData({
      nome: compromisso.nome,
      data_compromisso: compromisso.data_compromisso,
      inicio: compromisso.inicio.substring(0, 5),
      fim: compromisso.fim.substring(0, 5),
      observacoes: compromisso.observacoes || "",
    });
    setShowCompromissoModal(true);
  };

  const handleDeleteCompromisso = async (id: number) => {
    if (!confirm("Deseja realmente excluir este compromisso?")) return;

    try {
      const { error } = await supabase.from("compromissos_pessoais").delete().eq("id", id);

      if (error) throw error;
      toast.success("Compromisso excluído com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir compromisso:", error);
      toast.error("Erro ao excluir compromisso");
    }
  };

  const resetCompromissoForm = () => {
    setEditingCompromissoId(null);
    setCompromissoFormData({
      nome: "",
      data_compromisso: "",
      inicio: "",
      fim: "",
      observacoes: "",
    });
  };

  const handleStatusChange = async (id: number, newColor: string) => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ color: newColor })
        .eq("id", id);

      if (error) throw error;
      toast.success("Status atualizado!");
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleViewDetails = (agendamento: Agendamento) => {
    setViewingAgendamento(agendamento);
    setShowDetailsModal(true);
  };

  const handleEditFromDetails = () => {
    if (viewingAgendamento) {
      handleEdit(viewingAgendamento);
      setShowDetailsModal(false);
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
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error("Erro ao excluir agendamento");
    }
  };

  const handleEdit = (agendamento: Agendamento) => {
    setEditingId(agendamento.id);
    setFormData({
      data_consulta: agendamento.data_consulta,
      nome_paciente: agendamento.nome_paciente,
      telefone: agendamento.telefone || "",
      inicio: agendamento.inicio,
      fim: agendamento.fim,
      convenio: agendamento.convenio,
      consulta: agendamento.consulta,
      modalidade: agendamento.modalidade,
      frequencia: agendamento.frequencia,
      observacoes: agendamento.observacoes || "",
      valor: formatarMoeda(agendamento.valor),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir este agendamento?")) return;

    try {
      const { error } = await supabase.from("agendamentos").delete().eq("id", id);

      if (error) throw error;
      toast.success("Agendamento excluído com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error("Erro ao excluir agendamento");
    }
  };

  const handleDeleteSelected = async () => {
    const totalSelected = selectedIds.length + selectedCompromissoIds.length;
    
    if (totalSelected === 0) {
      toast.error("Selecione pelo menos um item");
      return;
    }

    const messages: string[] = [];
    if (selectedIds.length > 0) messages.push(`${selectedIds.length} agendamento(s)`);
    if (selectedCompromissoIds.length > 0) messages.push(`${selectedCompromissoIds.length} compromisso(s)`);

    if (!confirm(`Deseja realmente excluir ${messages.join(" e ")}?`)) return;

    try {
      if (selectedIds.length > 0) {
        const { error } = await supabase
          .from("agendamentos")
          .delete()
          .in("id", selectedIds);
        if (error) throw error;
      }

      if (selectedCompromissoIds.length > 0) {
        const { error } = await supabase
          .from("compromissos_pessoais")
          .delete()
          .in("id", selectedCompromissoIds);
        if (error) throw error;
      }

      toast.success(`${totalSelected} item(ns) excluído(s) com sucesso!`);
      setSelectedIds([]);
      setSelectedCompromissoIds([]);
      setSelectionMode(false);
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir itens");
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds([]);
      setSelectedCompromissoIds([]);
    }
  };

  const toggleCompromissoSelection = (id: number) => {
    setSelectedCompromissoIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setFilterConvenio("");
    setFilterModalidade("");
    setFilterStatus("");
    setDateFilter("");
    setSearchTerm("");
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      data_consulta: "",
      nome_paciente: "",
      telefone: "",
      inicio: "",
      fim: "",
      convenio: "",
      consulta: "",
      modalidade: "",
      frequencia: "",
      observacoes: "",
      valor: "",
    });
  };

  const formatDate = (dateStr: string) => {
    // Adiciona T00:00:00 para garantir que a data seja interpretada no fuso horário local
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
  };

  const filteredAgendamentos = agendamentos.filter((a) => {
    const matchesSearch =
      a.nome_paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.convenio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || a.data_consulta === dateFilter;
    const matchesConvenio = !filterConvenio || a.convenio === filterConvenio;
    const matchesModalidade = !filterModalidade || a.modalidade === filterModalidade;
    const matchesStatus = !filterStatus || a.color === filterStatus;
    return matchesSearch && matchesDate && matchesConvenio && matchesModalidade && matchesStatus;
  });

  const totalPages = Math.ceil(filteredAgendamentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredAgendamentos.length);
  const paginatedAgendamentos = filteredAgendamentos.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, filterConvenio, filterModalidade, filterStatus]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 3;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAgendamentos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAgendamentos.map((a) => a.id));
    }
  };

  const toggleSelectAllCompromissos = (compromissosList: CompromissoPessoal[]) => {
    if (selectedCompromissoIds.length === compromissosList.length) {
      setSelectedCompromissoIds([]);
    } else {
      setSelectedCompromissoIds(compromissosList.map((c) => c.id));
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredAgendamentos.map((a) => ({
      "Data": formatDate(a.data_consulta),
      "Horário": `${a.inicio} - ${a.fim}`,
      "Paciente": a.nome_paciente,
      "Telefone": a.telefone || "",
      "Convênio": a.convenio,
      "Consulta": a.consulta,
      "Modalidade": a.modalidade,
      "Frequência": a.frequencia,
      "Valor": a.valor,
      "Status": statusColors[a.color]?.label || a.color,
      "Observações": a.observacoes || "",
    }));

    const ws = utils.json_to_sheet(dataToExport);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Agendamentos");
    writeFile(wb, "agendamentos.xlsx");
    toast.success("Planilha exportada com sucesso!");
  };

  return (
    <>
    <Layout title="Agendamentos">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg md:text-2xl font-bold text-foreground">Gerenciar Agendamentos</h2>
            <div className="flex items-center gap-1.5 md:gap-2">
              {selectionMode && (selectedIds.length > 0 || selectedCompromissoIds.length > 0) && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center justify-center gap-2 h-10 px-3 md:px-4 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">Excluir ({selectedIds.length + selectedCompromissoIds.length})</span>
                  <span className="sm:hidden">{selectedIds.length + selectedCompromissoIds.length}</span>
                </button>
              )}
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="btn-primary flex items-center justify-center gap-2 h-10 px-3 md:px-4 text-sm"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
              <button
                onClick={() => {
                  resetCompromissoForm();
                  setShowCompromissoModal(true);
                }}
                className="flex items-center justify-center gap-2 h-10 px-3 md:px-4 text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition-colors"
                title="Compromisso Pessoal"
              >
                <Coffee size={18} />
                <span className="hidden sm:inline">Compromisso</span>
              </button>
              <button
                onClick={exportToExcel}
                className="p-2 md:p-3 rounded-lg border bg-card text-foreground border-border hover:bg-muted transition-colors"
                title="Exportar Excel"
              >
                <FileSpreadsheet size={18} className="md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`p-2 md:p-3 rounded-lg border transition-colors ${
                  showFilter
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
                title="Filtrar"
              >
                <Filter size={18} className="md:w-5 md:h-5" />
              </button>
              <button
                onClick={toggleSelectionMode}
                className={`p-2 md:p-3 rounded-lg border transition-colors ${
                  selectionMode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
                title="Selecionar"
              >
                <Square size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>
          
          {/* Search and Date Filter Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-9 text-sm h-10"
              />
            </div>
            <div className="relative flex-1 sm:max-w-[160px]">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-input pl-9 text-sm h-10"
              />
            </div>
          </div>
        </div>

        {/* Filter Box */}
        {showFilter && (
          <div className="bg-card rounded-xl shadow-card p-3 md:p-4 mb-4 border border-border/50 animate-fade-in">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="font-semibold text-foreground text-sm md:text-base">Filtros</h3>
              <button
                onClick={clearFilters}
                className="text-xs md:text-sm text-primary hover:underline"
              >
                Limpar filtros
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="form-label text-xs">Convênio</label>
                <select
                  value={filterConvenio}
                  onChange={(e) => setFilterConvenio(e.target.value)}
                  className="form-input text-sm h-9"
                >
                  <option value="">Todos</option>
                  {convenios.map((c) => (
                    <option key={c.id} value={c.nome_convenio}>
                      {c.nome_convenio}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Modalidade</label>
                <select
                  value={filterModalidade}
                  onChange={(e) => setFilterModalidade(e.target.value)}
                  className="form-input text-sm h-9"
                >
                  <option value="">Todos</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Online">Online</option>
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="form-input text-sm h-9"
                >
                  <option value="">Todos</option>
                  {Object.entries(statusColors).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Compromissos Pessoais */}
        {compromissos.length > 0 && (() => {
          const filteredCompromissos = compromissos
            .filter((c) => !dateFilter || c.data_compromisso === dateFilter)
            .filter((c) => !searchTerm || c.nome.toLowerCase().includes(searchTerm.toLowerCase()));
          
          const totalCompromissos = filteredCompromissos.length;
          const totalCompromissosPages = Math.ceil(totalCompromissos / compromissosPerPage);
          const startCompromissoIndex = (compromissosPage - 1) * compromissosPerPage;
          const endCompromissoIndex = Math.min(startCompromissoIndex + compromissosPerPage, totalCompromissos);
          const paginatedCompromissos = filteredCompromissos.slice(startCompromissoIndex, endCompromissoIndex);

          return (
            <div className="bg-card rounded-xl shadow-card border border-border/50 mb-4 md:mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 bg-amber-500/5">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Coffee size={18} className="text-amber-500" />
                  Compromissos Pessoais
                </h3>
              </div>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {selectionMode && (
                        <th className="w-12">
                          <button
                            onClick={() => toggleSelectAllCompromissos(filteredCompromissos)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            {selectedCompromissoIds.length === filteredCompromissos.length ? (
                              <CheckSquare size={20} className="text-amber-500" />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        </th>
                      )}
                      <th>Data</th>
                      <th>Horário</th>
                      <th>Compromisso</th>
                      <th>Status</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCompromissos.map((compromisso) => {
                        const statusInfo = compromissoStatusColors[compromisso.status] || compromissoStatusColors.pendente;
                        return (
                          <tr 
                            key={`comp-${compromisso.id}`}
                            className={selectedCompromissoIds.includes(compromisso.id) ? "bg-amber-500/5" : ""}
                          >
                            {selectionMode && (
                              <td>
                                <button
                                  onClick={() => toggleCompromissoSelection(compromisso.id)}
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                >
                                  {selectedCompromissoIds.includes(compromisso.id) ? (
                                    <CheckSquare size={20} className="text-amber-500" />
                                  ) : (
                                    <Square size={20} />
                                  )}
                                </button>
                              </td>
                            )}
                            <td>{formatDate(compromisso.data_compromisso)}</td>
                            <td>
                              {compromisso.inicio.substring(0, 5)} - {compromisso.fim.substring(0, 5)}
                            </td>
                            <td className="font-medium">
                              <div className="flex items-center gap-2">
                                <Coffee size={16} className="text-amber-500" />
                                {compromisso.nome}
                              </div>
                            </td>
                            <td>
                              <select
                                value={compromisso.status}
                                onChange={(e) => handleCompromissoStatusChange(compromisso.id, e.target.value)}
                                className={`px-2 py-1 rounded text-xs font-medium text-white border-0 cursor-pointer ${statusInfo.class}`}
                              >
                                <option value="pendente">Pendente</option>
                                <option value="concluido">Concluído</option>
                              </select>
                            </td>
                            <td>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleViewCompromissoDetails(compromisso)}
                                  className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                  title="Ver detalhes"
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  onClick={() => handleEditCompromisso(compromisso)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCompromisso(compromisso.id)}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border/50">
                {paginatedCompromissos.map((compromisso) => {
                    const statusInfo = compromissoStatusColors[compromisso.status] || compromissoStatusColors.pendente;
                    return (
                      <div 
                        key={`comp-mobile-${compromisso.id}`} 
                        className={`p-3 ${selectedCompromissoIds.includes(compromisso.id) ? "bg-amber-500/5" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          {selectionMode && (
                            <button
                              onClick={() => toggleCompromissoSelection(compromisso.id)}
                              className="p-1 mt-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                            >
                              {selectedCompromissoIds.includes(compromisso.id) ? (
                                <CheckSquare size={18} className="text-amber-500" />
                              ) : (
                                <Square size={18} />
                              )}
                            </button>
                          )}
                          
                          <div className="w-1 self-stretch rounded-full bg-amber-500 flex-shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                                  <Coffee size={14} className="text-amber-500" />
                                  {compromisso.nome}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(compromisso.data_compromisso)} • {compromisso.inicio.substring(0, 5)} - {compromisso.fim.substring(0, 5)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleViewCompromissoDetails(compromisso)}
                                  className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                  title="Ver detalhes"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => handleEditCompromisso(compromisso)}
                                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCompromisso(compromisso.id)}
                                  className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-end">
                              <select
                                value={compromisso.status}
                                onChange={(e) => handleCompromissoStatusChange(compromisso.id, e.target.value)}
                                className={`px-2 py-1 rounded text-xs font-medium text-white border-0 cursor-pointer ${statusInfo.class}`}
                              >
                                <option value="pendente">Pendente</option>
                                <option value="concluido">Concluído</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Pagination */}
              {totalCompromissos > 0 && (
                <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {startCompromissoIndex + 1}-{endCompromissoIndex} de {totalCompromissos}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCompromissosPage((prev) => Math.max(prev - 1, 1))}
                      disabled={compromissosPage === 1}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: totalCompromissosPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCompromissosPage(page)}
                        className={`min-w-[32px] h-8 rounded-full text-sm font-medium transition-colors ${
                          compromissosPage === page
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCompromissosPage((prev) => Math.min(prev + 1, totalCompromissosPages))}
                      disabled={compromissosPage === totalCompromissosPages}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border/50">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filteredAgendamentos.length === 0 && compromissos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum agendamento encontrado
            </div>
          ) : filteredAgendamentos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum agendamento encontrado
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {selectionMode && (
                        <th className="w-12">
                          <button
                            onClick={toggleSelectAll}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            {selectedIds.length === filteredAgendamentos.length ? (
                              <CheckSquare size={20} className="text-primary" />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        </th>
                      )}
                      <th>Data</th>
                      <th>Horário</th>
                      <th>Paciente</th>
                      <th>Convênio</th>
                      <th>Modalidade</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAgendamentos.map((agendamento) => (
                      <tr
                        key={agendamento.id}
                        className={selectedIds.includes(agendamento.id) ? "bg-primary/5" : ""}
                      >
                        {selectionMode && (
                          <td>
                            <button
                              onClick={() => toggleSelection(agendamento.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              {selectedIds.includes(agendamento.id) ? (
                                <CheckSquare size={20} className="text-primary" />
                              ) : (
                                <Square size={20} />
                              )}
                            </button>
                          </td>
                        )}
                        <td>{formatDate(agendamento.data_consulta)}</td>
                        <td>
                          {agendamento.inicio} - {agendamento.fim}
                        </td>
                        <td className="font-medium max-w-[280px]">
                          <span className="block break-words leading-snug">{agendamento.nome_paciente}</span>
                        </td>
                        <td>{agendamento.convenio}</td>
                        <td>
                          <span
                            className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                              agendamento.modalidade === "Online"
                                ? "bg-status-blue/10 text-status-blue"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {agendamento.modalidade}
                          </span>
                        </td>
                        <td>{formatarMoeda(agendamento.valor)}</td>
                        <td>
                          <select
                            value={agendamento.color}
                            onChange={(e) => handleStatusChange(agendamento.id, e.target.value)}
                            className={`px-2 py-1 rounded text-xs font-medium text-white border-0 cursor-pointer ${
                              statusColors[agendamento.color]?.class || "bg-status-green"
                            }`}
                          >
                            {Object.entries(statusColors).map(([key, { label }]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleViewDetails(agendamento)}
                              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(agendamento)}
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(agendamento.id)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border/50">
                {paginatedAgendamentos.map((agendamento) => {
                  const colors = statusColors[agendamento.color] || statusColors.green;
                  return (
                    <div
                      key={agendamento.id}
                      className={`p-3 ${selectedIds.includes(agendamento.id) ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        {selectionMode && (
                          <button
                            onClick={() => toggleSelection(agendamento.id)}
                            className="p-1 mt-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                          >
                            {selectedIds.includes(agendamento.id) ? (
                              <CheckSquare size={18} className="text-primary" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        )}
                        
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${colors.class}`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-foreground text-sm break-words">
                                {agendamento.nome_paciente}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(agendamento.data_consulta)} • {agendamento.inicio} - {agendamento.fim}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleViewDetails(agendamento)}
                                className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                title="Ver detalhes"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleEdit(agendamento)}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(agendamento.id)}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">{agendamento.convenio}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                              agendamento.modalidade === "Online"
                                ? "bg-status-blue/10 text-status-blue"
                                : "bg-primary/10 text-primary"
                            }`}>
                              {agendamento.modalidade === "Online" ? <Video size={10} /> : <MapPin size={10} />}
                              {agendamento.modalidade}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">
                              {formatarMoeda(agendamento.valor)}
                            </span>
                            <select
                              value={agendamento.color}
                              onChange={(e) => handleStatusChange(agendamento.id, e.target.value)}
                              className={`px-2 py-1 rounded text-xs font-medium text-white border-0 cursor-pointer ${colors.class}`}
                            >
                              {Object.entries(statusColors).map(([key, { label }]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          {/* Pagination */}
          {filteredAgendamentos.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{endIndex} de {filteredAgendamentos.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>

      {/* Modal - Fullscreen on mobile - Fora do Layout para sobrepor tudo */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-w-3xl md:my-8 animate-scale-in md:max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 md:px-6 py-4 md:rounded-t-xl flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold">
                {editingId ? "Editar Agendamento" : "Adicionar Agendamento"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
              {/* Seção: Dados da Consulta */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 md:mb-4">Dados da Consulta</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-xs">DATA DA CONSULTA <span className="text-destructive">*</span></label>
                    <input
                      type="date"
                      required
                      value={formData.data_consulta}
                      onChange={(e) => setFormData({ ...formData, data_consulta: e.target.value })}
                      className="form-input text-sm h-10"
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs">INÍCIO <span className="text-destructive">*</span></label>
                    <input
                      type="time"
                      required
                      value={formData.inicio}
                      onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
                      className="form-input text-sm h-10"
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs">FIM <span className="text-destructive">*</span></label>
                    <input
                      type="time"
                      required
                      value={formData.fim}
                      onChange={(e) => setFormData({ ...formData, fim: e.target.value })}
                      className="form-input text-sm h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Paciente */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 md:mb-4">Paciente</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-xs">NOME DO PACIENTE <span className="text-destructive">*</span></label>
                    <select
                      required
                      value={formData.nome_paciente}
                      onChange={(e) => {
                        setFormData({ ...formData, nome_paciente: e.target.value });
                        handlePacienteSelect(e.target.value);
                      }}
                      className="form-input text-sm h-10"
                    >
                      <option value="">Procurar paciente...</option>
                      {pacientes.map((p) => (
                        <option key={p.id} value={p.nome_completo}>
                          {p.nome_completo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">TELEFONE</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: formatarTelefone(e.target.value) })}
                      className="form-input text-sm h-10"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Convênio e Tipo de Consulta */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 md:mb-4">Convênio e Tipo de Consulta</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
                  <div>
                    <label className="form-label text-xs">CONVÊNIO <span className="text-destructive">*</span></label>
                    <select
                      required
                      value={formData.convenio}
                      onChange={(e) => handleConvenioChange(e.target.value)}
                      className="form-input text-sm h-10"
                    >
                      <option value="">Selecionar convênio...</option>
                      {convenios.map((c) => (
                        <option key={c.id} value={c.nome_convenio}>
                          {c.nome_convenio}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">TIPO DE CONSULTA <span className="text-destructive">*</span></label>
                    <select
                      required
                      value={formData.consulta}
                      onChange={(e) => setFormData({ ...formData, consulta: e.target.value })}
                      className="form-input text-sm h-10"
                    >
                      <option value="">Selecionar tipo...</option>
                      <option value="Avaliação">Avaliação</option>
                      <option value="Retorno">Retorno</option>
                      <option value="Sessão">Sessão</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">MODALIDADE <span className="text-destructive">*</span></label>
                    <select
                      value={formData.modalidade}
                      onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
                      className="form-input text-sm h-10"
                    >
                      <option value="">Selecionar...</option>
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-xs">FREQUÊNCIA <span className="text-destructive">*</span></label>
                    <select
                      value={formData.frequencia}
                      onChange={(e) => setFormData({ ...formData, frequencia: e.target.value })}
                      className="form-input text-sm h-10"
                    >
                      <option value="">Selecionar...</option>
                      <option value="Única">Única</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Quinzenal">Quinzenal</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">VALOR</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: formatarValorInput(e.target.value) })}
                      className="form-input text-sm h-10"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Observações */}
              <div>
                <h4 className="text-sm md:text-base font-semibold text-foreground mb-3 md:mb-4">Observações</h4>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="form-input min-h-[80px] md:min-h-[100px] text-sm"
                  placeholder="Digite observações sobre o agendamento..."
                />
              </div>

              {/* Footer com botões */}
              <div className="flex justify-end gap-2 md:gap-3 pt-3 md:pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary px-4 md:px-6 text-sm h-10"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary px-4 md:px-6 text-sm h-10">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Agendamento */}
      {showDetailsModal && viewingAgendamento && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-w-4xl md:my-8 animate-scale-in md:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 md:px-6 py-4 md:rounded-t-xl flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold uppercase tracking-wide">Detalhes do Agendamento</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
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
                      {viewingAgendamento.nome_paciente}
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
                      {viewingAgendamento.inicio}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Horário de Fim
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.fim}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Convênio
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.convenio}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Tipo de Consulta
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.consulta}
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
                      {viewingAgendamento.modalidade}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Frequência
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingAgendamento.frequencia}
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
                      onChange={(e) => {
                        handleStatusChange(viewingAgendamento.id, e.target.value);
                        setViewingAgendamento({ ...viewingAgendamento, color: e.target.value });
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white border-0 cursor-pointer ${
                        statusColors[viewingAgendamento.color]?.class || "bg-status-green"
                      }`}
                    >
                      {Object.entries(statusColors).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
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
                  {viewingAgendamento.observacoes || "Sem observações"}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 md:gap-3 p-4 border-t border-border flex-shrink-0">
              <button
                onClick={() => setShowDetailsModal(false)}
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
        </div>
      )}

      {/* Modal de Compromisso Pessoal */}
      {showCompromissoModal && (
        <div className="fixed inset-0 bg-foreground/20 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-w-lg md:my-8 animate-scale-in md:max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 md:px-6 py-4 md:rounded-t-xl flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Coffee size={20} />
                {editingCompromissoId ? "Editar Compromisso" : "Novo Compromisso Pessoal"}
              </h3>
              <button
                onClick={() => setShowCompromissoModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCompromissoSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
              <div>
                <label className="form-label text-xs">NOME DO COMPROMISSO <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  required
                  value={compromissoFormData.nome}
                  onChange={(e) => setCompromissoFormData({ ...compromissoFormData, nome: e.target.value })}
                  className="form-input text-sm h-10"
                  placeholder="Ex: Almoço, Reunião, etc."
                />
              </div>

              <div>
                <label className="form-label text-xs">DATA <span className="text-destructive">*</span></label>
                <input
                  type="date"
                  required
                  value={compromissoFormData.data_compromisso}
                  onChange={(e) => setCompromissoFormData({ ...compromissoFormData, data_compromisso: e.target.value })}
                  className="form-input text-sm h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-xs">INÍCIO <span className="text-destructive">*</span></label>
                  <input
                    type="time"
                    required
                    value={compromissoFormData.inicio}
                    onChange={(e) => setCompromissoFormData({ ...compromissoFormData, inicio: e.target.value })}
                    className="form-input text-sm h-10"
                  />
                </div>
                <div>
                  <label className="form-label text-xs">FIM <span className="text-destructive">*</span></label>
                  <input
                    type="time"
                    required
                    value={compromissoFormData.fim}
                    onChange={(e) => setCompromissoFormData({ ...compromissoFormData, fim: e.target.value })}
                    className="form-input text-sm h-10"
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-xs">OBSERVAÇÕES</label>
                <textarea
                  value={compromissoFormData.observacoes}
                  onChange={(e) => setCompromissoFormData({ ...compromissoFormData, observacoes: e.target.value })}
                  className="form-input min-h-[80px] text-sm"
                  placeholder="Observações opcionais..."
                />
              </div>

              <div className="flex justify-end gap-2 md:gap-3 pt-3 md:pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCompromissoModal(false)}
                  className="btn-secondary px-4 md:px-6 text-sm h-10"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 md:px-6 text-sm h-10 bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition-colors">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ver Detalhes Compromisso Pessoal */}
      {showCompromissoDetailsModal && viewingCompromisso && (
        <div className="fixed inset-0 bg-foreground/20 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-w-lg md:my-8 animate-scale-in md:max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 md:px-6 py-4 md:rounded-t-xl flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Coffee size={20} />
                Detalhes do Compromisso
              </h3>
              <button
                onClick={() => setShowCompromissoDetailsModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
              {/* Nome do Compromisso */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-amber-600 border-b border-amber-500/30 pb-2">
                  Informações do Compromisso
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="form-label text-xs text-muted-foreground">NOME DO COMPROMISSO</label>
                    <p className="text-sm font-medium text-foreground">{viewingCompromisso.nome}</p>
                  </div>
                </div>
              </div>

              {/* Data e Horários */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-amber-600 border-b border-amber-500/30 pb-2">
                  Data e Horários
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="form-label text-xs text-muted-foreground">DATA</label>
                    <p className="text-sm font-medium text-foreground">{formatDate(viewingCompromisso.data_compromisso)}</p>
                  </div>
                  <div>
                    <label className="form-label text-xs text-muted-foreground">INÍCIO</label>
                    <p className="text-sm font-medium text-foreground">{viewingCompromisso.inicio.substring(0, 5)}</p>
                  </div>
                  <div>
                    <label className="form-label text-xs text-muted-foreground">FIM</label>
                    <p className="text-sm font-medium text-foreground">{viewingCompromisso.fim.substring(0, 5)}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-amber-600 border-b border-amber-500/30 pb-2">
                  Status
                </h4>
                <div>
                  <select
                    value={viewingCompromisso.status}
                    onChange={(e) => {
                      handleCompromissoStatusChange(viewingCompromisso.id, e.target.value);
                      setViewingCompromisso({ ...viewingCompromisso, status: e.target.value });
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white border-0 cursor-pointer ${
                      compromissoStatusColors[viewingCompromisso.status]?.class || "bg-amber-500"
                    }`}
                  >
                    {Object.entries(compromissoStatusColors).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-amber-600 border-b border-amber-500/30 pb-2">
                  Observações
                </h4>
                <div className="bg-muted/50 border border-border rounded-lg px-3 py-3 text-sm text-foreground min-h-[100px]">
                  {viewingCompromisso.observacoes || "Sem observações"}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 md:gap-3 p-4 border-t border-border flex-shrink-0">
              <button
                onClick={() => setShowCompromissoDetailsModal(false)}
                className="px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={handleDeleteCompromissoFromDetails}
                className="px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors flex items-center gap-1.5 md:gap-2"
              >
                <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                Excluir
              </button>
              <button
                onClick={handleEditCompromissoFromDetails}
                className="px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1.5 md:gap-2"
              >
                <Pencil size={16} className="md:w-[18px] md:h-[18px]" />
                Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Agendamentos;
