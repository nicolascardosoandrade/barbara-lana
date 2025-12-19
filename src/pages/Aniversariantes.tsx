import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { supabase, calcularIdade } from "@/lib/supabase";
import { Cake, Gift, Phone, Mail, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface Paciente {
  id: number;
  nome_completo: string;
  telefone: string;
  email: string;
  data_nascimento: string;
  convenio: string;
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

// Função para formatar data de nascimento corretamente
const formatarDataNascimento = (dataNascimento: string): string => {
  const nascimento = new Date(dataNascimento + "T00:00:00");
  return `${nascimento.getDate()}/${nascimento.getMonth() + 1}`;
};

const Aniversariantes = () => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    fetchPacientes();
  }, []);

  const fetchPacientes = async () => {
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nome_completo, telefone, email, data_nascimento, convenio")
        .eq("situacao", "Ativo")
        .order("nome_completo");

      if (error) throw error;
      setPacientes(data || []);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAniversariantes = () => {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    return pacientes.filter((paciente) => {
      const nascimento = new Date(paciente.data_nascimento);
      const birthMonth = nascimento.getMonth();
      const birthDate = nascimento.getDate();

      if (selectedPeriod === "today") {
        // Apenas aniversariantes de hoje
        return birthMonth === todayMonth && birthDate === todayDate;
      } else if (selectedPeriod === "week") {
        for (let i = 0; i <= 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(todayDate + i);
          if (
            checkDate.getMonth() === birthMonth &&
            checkDate.getDate() === birthDate
          ) {
            return true;
          }
        }
        return false;
      } else {
        return birthMonth === todayMonth;
      }
    }).sort((a, b) => {
      const dateA = new Date(a.data_nascimento);
      const dateB = new Date(b.data_nascimento);
      const dayA = dateA.getDate();
      const dayB = dateB.getDate();
      return dayA - dayB;
    });
  };

  const getDaysUntilBirthday = (dataNascimento: string) => {
    const today = new Date();
    const nascimento = new Date(dataNascimento);
    const thisYearBirthday = new Date(
      today.getFullYear(),
      nascimento.getMonth(),
      nascimento.getDate()
    );

    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = thisYearBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const aniversariantes = getAniversariantes();
  const todayBirthdays = aniversariantes.filter(
    (p) => getDaysUntilBirthday(p.data_nascimento) === 0
  );

  return (
    <Layout title="Aniversariantes">
      <div className="max-w-6xl mx-auto px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Cake className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">Aniversariantes</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {selectedPeriod === "today" ? "Hoje" : selectedPeriod === "week" ? "Esta semana" : "Este mês"}
              </p>
            </div>
          </div>
        </div>

        {/* Period Toggle */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className="flex items-center bg-muted rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setSelectedPeriod("today")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === "today"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setSelectedPeriod("week")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === "week"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setSelectedPeriod("month")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === "month"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Este Mês
            </button>
          </div>
        </div>

        {/* Today's Birthdays Banner - Only show when not on "today" tab */}
        {selectedPeriod !== "today" && todayBirthdays.length > 0 && (
          <div className="bg-gradient-to-r from-primary/10 to-status-yellow/10 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-primary/20">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Gift className="text-primary" size={20} />
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                🎉 Aniversariantes de Hoje!
              </h3>
            </div>
            {/* Mobile: Horizontal Scroll Cards */}
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
              {todayBirthdays.map((paciente) => (
                <div
                  key={paciente.id}
                  className="bg-card rounded-lg p-4 shadow-sm border border-border/50 min-w-[280px] sm:min-w-0 snap-start"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
                      {paciente.nome_completo.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground break-words">
                        {paciente.nome_completo}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {calcularIdadeDetalhada(paciente.data_nascimento)} hoje! 🎂
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Counter */}
        {aniversariantes.length > 0 && (
          <div className="bg-card rounded-xl shadow-card p-4 mb-4 border border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total de aniversariantes</span>
              <span className="text-2xl font-bold text-primary">{aniversariantes.length}</span>
            </div>
          </div>
        )}

        {/* All Birthdays */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Carregando...
          </div>
        ) : aniversariantes.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 sm:p-12 text-center">
            <Cake size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum aniversariante
            </h3>
            <p className="text-muted-foreground text-sm">
              Não há pacientes fazendo aniversário {selectedPeriod === "today" ? "hoje" : selectedPeriod === "week" ? "esta semana" : "este mês"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
              <div className="divide-y divide-border/50">
                {aniversariantes.map((paciente) => {
                  const daysUntil = getDaysUntilBirthday(paciente.data_nascimento);
                  const isToday = daysUntil === 0;

                  return (
                    <div
                      key={paciente.id}
                      className={`p-4 hover:bg-muted/30 transition-colors ${
                        isToday ? "bg-status-yellow/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                              isToday
                                ? "bg-status-yellow text-white"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {paciente.nome_completo.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {paciente.nome_completo}
                              {isToday && " 🎉"}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {formatarDataNascimento(paciente.data_nascimento)}
                              </span>
                              <span>{calcularIdadeDetalhada(paciente.data_nascimento)}</span>
                              <span>{paciente.convenio}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <a
                              href={`tel:${paciente.telefone}`}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Phone size={14} />
                              {paciente.telefone}
                            </a>
                            <a
                              href={`mailto:${paciente.email}`}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Mail size={14} />
                              {paciente.email}
                            </a>
                          </div>
                          <div
                            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                              isToday
                                ? "bg-status-yellow text-white"
                                : daysUntil <= 3
                                ? "bg-status-green/10 text-status-green"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isToday ? "Hoje!" : `Em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile: Vertical Cards */}
            <div className="md:hidden">
              <div className="flex flex-col gap-3">
                {aniversariantes.map((paciente) => {
                  const daysUntil = getDaysUntilBirthday(paciente.data_nascimento);
                  const isToday = daysUntil === 0;

                  return (
                    <div
                      key={paciente.id}
                      className={`bg-card rounded-xl shadow-card border border-border/50 p-4 ${
                        isToday ? "border-status-yellow/50 bg-status-yellow/5" : ""
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                            isToday
                              ? "bg-status-yellow text-white"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {paciente.nome_completo.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground break-words">
                            {paciente.nome_completo}
                            {isToday && " 🎉"}
                          </h4>
                          <div
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              isToday
                                ? "bg-status-yellow text-white"
                                : daysUntil <= 3
                                ? "bg-status-green/10 text-status-green"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isToday ? "Hoje!" : `Em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}`}
                          </div>
                        </div>
                      </div>

                      {/* Card Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar size={14} className="shrink-0" />
                          <span>{formatarDataNascimento(paciente.data_nascimento)} • {calcularIdadeDetalhada(paciente.data_nascimento)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="px-2 py-0.5 bg-muted rounded text-xs">{paciente.convenio}</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                        <a
                          href={`tel:${paciente.telefone}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                        >
                          <Phone size={14} />
                          Ligar
                        </a>
                        <a
                          href={`mailto:${paciente.email}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
                        >
                          <Mail size={14} />
                          Email
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Aniversariantes;
