import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { addDays, addWeeks, addMonths, format, parseISO } from "date-fns";
import { supabase, formatarMoeda } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { toast } from "sonner";

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

interface AgendamentoFormData {
  data_consulta: string;
  nome_paciente: string;
  telefone: string;
  inicio: string;
  fim: string;
  convenio: string;
  consulta: string;
  modalidade: string;
  frequencia: string;
  observacoes: string;
  valor: string;
}

interface AgendamentoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingId?: number | null;
  initialData?: AgendamentoFormData | null;
}

const defaultFormData: AgendamentoFormData = {
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
};

export const AgendamentoFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  editingId = null,
  initialData = null,
}: AgendamentoFormModalProps) => {
  const { user } = useAuth();
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [compromissos, setCompromissos] = useState<CompromissoPessoal[]>([]);
  const [formData, setFormData] = useState<AgendamentoFormData>(defaultFormData);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData(defaultFormData);
      }
    }
  }, [isOpen, initialData]);

  const fetchData = async () => {
    try {
      const [conveniosRes, pacientesRes, compromissosRes] = await Promise.all([
        supabase.from("convenios").select("*").eq("ativo", true),
        supabase.from("pacientes").select("id, nome_completo, telefone, convenio").eq("situacao", "Ativo"),
        supabase.from("compromissos_pessoais").select("*"),
      ]);

      if (conveniosRes.error) throw conveniosRes.error;
      if (pacientesRes.error) throw pacientesRes.error;
      if (compromissosRes.error) throw compromissosRes.error;

      setConvenios(conveniosRes.data || []);
      setPacientes(pacientesRes.data || []);
      setCompromissos(compromissosRes.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
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

  const verificarConflitoCompromisso = (data: string, inicio: string, fim: string): CompromissoPessoal | null => {
    const compromissoConflitante = compromissos.find((c) => {
      if (c.data_compromisso !== data) return false;
      
      const inicioNovo = inicio.replace(":", "");
      const fimNovo = fim.replace(":", "");
      const inicioCompromisso = c.inicio.substring(0, 5).replace(":", "");
      const fimCompromisso = c.fim.substring(0, 5).replace(":", "");
      
      return !(fimNovo <= inicioCompromisso || inicioNovo >= fimCompromisso);
    });
    
    return compromissoConflitante || null;
  };

  // Função para gerar datas recorrentes baseado na frequência
  const gerarDatasRecorrentes = (dataInicial: string, frequencia: string): string[] => {
    const datas: string[] = [dataInicial];
    const dataBase = parseISO(dataInicial);

    switch (frequencia) {
      case "Semanal":
        // 6 semanas consecutivas (total de 6 agendamentos incluindo o primeiro)
        for (let i = 1; i < 6; i++) {
          const novaData = addWeeks(dataBase, i);
          datas.push(format(novaData, "yyyy-MM-dd"));
        }
        break;
      case "Quinzenal":
        // A cada 15 dias, por 6 ocorrências
        for (let i = 1; i < 6; i++) {
          const novaData = addDays(dataBase, i * 15);
          datas.push(format(novaData, "yyyy-MM-dd"));
        }
        break;
      case "Mensal":
        // A cada mês, por 6 ocorrências
        for (let i = 1; i < 6; i++) {
          const novaData = addMonths(dataBase, i);
          datas.push(format(novaData, "yyyy-MM-dd"));
        }
        break;
      case "Única":
      default:
        // Apenas a data inicial
        break;
    }

    return datas;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const agendamentoBase = {
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
        // Para edição, verificar conflito apenas da data atual
        const conflito = verificarConflitoCompromisso(
          formData.data_consulta,
          formData.inicio,
          formData.fim
        );

        if (conflito) {
          toast.error(`Conflito com compromisso: "${conflito.nome}" (${conflito.inicio.substring(0, 5)} - ${conflito.fim.substring(0, 5)})`);
          return;
        }

        const { error } = await supabase
          .from("agendamentos")
          .update({ ...agendamentoBase, data_consulta: formData.data_consulta })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Agendamento atualizado com sucesso!");
      } else {
        // Para novo agendamento, gerar datas recorrentes
        const datasRecorrentes = gerarDatasRecorrentes(formData.data_consulta, formData.frequencia);
        
        // Verificar conflitos para todas as datas
        const conflitos: string[] = [];
        for (const data of datasRecorrentes) {
          const conflito = verificarConflitoCompromisso(data, formData.inicio, formData.fim);
          if (conflito) {
            conflitos.push(`${format(parseISO(data), "dd/MM/yyyy")} - ${conflito.nome}`);
          }
        }

        if (conflitos.length > 0) {
          toast.error(`Conflitos encontrados:\n${conflitos.join("\n")}`);
          return;
        }

        // Criar todos os agendamentos
        const agendamentosParaInserir = datasRecorrentes.map((data) => ({
          ...agendamentoBase,
          data_consulta: data,
          user_id: user?.id,
        }));

        const { error } = await supabase.from("agendamentos").insert(agendamentosParaInserir);

        if (error) throw error;
        
        if (datasRecorrentes.length > 1) {
          toast.success(`${datasRecorrentes.length} agendamentos criados com sucesso!`);
        } else {
          toast.success("Agendamento cadastrado com sucesso!");
        }
      }

      onClose();
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar agendamento:", error);
      toast.error(error.message || "Erro ao salvar agendamento");
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-card md:rounded-xl shadow-lg w-full h-dvh md:h-auto md:max-w-3xl md:my-8 animate-scale-in md:max-h-[85vh] flex flex-col pt-[env(safe-area-inset-top,0px)] md:pt-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 md:px-6 py-4 md:rounded-t-xl flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold">
            {editingId ? "Editar Agendamento" : "Adicionar Agendamento"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1 pb-[env(safe-area-inset-bottom,16px)] md:pb-6">
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
          <div className="flex justify-end gap-2 md:gap-3 pt-3 md:pt-4 pb-4 md:pb-0 border-t border-border">
            <button
              type="button"
              onClick={onClose}
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
    </div>,
    document.body
  );
};
