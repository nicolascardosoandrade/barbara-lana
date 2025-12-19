import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/lib/supabase";
import { formatarMoeda } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, X, Check, Filter, Square, CheckSquare, Eye, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { utils, writeFile } from "xlsx";

interface Convenio {
  id: number;
  nome_convenio: string;
  consulta: string;
  duracao: string;
  valor: number;
  pagamento: number;
  ativo: boolean;
}

// Função para formatar valor como moeda brasileira enquanto digita
const formatarValorInput = (valor: string): string => {
  // Remove tudo que não é número
  const apenasNumeros = valor.replace(/\D/g, "");
  
  if (!apenasNumeros) return "";
  
  // Converte para centavos e depois para reais
  const valorNumerico = parseInt(apenasNumeros) / 100;
  
  // Formata como moeda brasileira
  return valorNumerico.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

// Função para converter valor formatado em número
const parsarValorMoeda = (valorFormatado: string): number => {
  // Remove "R$", espaços e pontos de milhar, substitui vírgula por ponto
  const valorLimpo = valorFormatado
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  
  return parseFloat(valorLimpo) || 0;
};

const Convenios = () => {
  const { user } = useAuth();
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [filteredConvenios, setFilteredConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingConvenio, setViewingConvenio] = useState<Convenio | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nome_convenio: "",
    consulta: "",
    duracao: "",
    valor: "",
    pagamento: "",
    ativo: true,
  });

  // Filter states
  const [showFilter, setShowFilter] = useState(false);
  const [filterNome, setFilterNome] = useState("");
  const [filterConsulta, setFilterConsulta] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "ativo" | "inativo">("todos");

  // Selection states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchConvenios();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [convenios, filterNome, filterConsulta, filterStatus]);

  const applyFilters = () => {
    let filtered = [...convenios];

    if (filterNome) {
      filtered = filtered.filter((c) =>
        c.nome_convenio.toLowerCase().includes(filterNome.toLowerCase())
      );
    }

    if (filterConsulta) {
      filtered = filtered.filter((c) =>
        c.consulta.toLowerCase().includes(filterConsulta.toLowerCase())
      );
    }

    if (filterStatus !== "todos") {
      filtered = filtered.filter((c) =>
        filterStatus === "ativo" ? c.ativo : !c.ativo
      );
    }

    setFilteredConvenios(filtered);
    setCurrentPage(1); // Reset page when filters change
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredConvenios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredConvenios.length);
  const paginatedConvenios = filteredConvenios.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  const clearFilters = () => {
    setFilterNome("");
    setFilterConsulta("");
    setFilterStatus("todos");
  };

  const fetchConvenios = async () => {
    try {
      const { data, error } = await supabase
        .from("convenios")
        .select("*")
        .order("nome_convenio", { ascending: true });

      if (error) throw error;
      setConvenios(data || []);
    } catch (error) {
      console.error("Erro ao buscar convênios:", error);
      toast.error("Erro ao carregar convênios");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const convenioData = {
        nome_convenio: formData.nome_convenio,
        consulta: formData.consulta,
        duracao: formData.duracao,
        valor: parsarValorMoeda(formData.valor),
        pagamento: parseInt(formData.pagamento),
        ativo: formData.ativo,
      };

      if (editingId) {
        const { error } = await supabase
          .from("convenios")
          .update(convenioData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Convênio atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("convenios").insert({
          ...convenioData,
          user_id: user?.id,
        });

        if (error) throw error;
        toast.success("Convênio cadastrado com sucesso!");
      }

      setShowModal(false);
      resetForm();
      fetchConvenios();
    } catch (error: any) {
      console.error("Erro ao salvar convênio:", error);
      
      // Tratar erro de nome duplicado
      if (error.code === "23505" || error.message?.includes("convenios_nome_convenio_key")) {
        toast.error("Já existe um convênio com este nome. Por favor, escolha outro nome.");
      } else {
        toast.error("Erro ao salvar convênio. Tente novamente.");
      }
    }
  };

  const handleViewDetails = (convenio: Convenio) => {
    setViewingConvenio(convenio);
    setShowDetailsModal(true);
  };

  const handleEditFromDetails = () => {
    if (viewingConvenio) {
      handleEdit(viewingConvenio);
      setShowDetailsModal(false);
    }
  };

  const handleDeleteFromDetails = async () => {
    if (!viewingConvenio) return;
    
    if (!confirm("Deseja realmente excluir este convênio?")) return;

    try {
      const { error } = await supabase.from("convenios").delete().eq("id", viewingConvenio.id);

      if (error) throw error;
      toast.success("Convênio excluído com sucesso!");
      setShowDetailsModal(false);
      setViewingConvenio(null);
      fetchConvenios();
    } catch (error) {
      console.error("Erro ao excluir convênio:", error);
      toast.error("Erro ao excluir convênio");
    }
  };

  const handleEdit = (convenio: Convenio) => {
    setEditingId(convenio.id);
    setFormData({
      nome_convenio: convenio.nome_convenio,
      consulta: convenio.consulta,
      duracao: convenio.duracao,
      valor: formatarMoeda(convenio.valor),
      pagamento: convenio.pagamento.toString(),
      ativo: convenio.ativo,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir este convênio?")) return;

    try {
      const { error } = await supabase.from("convenios").delete().eq("id", id);

      if (error) throw error;
      toast.success("Convênio excluído com sucesso!");
      fetchConvenios();
    } catch (error) {
      console.error("Erro ao excluir convênio:", error);
      toast.error("Erro ao excluir convênio");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos um convênio");
      return;
    }

    if (!confirm(`Deseja realmente excluir ${selectedIds.length} convênio(s)?`)) return;

    try {
      const { error } = await supabase
        .from("convenios")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} convênio(s) excluído(s) com sucesso!`);
      setSelectedIds([]);
      setSelectionMode(false);
      fetchConvenios();
    } catch (error) {
      console.error("Erro ao excluir convênios:", error);
      toast.error("Erro ao excluir convênios");
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredConvenios.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredConvenios.map((c) => c.id));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nome_convenio: "",
      consulta: "",
      duracao: "",
      valor: "",
      pagamento: "",
      ativo: true,
    });
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds([]);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredConvenios.map((c) => ({
      "Nome do Convênio": c.nome_convenio,
      "Tipo de Consulta": c.consulta,
      "Duração": c.duracao,
      "Valor": c.valor,
      "Pagamento (Dias)": c.pagamento,
      "Status": c.ativo ? "Ativo" : "Inativo",
    }));

    const ws = utils.json_to_sheet(dataToExport);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Convenios");
    writeFile(wb, "convenios.xlsx");
    toast.success("Planilha exportada com sucesso!");
  };

  return (
    <>
    <Layout title="Convênios" hideHeader={showModal}>
      <div className="max-w-6xl mx-auto px-2 sm:px-0">
        {/* Header - Responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Gerenciar Convênios
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {selectionMode && selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="btn-primary flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-sm sm:text-base"
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
              className="btn-primary flex items-center gap-2 text-sm sm:text-base"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
            <button
              onClick={exportToExcel}
              className="p-2 sm:p-3 rounded-lg border bg-card text-foreground border-border hover:bg-muted transition-colors"
              title="Exportar Excel"
            >
              <FileSpreadsheet size={18} />
            </button>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`p-2 sm:p-3 rounded-lg border transition-colors ${
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
              className={`p-2 sm:p-3 rounded-lg border transition-colors ${
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

        {/* Filter Box - Responsivo */}
        {showFilter && (
          <div className="bg-card rounded-xl shadow-card p-4 mb-4 border border-border/50 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Filtros</h3>
              <button
                onClick={clearFilters}
                className="text-xs sm:text-sm text-primary hover:underline"
              >
                Limpar filtros
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="form-label text-xs sm:text-sm">Nome do Convênio</label>
                <input
                  type="text"
                  value={filterNome}
                  onChange={(e) => setFilterNome(e.target.value)}
                  className="form-input text-sm"
                  placeholder="Buscar por nome..."
                />
              </div>
              <div>
                <label className="form-label text-xs sm:text-sm">Tipo de Consulta</label>
                <input
                  type="text"
                  value={filterConsulta}
                  onChange={(e) => setFilterConsulta(e.target.value)}
                  className="form-input text-sm"
                  placeholder="Buscar por consulta..."
                />
              </div>
              <div className="sm:col-span-2 md:col-span-1">
                <label className="form-label text-xs sm:text-sm">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "todos" | "ativo" | "inativo")}
                  className="form-input text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Contador de Convênios */}
        <div className="bg-card rounded-xl shadow-card p-4 mb-4 border border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total de convênios cadastrados</span>
            <span className="text-2xl font-bold text-primary">{convenios.length}</span>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-card rounded-xl shadow-card overflow-hidden border border-border/50">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : filteredConvenios.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum convênio encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {selectionMode && (
                      <th className="w-12">
                        <button
                          onClick={toggleSelectAll}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          {selectedIds.length === filteredConvenios.length ? (
                            <CheckSquare size={20} className="text-primary" />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                      </th>
                    )}
                    <th>Nome do Convênio</th>
                    <th>Tipo de Consulta</th>
                    <th>Duração</th>
                    <th>Valor</th>
                    <th>Pagamento (Dias)</th>
                    <th>Status</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedConvenios.map((convenio) => (
                    <tr
                      key={convenio.id}
                      className={selectedIds.includes(convenio.id) ? "bg-primary/5" : ""}
                    >
                      {selectionMode && (
                        <td>
                          <button
                            onClick={() => toggleSelection(convenio.id)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            {selectedIds.includes(convenio.id) ? (
                              <CheckSquare size={20} className="text-primary" />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="font-medium">{convenio.nome_convenio}</td>
                      <td>{convenio.consulta}</td>
                      <td>{convenio.duracao}</td>
                      <td>{formatarMoeda(convenio.valor)}</td>
                      <td>{convenio.pagamento} dias</td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            convenio.ativo
                              ? "bg-status-green/10 text-status-green"
                              : "bg-status-red/10 text-status-red"
                          }`}
                        >
                          {convenio.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewDetails(convenio)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(convenio)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(convenio.id)}
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
          )}
          
          {/* Pagination Desktop */}
          {filteredConvenios.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{endIndex} de {filteredConvenios.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && goToPage(page)}
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

        {/* Mobile List - Formato Tabela */}
        <div className="md:hidden">
          <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border/50">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Relatório de Convênios
              </span>
            </div>

            {/* Column Header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-sm">NOME DO CONVÊNIO</span>
              {selectionMode && (
                <button
                  onClick={toggleSelectAll}
                  className="p-1"
                >
                  {selectedIds.length === filteredConvenios.length ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : filteredConvenios.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum convênio encontrado
              </div>
            ) : (
              <div className="divide-y divide-border">
                {paginatedConvenios.map((convenio) => (
                  <div
                    key={convenio.id}
                    onClick={() => !selectionMode && handleViewDetails(convenio)}
                    className={`px-4 py-3 flex items-center justify-between transition-colors cursor-pointer hover:bg-muted/50 active:bg-muted ${
                      selectedIds.includes(convenio.id) ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {selectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(convenio.id);
                          }}
                          className="p-1 shrink-0"
                        >
                          {selectedIds.includes(convenio.id) ? (
                            <CheckSquare size={18} className="text-primary" />
                          ) : (
                            <Square size={18} className="text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <span className="font-medium text-foreground break-words">
                        {convenio.nome_convenio}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          convenio.ativo ? "bg-status-green" : "bg-status-red"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Mobile */}
            {filteredConvenios.length > 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-medium px-2">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {startIndex + 1}-{endIndex} de {filteredConvenios.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal - Fullscreen on mobile */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 z-[60] flex items-center justify-center p-0 md:p-4">
          <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-w-lg animate-scale-in flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar md:bg-card md:rounded-t-xl shrink-0">
              <h3 className="text-lg font-semibold text-sidebar-foreground md:text-foreground">
                {editingId ? "Editar Convênio" : "Novo Convênio"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-sidebar-foreground md:text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-4 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="form-label">Convênio <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.nome_convenio}
                  onChange={(e) =>
                    setFormData({ ...formData, nome_convenio: e.target.value.toUpperCase() })
                  }
                  className="form-input uppercase"
                  placeholder="Nome do convênio"
                />
              </div>

              <div>
                <label className="form-label">Consulta <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.consulta}
                  onChange={(e) =>
                    setFormData({ ...formData, consulta: e.target.value })
                  }
                  className="form-input"
                  placeholder="Tipo de consulta"
                />
              </div>

              <div>
                <label className="form-label">Duração <span className="text-destructive">*</span></label>
                <input
                  type="time"
                  required
                  value={formData.duracao ? formData.duracao.substring(0, 5) : ""}
                  onChange={(e) =>
                    setFormData({ ...formData, duracao: e.target.value ? e.target.value + ":00" : "" })
                  }
                  className="form-input"
                  placeholder="hh:mm"
                />
              </div>

              <div>
                <label className="form-label">Valor <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: formatarValorInput(e.target.value) })
                  }
                  className="form-input"
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <label className="form-label">Pagamento (Dias) <span className="text-destructive">*</span></label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.pagamento}
                  onChange={(e) =>
                    setFormData({ ...formData, pagamento: e.target.value })
                  }
                  className="form-input"
                  placeholder="Dias para pagamento"
                />
              </div>

              <div>
                <label className="form-label">Status <span className="text-destructive">*</span></label>
                <select
                  value={formData.ativo ? "ativo" : "inativo"}
                  onChange={(e) =>
                    setFormData({ ...formData, ativo: e.target.value === "ativo" })
                  }
                  className="form-input"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingId ? "Atualizar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>

      {/* Modal de Detalhes do Convênio - Fora do Layout para sobrepor sidebar/topbar */}
      {showDetailsModal && viewingConvenio && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-w-3xl md:my-8 animate-scale-in md:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 md:px-6 py-4 md:rounded-t-xl flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold uppercase tracking-wide">Detalhes do Convênio</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-primary-foreground/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1">
              {/* Dados do Convênio */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-primary border-b border-primary/30 pb-2">
                  Dados do Convênio
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Nome do Convênio
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingConvenio.nome_convenio}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Tipo de Consulta
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingConvenio.consulta}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Duração
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingConvenio.duracao}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Valor
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {formatarMoeda(viewingConvenio.valor)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Prazo de Pagamento
                    </label>
                    <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                      {viewingConvenio.pagamento} {viewingConvenio.pagamento === 1 ? "dia" : "dias"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Status
                    </label>
                    <div className={`border rounded-lg px-3 py-2.5 text-sm font-medium ${
                      viewingConvenio.ativo
                        ? "bg-status-green/10 border-status-green/30 text-status-green"
                        : "bg-status-red/10 border-status-red/30 text-status-red"
                    }`}>
                      {viewingConvenio.ativo ? "Ativo" : "Inativo"}
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
    </>
  );
};

export default Convenios;
