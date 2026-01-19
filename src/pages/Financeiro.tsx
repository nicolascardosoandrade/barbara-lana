import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { supabase, formatarMoeda } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, TrendingUp, TrendingDown, Calendar, Settings, PieChart as PieChartIcon, BarChart3, LineChart } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart as RechartsLineChart,
  Line,
} from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, getWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
  id: number;
  data_consulta: string;
  nome_paciente: string;
  convenio: string;
  valor: number;
  color: string;
}

interface Resumo {
  agendado: number;
  atendido: number;
  naoDesmarcado: number;
  totalSemDesconto: number;
}

interface Porcentagens {
  clinica: number;
  imposto: number;
}

const Financeiro = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [resumo, setResumo] = useState<Resumo>({
    agendado: 0,
    atendido: 0,
    naoDesmarcado: 0,
    totalSemDesconto: 0,
  });
  const [porcentagens, setPorcentagens] = useState<Porcentagens>({
    clinica: 45,
    imposto: 6,
  });
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date.toISOString().split("T")[0];
  });
  const [showSettings, setShowSettings] = useState(false);
  const [tempPorcentagens, setTempPorcentagens] = useState(porcentagens);
  const [chartPeriod, setChartPeriod] = useState<"dia" | "semana" | "mes">("dia");

  const COLORS = ["#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#f59e0b", "#06b6d4"];

  useEffect(() => {
    fetchPorcentagens();
  }, []);

  useEffect(() => {
    fetchFinanceiro();
  }, [startDate, endDate]);

  const fetchPorcentagens = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes_financeiras")
        .select("nome_configuracao, valor_percentual")
        .in("nome_configuracao", ["percentual_clinica", "percentual_impostos"])
        .eq("ativo", true);

      if (error) throw error;

      let clinica = 45;
      let imposto = 6;

      data?.forEach((row) => {
        if (row.nome_configuracao === "percentual_clinica") {
          clinica = parseFloat(String(row.valor_percentual));
        } else if (row.nome_configuracao === "percentual_impostos") {
          imposto = parseFloat(String(row.valor_percentual));
        }
      });

      setPorcentagens({ clinica, imposto });
      setTempPorcentagens({ clinica, imposto });
    } catch (error) {
      console.error("Erro ao buscar porcentagens:", error);
    }
  };

  const fetchFinanceiro = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, data_consulta, nome_paciente, convenio, valor, color")
        .gte("data_consulta", startDate)
        .lte("data_consulta", endDate)
        .order("data_consulta");

      if (error) throw error;

      setAgendamentos(data || []);

      // Calculate summary based on status colors from Agenda/Agendamentos
      // green = Agendado, blue = Atendido, lilac = Não Desmarcado, red = Cancelado
      let agendado = 0;
      let atendido = 0;
      let naoDesmarcado = 0;

      (data || []).forEach((row) => {
        const valor = parseFloat(String(row.valor)) || 0;
        switch (row.color) {
          case "green":
            agendado += valor;
            break;
          case "blue":
            atendido += valor;
            break;
          case "lilac":
            naoDesmarcado += valor;
            break;
        }
      });

      setResumo({
        agendado,
        atendido,
        naoDesmarcado,
        totalSemDesconto: atendido + naoDesmarcado,
      });
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePorcentagens = async () => {
    try {
      await supabase
        .from("configuracoes_financeiras")
        .update({ valor_percentual: tempPorcentagens.clinica })
        .eq("nome_configuracao", "percentual_clinica");

      await supabase
        .from("configuracoes_financeiras")
        .update({ valor_percentual: tempPorcentagens.imposto })
        .eq("nome_configuracao", "percentual_impostos");

      setPorcentagens(tempPorcentagens);
      setShowSettings(false);
      toast.success("Porcentagens atualizadas!");
    } catch (error) {
      console.error("Erro ao salvar porcentagens:", error);
      toast.error("Erro ao salvar porcentagens");
    }
  };

  // Calculate financial values
  const valorClinica = resumo.totalSemDesconto * (porcentagens.clinica / 100);
  const valorBarbara = resumo.totalSemDesconto - valorClinica;
  const valorImposto = valorBarbara * (porcentagens.imposto / 100);
  const valorLiquido = valorBarbara - valorImposto;

  // Group by convenio
  const convenioStats = agendamentos.reduce((acc, ag) => {
    if (!acc[ag.convenio]) {
      acc[ag.convenio] = { total: 0, count: 0 };
    }
    acc[ag.convenio].total += parseFloat(String(ag.valor)) || 0;
    acc[ag.convenio].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  // Chart data processing
  const faturamentoData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    agendamentos.forEach((ag) => {
      const date = new Date(ag.data_consulta + 'T00:00:00');
      let key: string;
      
      if (chartPeriod === "dia") {
        key = format(date, "dd/MM", { locale: ptBR });
      } else if (chartPeriod === "semana") {
        const weekNum = getWeek(date, { locale: ptBR });
        key = `Sem ${weekNum}`;
      } else {
        key = format(date, "MMM/yy", { locale: ptBR });
      }
      
      grouped[key] = (grouped[key] || 0) + (parseFloat(String(ag.valor)) || 0);
    });
    
    return Object.entries(grouped).map(([name, valor]) => ({ name, valor }));
  }, [agendamentos, chartPeriod]);

  const statusData = useMemo(() => {
    const stats = { Agendado: 0, Atendido: 0, "Não Compareceu": 0, Desmarcado: 0 };
    
    agendamentos.forEach((ag) => {
      switch (ag.color) {
        case "green":
          stats.Agendado += 1;
          break;
        case "blue":
          stats.Atendido += 1;
          break;
        case "red":
          stats["Não Compareceu"] += 1;
          break;
        case "lilac":
          stats.Desmarcado += 1;
          break;
      }
    });
    
    return Object.entries(stats)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [agendamentos]);

  const convenioChartData = useMemo(() => {
    return Object.entries(convenioStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6)
      .map(([name, stats]) => ({ name, valor: stats.total }));
  }, [convenioStats]);

  const tendenciaData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    agendamentos.forEach((ag) => {
      const date = new Date(ag.data_consulta + 'T00:00:00');
      let key: string;
      
      if (chartPeriod === "dia") {
        key = format(date, "dd/MM", { locale: ptBR });
      } else if (chartPeriod === "semana") {
        const weekNum = getWeek(date, { locale: ptBR });
        key = `Sem ${weekNum}`;
      } else {
        key = format(date, "MMM/yy", { locale: ptBR });
      }
      
      if (ag.color === "blue" || ag.color === "red" || ag.color === "lilac") {
        grouped[key] = (grouped[key] || 0) + (parseFloat(String(ag.valor)) || 0);
      }
    });
    
    return Object.entries(grouped).map(([name, valor]) => ({ name, valor }));
  }, [agendamentos, chartPeriod]);

  return (
    <Layout title="Financeiro">
      <div className="max-w-7xl mx-auto px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">Relatório Financeiro</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Análise do período</p>
            </div>
          </div>
          <button
            onClick={() => {
              setTempPorcentagens(porcentagens);
              setShowSettings(true);
            }}
            className="btn-outline flex items-center gap-2 text-sm py-2"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Configurar</span>
          </button>
        </div>

        {/* Date Filter */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col xs:flex-row xs:items-end gap-3 sm:gap-6">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">INÍCIO</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input text-sm w-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">FINAL</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input text-sm w-full"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Agendado</span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-status-green/10 flex items-center justify-center">
                    <Calendar size={14} className="text-status-green" />
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-status-green">{formatarMoeda(resumo.agendado)}</div>
              </div>

              <div className="bg-card rounded-xl shadow-card border border-border/50 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Atendido</span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-status-blue/10 flex items-center justify-center">
                    <TrendingUp size={14} className="text-status-blue" />
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-status-blue">{formatarMoeda(resumo.atendido)}</div>
              </div>

              <div className="bg-card rounded-xl shadow-card border border-border/50 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Não Desmarcado</span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-status-lilac/10 flex items-center justify-center">
                    <TrendingDown size={14} className="text-status-lilac" />
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-status-lilac">{formatarMoeda(resumo.naoDesmarcado)}</div>
              </div>

              <div className="bg-card rounded-xl shadow-card border border-border/50 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Total Bruto</span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-status-red/10 flex items-center justify-center">
                    <DollarSign size={14} className="text-status-red" />
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-status-red">{formatarMoeda(resumo.totalSemDesconto)}</div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 sm:p-6">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <BarChart3 size={18} className="text-primary" />
                  Distribuição Financeira
                </h3>
                <div className="space-y-2 sm:space-y-4">
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs sm:text-sm text-muted-foreground">Total Bruto</span>
                    <span className="font-semibold text-sm sm:text-base">{formatarMoeda(resumo.totalSemDesconto)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-destructive/10 rounded-lg">
                    <span className="text-xs sm:text-sm text-muted-foreground">Clínica ({porcentagens.clinica}%)</span>
                    <span className="font-semibold text-destructive text-sm sm:text-base">- {formatarMoeda(valorClinica)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-primary/10 rounded-lg">
                    <span className="text-xs sm:text-sm text-muted-foreground">Subtotal Barbara</span>
                    <span className="font-semibold text-primary text-sm sm:text-base">{formatarMoeda(valorBarbara)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-status-yellow/10 rounded-lg">
                    <span className="text-xs sm:text-sm text-muted-foreground">Impostos ({porcentagens.imposto}%)</span>
                    <span className="font-semibold text-status-yellow text-sm sm:text-base">- {formatarMoeda(valorImposto)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-status-green/10 rounded-lg border-2 border-status-green/20">
                    <span className="font-semibold text-status-green text-sm sm:text-base">Valor Líquido</span>
                    <span className="text-xl sm:text-2xl font-bold text-status-green">{formatarMoeda(valorLiquido)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 sm:p-6">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <PieChartIcon size={18} className="text-primary" />
                  Por Convênio
                </h3>
                <div className="space-y-2 sm:space-y-3 max-h-[300px] overflow-y-auto">
                  {Object.entries(convenioStats)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([convenio, stats]) => (
                      <div key={convenio} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-sm truncate block">{convenio}</span>
                          <span className="text-xs text-muted-foreground">
                            {stats.count} consulta{stats.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="font-semibold text-sm sm:text-base ml-2">{formatarMoeda(stats.total)}</span>
                      </div>
                    ))}
                  {Object.keys(convenioStats).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum dado disponível
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                  <LineChart size={18} className="text-primary" />
                  Análise Financeira
                </h3>
                <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
                  {(["dia", "semana", "mes"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setChartPeriod(period)}
                      className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        chartPeriod === period
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {period === "dia" ? "Dia" : period === "semana" ? "Semana" : "Mês"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Charts Grid */}
              <div className="space-y-4 sm:space-y-6">
                {/* Row 1: Faturamento + Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Faturamento Chart */}
                  <div className="bg-muted/20 rounded-lg p-3 sm:p-4">
                    <h4 className="font-medium text-foreground mb-3 sm:mb-4 text-sm">Faturamento</h4>
                    <div className="h-56 sm:h-64 overflow-x-auto">
                      <div className="min-w-[400px] h-full">
                        {faturamentoData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={faturamentoData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={50} />
                              <Tooltip
                                formatter={(value: number) => formatarMoeda(value)}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                }}
                              />
                              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            Nenhum dado disponível
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status das Consultas Chart */}
                  <div className="bg-muted/20 rounded-lg p-3 sm:p-4">
                    <h4 className="font-medium text-foreground mb-3 sm:mb-4 text-sm">Status das Consultas</h4>
                    <div className="h-56 sm:h-64">
                      {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusData}
                              cx="50%"
                              cy="45%"
                              innerRadius={35}
                              outerRadius={55}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {statusData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Legend 
                              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                              formatter={(value) => <span className="text-[10px] sm:text-xs">{value}</span>}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          Nenhum dado disponível
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Convênio + Tendência */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Receita por Convênio Chart */}
                  <div className="bg-muted/20 rounded-lg p-3 sm:p-4">
                    <h4 className="font-medium text-foreground mb-3 sm:mb-4 text-sm">Receita por Convênio</h4>
                    <div className="h-56 sm:h-64 overflow-x-auto">
                      <div className="min-w-[350px] h-full">
                        {convenioChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={convenioChartData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} 
                                width={80}
                                tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
                              />
                              <Tooltip
                                formatter={(value: number) => formatarMoeda(value)}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                }}
                              />
                              <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                                {convenioChartData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            Nenhum dado disponível
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tendência de Faturamento Chart */}
                  <div className="bg-muted/20 rounded-lg p-3 sm:p-4">
                    <h4 className="font-medium text-foreground mb-3 sm:mb-4 text-sm">Tendência de Faturamento</h4>
                    <div className="h-56 sm:h-64 overflow-x-auto">
                      <div className="min-w-[400px] h-full">
                        {tendenciaData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={tendenciaData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={50} />
                              <Tooltip
                                formatter={(value: number) => formatarMoeda(value)}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="valor"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            Nenhum dado disponível
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">Configurar Porcentagens</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="form-label">Porcentagem da Clínica (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={tempPorcentagens.clinica}
                  onChange={(e) =>
                    setTempPorcentagens((prev) => ({
                      ...prev,
                      clinica: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Porcentagem de Impostos (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={tempPorcentagens.imposto}
                  onChange={(e) =>
                    setTempPorcentagens((prev) => ({
                      ...prev,
                      imposto: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="form-input"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowSettings(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button onClick={handleSavePorcentagens} className="btn-primary flex-1">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Financeiro;
