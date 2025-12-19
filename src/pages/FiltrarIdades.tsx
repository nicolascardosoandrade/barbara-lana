import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { supabase, calcularIdade, formatarTelefone } from "@/lib/supabase";
import { Filter, Users, Download, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";

interface Paciente {
  id: number;
  nome_completo: string;
  telefone: string;
  email: string;
  data_nascimento: string;
  convenio: string;
  situacao: string;
}

// Função para calcular idade detalhada (anos, meses, dias) - igual ao popup de Detalhes do Paciente
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

const FiltrarIdades = () => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [idadeMin, setIdadeMin] = useState("");
  const [idadeMax, setIdadeMax] = useState("");
  const [convenioFilter, setConvenioFilter] = useState("");
  const [convenios, setConvenios] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<Paciente[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPacientes();
    fetchConvenios();
  }, []);

  const fetchPacientes = async () => {
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nome_completo, telefone, email, data_nascimento, convenio, situacao")
        .eq("situacao", "Ativo")
        .order("nome_completo");

      if (error) throw error;
      setPacientes(data || []);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
    }
  };

  const fetchConvenios = async () => {
    try {
      const { data, error } = await supabase
        .from("convenios")
        .select("nome_convenio")
        .eq("ativo", true)
        .order("nome_convenio");

      if (error) throw error;
      setConvenios(data?.map((c) => c.nome_convenio) || []);
    } catch (error) {
      console.error("Erro ao buscar convênios:", error);
    }
  };

  const handleFilter = () => {
    setLoading(true);
    
    const result = pacientes.filter((paciente) => {
      const idade = calcularIdade(paciente.data_nascimento);
      
      const matchesIdadeMin = !idadeMin || idade >= parseInt(idadeMin);
      const matchesIdadeMax = !idadeMax || idade <= parseInt(idadeMax);
      const matchesConvenio = !convenioFilter || paciente.convenio === convenioFilter;

      return matchesIdadeMin && matchesIdadeMax && matchesConvenio;
    });

    setFiltered(result);
    setCurrentPage(1);
    setLoading(false);
  };

  const handleClear = () => {
    setIdadeMin("");
    setIdadeMax("");
    setConvenioFilter("");
    setFiltered([]);
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    const data = filtered.map((p) => ({
      Nome: p.nome_completo,
      Idade: calcularIdadeDetalhada(p.data_nascimento),
      Telefone: p.telefone,
      Email: p.email,
      Convênio: p.convenio,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pacientes");
    XLSX.writeFile(workbook, `pacientes_filtrados_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Layout title="Filtrar por Idades">
      <div className="max-w-6xl mx-auto px-2 sm:px-0">
        {/* Header - Responsive */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Filter className="text-primary" size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-foreground">Filtrar Pacientes por Idade</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Encontre pacientes em uma faixa etária específica</p>
          </div>
        </div>

        {/* Filter Card - Responsive */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="form-label text-xs sm:text-sm">Idade Mínima</label>
              <input
                type="number"
                min="0"
                max="150"
                value={idadeMin}
                onChange={(e) => setIdadeMin(e.target.value)}
                className="form-input text-sm"
                placeholder="Ex: 18"
              />
            </div>

            <div>
              <label className="form-label text-xs sm:text-sm">Idade Máxima</label>
              <input
                type="number"
                min="0"
                max="150"
                value={idadeMax}
                onChange={(e) => setIdadeMax(e.target.value)}
                className="form-input text-sm"
                placeholder="Ex: 65"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="form-label text-xs sm:text-sm">Convênio</label>
              <select
                value={convenioFilter}
                onChange={(e) => setConvenioFilter(e.target.value)}
                className="form-input text-sm"
              >
                <option value="">Todos</option>
                {convenios.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-end gap-2">
              <button onClick={handleFilter} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                <Filter size={16} />
                Filtrar
              </button>
              <button onClick={handleClear} className="btn-secondary text-sm py-2.5 px-3">
                Limpar
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {filtered.length > 0 && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-border/50 gap-2">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <span className="font-semibold text-sm sm:text-base">
                  {filtered.length} paciente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={exportToExcel}
                className="btn-outline flex items-center gap-2 text-xs sm:text-sm py-1.5 px-3"
              >
                <Download size={14} />
                Exportar Excel
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-[200px] min-w-[200px]">Nome</th>
                    <th className="w-[220px] min-w-[220px]">Idade</th>
                    <th>Telefone</th>
                    <th>E-mail</th>
                    <th>Convênio</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((paciente) => (
                    <tr key={paciente.id}>
                      <td className="font-medium max-w-[200px] break-words whitespace-normal">{paciente.nome_completo || "Não informado"}</td>
                      <td>
                        <span className="inline-flex px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium whitespace-nowrap">
                          {paciente.data_nascimento ? calcularIdadeDetalhada(paciente.data_nascimento) : "Não informado"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">{paciente.telefone || "Não informado"}</td>
                      <td className="max-w-[180px] break-words">{paciente.email || "Não informado"}</td>
                      <td>{paciente.convenio || "Não informado"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              {/* Mobile Header */}
              <div className="bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                Pacientes Filtrados
              </div>

              {/* Mobile Card List */}
              <div className="divide-y divide-border/50">
                {paginatedData.map((paciente) => (
                  <div key={paciente.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground text-sm leading-tight break-words flex-1 min-w-0">
                        {paciente.nome_completo || "Não informado"}
                      </h3>
                      <span className="inline-flex px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium flex-shrink-0">
                        {paciente.data_nascimento ? calcularIdadeDetalhada(paciente.data_nascimento) : "Não informado"}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground/70 w-16">Tel:</span>
                        <span>{paciente.telefone || "Não informado"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground/70 w-16">Email:</span>
                        <span className="truncate">{paciente.email || "Não informado"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground/70 w-16">Convênio:</span>
                        <span className="text-primary font-medium">{paciente.convenio || "Não informado"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 sm:p-4 border-t border-border/50 bg-muted/30">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                          onClick={() => setCurrentPage(pageNum)}
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 && (idadeMin || idadeMax || convenioFilter) && !loading && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 sm:p-12 text-center">
            <Users size={40} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Nenhum paciente encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Tente ajustar os filtros para encontrar pacientes
            </p>
          </div>
        )}

        {filtered.length === 0 && !idadeMin && !idadeMax && !convenioFilter && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 sm:p-12 text-center">
            <Filter size={40} className="mx-auto text-primary/50 mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Configure os filtros</h3>
            <p className="text-sm text-muted-foreground">
              Defina a faixa de idade e/ou convênio para filtrar os pacientes
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FiltrarIdades;
