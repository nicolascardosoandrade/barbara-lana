import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { supabase, formatarCPF, formatarData, calcularIdade } from "@/lib/supabase";
import { X, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  created_at: string;
}

const PacienteDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchPaciente();
  }, [id]);

  const fetchPaciente = async () => {
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error) throw error;
      setPaciente(data);
    } catch (error) {
      console.error("Erro ao buscar paciente:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!paciente) return;
    
    if (!confirm("Deseja realmente excluir este paciente?")) return;

    try {
      const { error } = await supabase.from("pacientes").delete().eq("id", paciente.id);

      if (error) throw error;
      toast.success("Paciente excluído com sucesso!");
      navigate("/pacientes");
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      toast.error("Erro ao excluir paciente");
    }
  };

  const getGeneroLabel = (genero: string) => {
    const map: Record<string, string> = {
      M: "Masculino",
      F: "Feminino",
      O: "Outro",
      N: "Prefere não informar",
    };
    return map[genero] || genero;
  };

  const formatarCEP = (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length === 8) {
      return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
    }
    return cep;
  };

  const calcularIdadeDetalhada = (dataNascimento: string) => {
    const nascimento = new Date(dataNascimento);
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
    
    return `${anos} anos, ${meses} meses, ${dias} dias`;
  };

  if (loading) {
    return (
      <Layout title="Detalhes do Paciente">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </Layout>
    );
  }

  if (!paciente) {
    return (
      <Layout title="Detalhes do Paciente">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-muted-foreground">Paciente não encontrado</div>
          <button onClick={() => navigate("/pacientes")} className="btn-primary">
            Voltar para Pacientes
          </button>
        </div>
      </Layout>
    );
  }

  // Componente de campo somente leitura
  const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground min-h-[42px] flex items-center">
        {value || "Não informado"}
      </div>
    </div>
  );

  return (
    <>
      <Layout title="Detalhes do Paciente">
        <div />
      </Layout>
      
      {/* Modal de detalhes - Overlay semi-transparente sobre sidebar e topbar */}
      <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-0 md:p-4 overflow-y-auto">
        <div className="bg-card md:rounded-xl shadow-lg w-full h-full md:h-auto md:max-w-4xl md:my-8 animate-scale-in md:max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 md:px-6 py-4 md:rounded-t-xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground text-lg font-bold">
                {paciente.nome_completo.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-semibold">Detalhes do Paciente</h3>
                <p className="text-sm text-primary-foreground/80">{paciente.nome_completo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/pacientes?edit=${paciente.id}`)}
                className="p-2 hover:bg-primary-foreground/20 rounded-lg transition-colors"
                title="Editar paciente"
              >
                <Edit size={20} />
              </button>
              <button
                onClick={() => navigate("/pacientes")}
                className="p-2 hover:bg-primary-foreground/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1">
            {/* Dados do Paciente */}
            <div className="space-y-4">
              <h4 className="text-base font-semibold text-primary border-b border-primary/30 pb-2">
                Dados do Paciente
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadOnlyField label="Nome Completo" value={paciente.nome_completo} />
                <ReadOnlyField label="Gênero" value={getGeneroLabel(paciente.genero)} />
                <ReadOnlyField label="Responsável" value={paciente.responsavel || "Não informado"} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadOnlyField label="Telefone" value={paciente.telefone} />
                <ReadOnlyField label="Email" value={paciente.email} />
                <ReadOnlyField label="Data de Nascimento" value={formatarData(paciente.data_nascimento)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadOnlyField label="Idade" value={calcularIdadeDetalhada(paciente.data_nascimento)} />
                <ReadOnlyField label="CPF" value={formatarCPF(paciente.cpf)} />
                <ReadOnlyField label="Convênio" value={paciente.convenio} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadOnlyField label="Situação" value={paciente.situacao} />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h4 className="text-base font-semibold text-primary border-b border-primary/30 pb-2">
                Endereço
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadOnlyField label="CEP" value={formatarCEP(paciente.cep)} />
                <ReadOnlyField label="Logradouro" value={paciente.logradouro} />
                <ReadOnlyField label="Número" value={paciente.numero} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadOnlyField label="Bairro" value={paciente.bairro} />
                <ReadOnlyField label="Cidade" value={paciente.cidade} />
                <ReadOnlyField label="Estado" value={paciente.estado} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-border flex-shrink-0">
            <button
              onClick={() => navigate("/pacientes")}
              className="px-6 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Excluir
            </button>
            <button
              onClick={() => navigate(`/pacientes?edit=${paciente.id}`)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Edit size={18} />
              Editar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PacienteDetalhes;
