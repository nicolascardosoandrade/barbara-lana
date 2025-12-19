import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { supabase, formatarTelefone, formatarCPF, calcularIdade } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, X, Eye, Filter, Square, CheckSquare, ChevronLeft, ChevronRight, Search, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { utils, writeFile } from "xlsx";

interface Paciente {
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
  nome_contato_emergencia: string | null;
  telefone_contato_emergencia: string | null;
}

interface Convenio {
  id: number;
  nome_convenio: string;
}

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO"
];

// Função para calcular idade detalhada (anos, meses, dias)
const calcularIdadeDetalhada = (dataNascimento: string): string => {
  const nascimento = new Date(dataNascimento + "T00:00:00");
  const hoje = new Date();
  
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  let dias = hoje.getDate() - nascimento.getDate();
  
  if (dias < 0) {
    meses--;
    const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
  }
  
  if (meses < 0) {
    anos--;
    meses += 12;
  }
  
  // Sempre mostra anos, meses e dias
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}, ${meses} ${meses === 1 ? 'mês' : 'meses'}, ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
};

const Pacientes = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingPaciente, setViewingPaciente] = useState<Paciente | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [formData, setFormData] = useState({
    nome_completo: "",
    genero: "",
    responsavel: "",
    telefone: "",
    email: "",
    data_nascimento: "",
    cpf: "",
    convenio: "",
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    situacao: "Ativo",
    nome_contato_emergencia: "",
    telefone_contato_emergencia: "",
  });

  // Filter states
  const [showFilter, setShowFilter] = useState(false);
  const [filterConvenio, setFilterConvenio] = useState("");
  const [filterSituacao, setFilterSituacao] = useState<"todos" | "Ativo" | "Inativo">("todos");
  const [filterGenero, setFilterGenero] = useState("");

  // Selection states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPacientes();
    fetchConvenios();
  }, []);

  useEffect(() => {
    const search = searchParams.get("search");
    if (search) setSearchTerm(search);
  }, [searchParams]);

  const fetchPacientes = async () => {
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .order("nome_completo", { ascending: true });

      if (error) throw error;
      setPacientes(data || []);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      toast.error("Erro ao carregar pacientes");
    } finally {
      setLoading(false);
    }
  };

  const fetchConvenios = async () => {
    try {
      const { data, error } = await supabase
        .from("convenios")
        .select("id, nome_convenio")
        .eq("ativo", true)
        .order("nome_convenio");

      if (error) throw error;
      setConvenios(data || []);
    } catch (error) {
      console.error("Erro ao buscar convênios:", error);
    }
  };

  const fetchCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          estado: data.uf || "",
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const cpfLimpo = formData.cpf.replace(/\D/g, "");
      const cepLimpo = formData.cep.replace(/\D/g, "");
      const telefoneFormatado = formatarTelefone(formData.telefone);

      if (cpfLimpo && cpfLimpo.length !== 11) {
        toast.error("CPF deve conter 11 dígitos");
        return;
      }

      if (cepLimpo && cepLimpo.length !== 8) {
        toast.error("CEP deve conter 8 dígitos");
        return;
      }

      const pacienteData = {
        nome_completo: formData.nome_completo,
        genero: formData.genero || "",
        responsavel: formData.responsavel || null,
        telefone: telefoneFormatado || formData.telefone || "",
        email: formData.email || "",
        data_nascimento: formData.data_nascimento || "",
        cpf: cpfLimpo || "",
        convenio: formData.convenio,
        cep: cepLimpo || "",
        logradouro: formData.logradouro || "",
        numero: formData.numero || "",
        bairro: formData.bairro || "",
        cidade: formData.cidade || "",
        estado: formData.estado || "",
        situacao: formData.situacao,
        nome_contato_emergencia: formData.nome_contato_emergencia || null,
        telefone_contato_emergencia: formData.telefone_contato_emergencia || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("pacientes")
          .update(pacienteData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Paciente atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("pacientes").insert({
          ...pacienteData,
          user_id: user?.id,
        });

        if (error) throw error;
        toast.success("Paciente cadastrado com sucesso!");
      }

      setShowModal(false);
      resetForm();
      fetchPacientes();
    } catch (error: any) {
      console.error("Erro ao salvar paciente:", error);
      if (error.code === "23505") {
        toast.error("CPF já cadastrado para outro paciente");
      } else {
        toast.error(error.message || "Erro ao salvar paciente");
      }
    }
  };

  const handleViewDetails = (paciente: Paciente) => {
    setViewingPaciente(paciente);
    setShowDetailsModal(true);
  };

  const handleEditFromDetails = () => {
    if (viewingPaciente) {
      handleEdit(viewingPaciente);
      setShowDetailsModal(false);
    }
  };

  const handleDeleteFromDetails = async () => {
    if (!viewingPaciente) return;
    
    if (!confirm("Deseja realmente excluir este paciente?")) return;

    try {
      const { error } = await supabase.from("pacientes").delete().eq("id", viewingPaciente.id);

      if (error) throw error;
      toast.success("Paciente excluído com sucesso!");
      setShowDetailsModal(false);
      setViewingPaciente(null);
      fetchPacientes();
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      toast.error("Erro ao excluir paciente");
    }
  };

  const handleEdit = (paciente: Paciente) => {
    setEditingId(paciente.id);
    setFormData({
      nome_completo: paciente.nome_completo,
      genero: paciente.genero,
      responsavel: paciente.responsavel || "",
      telefone: paciente.telefone,
      email: paciente.email,
      data_nascimento: paciente.data_nascimento,
      cpf: paciente.cpf,
      convenio: paciente.convenio,
      cep: paciente.cep,
      logradouro: paciente.logradouro,
      numero: paciente.numero,
      bairro: paciente.bairro,
      cidade: paciente.cidade,
      estado: paciente.estado,
      situacao: paciente.situacao,
      nome_contato_emergencia: paciente.nome_contato_emergencia || "",
      telefone_contato_emergencia: paciente.telefone_contato_emergencia || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir este paciente?")) return;

    try {
      const { error } = await supabase.from("pacientes").delete().eq("id", id);

      if (error) throw error;
      toast.success("Paciente excluído com sucesso!");
      fetchPacientes();
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      toast.error("Erro ao excluir paciente");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos um paciente");
      return;
    }

    if (!confirm(`Deseja realmente excluir ${selectedIds.length} paciente(s)?`)) return;

    try {
      const { error } = await supabase
        .from("pacientes")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} paciente(s) excluído(s) com sucesso!`);
      setSelectedIds([]);
      setSelectionMode(false);
      fetchPacientes();
    } catch (error) {
      console.error("Erro ao excluir pacientes:", error);
      toast.error("Erro ao excluir pacientes");
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
    }
  };

  const clearFilters = () => {
    setFilterConvenio("");
    setFilterSituacao("todos");
    setFilterGenero("");
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nome_completo: "",
      genero: "",
      responsavel: "",
      telefone: "",
      email: "",
      data_nascimento: "",
      cpf: "",
      convenio: "",
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      situacao: "Ativo",
      nome_contato_emergencia: "",
      telefone_contato_emergencia: "",
    });
  };

  const filteredPacientes = pacientes.filter((p) => {
    const matchesSearch =
      p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cpf.includes(searchTerm) ||
      p.telefone.includes(searchTerm);
    const matchesConvenio = !filterConvenio || p.convenio === filterConvenio;
    const matchesSituacao = filterSituacao === "todos" || p.situacao === filterSituacao;
    const matchesGenero = !filterGenero || p.genero === filterGenero;

    return matchesSearch && matchesConvenio && matchesSituacao && matchesGenero;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredPacientes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredPacientes.length);
  const paginatedPacientes = filteredPacientes.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterConvenio, filterSituacao, filterGenero]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPacientes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPacientes.map((p) => p.id));
    }
  };

  const exportToExcel = () => {
    const formatarGenero = (genero: string) => {
      const generos: Record<string, string> = {
        M: "Masculino",
        F: "Feminino",
        O: "Outro",
      };
      return generos[genero] || genero;
    };

    const formatarDataNascimento = (data: string) => {
      if (!data) return "";
      const [ano, mes, dia] = data.split("-");
      return `${dia}/${mes}/${ano}`;
    };

    const dataToExport = filteredPacientes.map((p) => ({
      "Nome Completo": p.nome_completo,
      "Gênero": formatarGenero(p.genero),
      "Data de Nascimento": formatarDataNascimento(p.data_nascimento),
      "CPF": formatarCPF(p.cpf),
      "Telefone": p.telefone,
      "Email": p.email,
      "Convênio": p.convenio,
      "CEP": p.cep,
      "Logradouro": p.logradouro,
      "Número": p.numero,
      "Bairro": p.bairro,
      "Cidade": p.cidade,
      "Estado": p.estado,
      "Situação": p.situacao,
      "Responsável": p.responsavel || "",
      "Contato de Emergência": p.nome_contato_emergencia || "",
      "Telefone Emergência": p.telefone_contato_emergencia || "",
    }));

    const ws = utils.json_to_sheet(dataToExport);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Pacientes");
    writeFile(wb, "pacientes.xlsx");
    toast.success("Planilha exportada com sucesso!");
  };

  return (
    <>
    <Layout title="Pacientes">
      <div className="max-w-7xl mx-auto px-2 sm:px-0">
        {/* Header - Responsive */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground">
              Gerenciar Pacientes
            </h2>
            <div className="flex items-center gap-2">
              {selectionMode && selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="btn-primary flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90 text-sm py-2.5"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">Excluir</span> ({selectedIds.length})
                </button>
              )}
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 px-3"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
              <button
                onClick={exportToExcel}
                className="p-2.5 rounded-lg border bg-card text-foreground border-border hover:bg-muted transition-colors"
                title="Exportar Excel"
              >
                <FileSpreadsheet size={18} />
              </button>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`p-2.5 rounded-lg border transition-colors ${
                  showFilter
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
                title="Filtrar"
              >
                <Filter size={18} />
              </button>
              <button
                onClick={toggleSelectionMode}
                className={`p-2.5 rounded-lg border transition-colors ${
                  selectionMode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
                title="Selecionar"
              >
                <Square size={18} />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-9 text-sm h-10 w-full"
            />
          </div>
        </div>

        {/* Filter Box - Responsive */}
        {showFilter && (
          <div className="bg-card rounded-xl shadow-card p-3 sm:p-4 mb-4 border border-border/50 animate-fade-in">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Filtros</h3>
              <button
                onClick={clearFilters}
                className="text-xs sm:text-sm text-primary hover:underline"
              >
                Limpar filtros
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="form-label text-xs sm:text-sm">Convênio</label>
                <select
                  value={filterConvenio}
                  onChange={(e) => setFilterConvenio(e.target.value)}
                  className="form-input text-sm"
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
                <label className="form-label text-xs sm:text-sm">Situação</label>
                <select
                  value={filterSituacao}
                  onChange={(e) => setFilterSituacao(e.target.value as "todos" | "Ativo" | "Inativo")}
                  className="form-input text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div>
                <label className="form-label text-xs sm:text-sm">Gênero</label>
                <select
                  value={filterGenero}
                  onChange={(e) => setFilterGenero(e.target.value)}
                  className="form-input text-sm"
                >
                  <option value="">Todos</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                  <option value="O">Outro</option>
                  <option value="N">Prefiro não informar</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Contador de Pacientes */}
        <div className="bg-card rounded-xl shadow-card p-4 mb-4 border border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total de pacientes cadastrados</span>
            <span className="text-2xl font-bold text-primary">{pacientes.length}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border/50">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : filteredPacientes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum paciente encontrado
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
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
                            {selectedIds.length === filteredPacientes.length ? (
                              <CheckSquare size={20} className="text-primary" />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="min-w-[200px] max-w-[300px]">Nome</th>
                      <th>Telefone</th>
                      <th>Convênio</th>
                      <th>Idade</th>
                      <th>Situação</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPacientes.map((paciente) => (
                      <tr
                        key={paciente.id}
                        className={selectedIds.includes(paciente.id) ? "bg-primary/5" : ""}
                      >
                        {selectionMode && (
                          <td>
                            <button
                              onClick={() => toggleSelection(paciente.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              {selectedIds.includes(paciente.id) ? (
                                <CheckSquare size={20} className="text-primary" />
                              ) : (
                                <Square size={20} />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="font-medium min-w-[200px] max-w-[300px]">
                          <span className="block break-words whitespace-pre-wrap leading-snug">
                            {paciente.nome_completo}
                          </span>
                        </td>
                        <td>{paciente.telefone || "Não informado"}</td>
                        <td>{paciente.convenio}</td>
                        <td>{calcularIdadeDetalhada(paciente.data_nascimento)}</td>
                        <td>
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              paciente.situacao === "Ativo"
                                ? "bg-status-green/10 text-status-green"
                                : "bg-status-red/10 text-status-red"
                            }`}
                          >
                            {paciente.situacao}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleViewDetails(paciente)}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(paciente)}
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(paciente.id)}
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

              {/* Mobile Card View */}
              <div className="md:hidden">
                {/* Mobile Header */}
                <div className="bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold uppercase tracking-wide flex items-center justify-between">
                  <span>Pacientes</span>
                  {selectionMode && (
                    <button onClick={toggleSelectAll} className="p-1">
                      {selectedIds.length === filteredPacientes.length ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  )}
                </div>

                {/* Mobile Card List */}
                <div className="divide-y divide-border/50">
                  {paginatedPacientes.map((paciente) => (
                    <div
                      key={paciente.id}
                      className={`p-4 transition-colors ${
                        selectedIds.includes(paciente.id) ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {selectionMode && (
                            <button
                              onClick={() => toggleSelection(paciente.id)}
                              className="p-0.5 mt-0.5 flex-shrink-0"
                            >
                              {selectedIds.includes(paciente.id) ? (
                                <CheckSquare size={18} className="text-primary" />
                              ) : (
                                <Square size={18} />
                              )}
                            </button>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground text-sm leading-tight break-words">
                              {paciente.nome_completo}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {paciente.telefone || "Não informado"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                            paciente.situacao === "Ativo"
                              ? "bg-status-green/10 text-status-green"
                              : "bg-status-red/10 text-status-red"
                          }`}
                        >
                          {paciente.situacao}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground/70">Convênio:</span>
                            <span className="text-primary font-medium">{paciente.convenio}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground/70">Idade:</span>
                            <span>{calcularIdadeDetalhada(paciente.data_nascimento)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleViewDetails(paciente)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(paciente)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(paciente.id)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Pagination - Responsive */}
          {filteredPacientes.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t border-border bg-muted/30">
              <span className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                {startIndex + 1}-{endIndex} de {filteredPacientes.length}
              </span>
              <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <span className="sm:hidden text-sm font-medium px-2">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="fixed inset-0 bg-foreground/20 z-[60] flex items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-h-[70vh] md:max-w-2xl md:my-8 animate-scale-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border md:rounded-t-xl shrink-0">
              <h3 className="text-lg font-semibold text-primary">
                {editingId ? "Editar Paciente" : "Novo Paciente"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto">
              {/* Dados do Paciente */}
              <div className="space-y-3 md:space-y-4">
                <h4 className="text-sm font-medium text-primary">Dados do Paciente</h4>
                
                <div>
                  <label className="form-label text-sm">Nome Completo <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.nome_completo}
                    onChange={(e) =>
                      setFormData({ ...formData, nome_completo: e.target.value.toUpperCase() })
                    }
                    className="form-input text-sm uppercase"
                    placeholder="Nome do Paciente"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-sm">Gênero <span className="text-destructive">*</span></label>
                    <select
                      required
                      value={formData.genero}
                      onChange={(e) =>
                        setFormData({ ...formData, genero: e.target.value })
                      }
                      className="form-input text-sm"
                    >
                      <option value="">Selecione</option>
                      <option value="F">Feminino</option>
                      <option value="M">Masculino</option>
                      <option value="O">Outro</option>
                      <option value="N">Prefiro não informar</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-sm">Responsável</label>
                    <input
                      type="text"
                      value={formData.responsavel}
                      onChange={(e) =>
                        setFormData({ ...formData, responsavel: e.target.value })
                      }
                      className="form-input text-sm"
                      placeholder="Se aplicável"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-sm">Telefone</label>
                    <input
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = '';
                        if (value.length <= 2) {
                          formatted = value.length > 0 ? `(${value}` : '';
                        } else if (value.length <= 7) {
                          formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                        } else {
                          formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
                        }
                        setFormData({ ...formData, telefone: formatted });
                      }}
                      className="form-input text-sm"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>

                  <div>
                    <label className="form-label text-sm">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="form-input text-sm"
                      placeholder="email@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-sm">Data de Nascimento <span className="text-destructive">*</span></label>
                    <input
                      type="date"
                      required
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                      className="form-input text-sm h-10"
                      placeholder="dd/mm/aaaa"
                    />
                  </div>

                  <div>
                    <label className="form-label text-sm">CPF</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.cpf}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = '';
                        if (value.length <= 3) {
                          formatted = value;
                        } else if (value.length <= 6) {
                          formatted = `${value.slice(0, 3)}.${value.slice(3)}`;
                        } else if (value.length <= 9) {
                          formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
                        } else {
                          formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9, 11)}`;
                        }
                        setFormData({ ...formData, cpf: formatted });
                      }}
                      className="form-input text-sm"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                </div>
              </div>

              {/* Convênio */}
              <div className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-sm">Convênio <span className="text-destructive">*</span></label>
                    <select
                      required
                      value={formData.convenio}
                      onChange={(e) =>
                        setFormData({ ...formData, convenio: e.target.value })
                      }
                      className="form-input text-sm"
                    >
                      <option value="">Selecione</option>
                      {convenios.map((c) => (
                        <option key={c.id} value={c.nome_convenio}>
                          {c.nome_convenio}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-sm">Situação <span className="text-destructive">*</span></label>
                    <select
                      value={formData.situacao}
                      onChange={(e) =>
                        setFormData({ ...formData, situacao: e.target.value })
                      }
                      className="form-input text-sm"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contato de Emergência */}
              <div className="space-y-3 md:space-y-4">
                <h4 className="text-sm font-medium text-primary border-b border-border pb-2">Contato de Emergência</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-sm">Nome</label>
                    <input
                      type="text"
                      value={formData.nome_contato_emergencia}
                      onChange={(e) =>
                        setFormData({ ...formData, nome_contato_emergencia: e.target.value.toUpperCase() })
                      }
                      className="form-input text-sm uppercase"
                      placeholder="Nome do contato"
                    />
                  </div>

                  <div>
                    <label className="form-label text-sm">Telefone</label>
                    <input
                      type="tel"
                      value={formData.telefone_contato_emergencia}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = '';
                        if (value.length <= 2) {
                          formatted = value.length > 0 ? `(${value}` : '';
                        } else if (value.length <= 7) {
                          formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                        } else {
                          formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
                        }
                        setFormData({ ...formData, telefone_contato_emergencia: formatted });
                      }}
                      className="form-input text-sm"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>

              {/* Endereço do Paciente */}
              <div className="space-y-3 md:space-y-4">
                <h4 className="text-sm font-medium text-primary border-b border-border pb-2">Endereço do Paciente</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-sm">CEP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.cep}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = '';
                        if (value.length <= 5) {
                          formatted = value;
                        } else {
                          formatted = `${value.slice(0, 5)}-${value.slice(5, 8)}`;
                        }
                        setFormData({ ...formData, cep: formatted });
                        fetchCep(value);
                      }}
                      className="form-input text-sm"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>

                  <div>
                    <label className="form-label text-sm">Logradouro</label>
                    <input
                      type="text"
                      value={formData.logradouro}
                      onChange={(e) =>
                        setFormData({ ...formData, logradouro: e.target.value })
                      }
                      className="form-input text-sm"
                      placeholder="Rua, Avenida, Travessa..."
                    />
                  </div>

                  <div>
                    <label className="form-label text-sm">Número</label>
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={(e) =>
                        setFormData({ ...formData, numero: e.target.value })
                      }
                      className="form-input text-sm"
                      placeholder="123"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className="form-label text-sm">Bairro</label>
                    <input
                      type="text"
                      value={formData.bairro}
                      onChange={(e) =>
                        setFormData({ ...formData, bairro: e.target.value })
                      }
                      className="form-input text-sm"
                      placeholder="Nome do Bairro"
                    />
                  </div>

                  <div>
                    <label className="form-label text-sm">Cidade</label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) =>
                        setFormData({ ...formData, cidade: e.target.value })
                      }
                      className="form-input text-sm"
                      placeholder="Nome da Cidade"
                    />
                  </div>

                  <div>
                    <label className="form-label text-sm">Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) =>
                        setFormData({ ...formData, estado: e.target.value })
                      }
                      className="form-input text-sm"
                    >
                      <option value="">Selecione</option>
                      {estados.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4 md:mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary px-6 text-sm"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary px-6 text-sm">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Paciente */}
      {showDetailsModal && viewingPaciente && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-w-4xl md:my-8 animate-scale-in md:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border md:rounded-t-xl shrink-0">
              <h3 className="text-lg font-semibold text-primary">
                Detalhes do Paciente
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1">
              {/* Dados do Paciente */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-primary border-b border-primary/30 pb-2">
                  Dados do Paciente
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Nome Completo
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.nome_completo}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Gênero
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.genero === "M" ? "Masculino" : viewingPaciente.genero === "F" ? "Feminino" : viewingPaciente.genero === "O" ? "Outro" : "Prefere não informar"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Responsável
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.responsavel || "Não informado"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Telefone
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.telefone || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Email
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.email || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Data de Nascimento
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {new Date(viewingPaciente.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Idade
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {calcularIdadeDetalhada(viewingPaciente.data_nascimento)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      CPF
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.cpf ? formatarCPF(viewingPaciente.cpf) : "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Convênio
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.convenio}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Situação
                    </label>
                    <div className={`border rounded-lg px-3 py-2.5 text-sm font-medium ${
                      viewingPaciente.situacao === "Ativo"
                        ? "bg-status-green/10 border-status-green/30 text-status-green"
                        : "bg-status-red/10 border-status-red/30 text-status-red"
                    }`}>
                      {viewingPaciente.situacao}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contato de Emergência */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-primary border-b border-primary/30 pb-2">
                  Contato de Emergência
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Nome
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.nome_contato_emergencia || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Telefone
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.telefone_contato_emergencia || "Não informado"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-primary border-b border-primary/30 pb-2">
                  Endereço
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      CEP
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.cep ? (viewingPaciente.cep.length === 8 ? `${viewingPaciente.cep.slice(0, 5)}-${viewingPaciente.cep.slice(5)}` : viewingPaciente.cep) : "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Logradouro
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.logradouro || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Número
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.numero || "Não informado"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Bairro
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.bairro || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Cidade
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.cidade || "Não informado"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Estado
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingPaciente.estado || "Não informado"}
                    </div>
                  </div>
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
                className="px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors flex items-center gap-1 md:gap-2"
              >
                <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                Excluir
              </button>
              <button
                onClick={handleEditFromDetails}
                className="px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 md:gap-2"
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

export default Pacientes;
