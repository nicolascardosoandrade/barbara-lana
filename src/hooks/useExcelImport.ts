import { useState, useRef } from "react";
import { read, utils } from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Expected column headers for each entity (matching export format)
const PACIENTES_COLUMNS = [
  "Nome Completo",
  "Gênero",
  "Data de Nascimento",
  "CPF",
  "Telefone",
  "Email",
  "Convênio",
  "CEP",
  "Logradouro",
  "Número",
  "Bairro",
  "Cidade",
  "Estado",
  "Situação",
  "Responsável",
  "Contato de Emergência",
  "Telefone Emergência",
];

const CONVENIOS_COLUMNS = [
  "Nome do Convênio",
  "Tipo de Consulta",
  "Duração",
  "Valor",
  "Pagamento (Dias)",
  "Status",
];

const AGENDAMENTOS_COLUMNS = [
  "Data",
  "Horário",
  "Paciente",
  "Telefone",
  "Convênio",
  "Consulta",
  "Modalidade",
  "Frequência",
  "Valor",
  "Status",
  "Observações",
];

type ImportType = "pacientes" | "convenios" | "agendamentos";

interface ImportResult {
  success: number;
  errors: number;
  errorMessages: string[];
}

export function useExcelImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateColumns = (headers: string[], expectedColumns: string[]): boolean => {
    const normalizedHeaders = headers.map((h) => h?.trim().toLowerCase());
    const normalizedExpected = expectedColumns.map((c) => c.toLowerCase());
    
    // Check if at least the first few required columns match
    const requiredColumns = normalizedExpected.slice(0, 3);
    return requiredColumns.every((col) => 
      normalizedHeaders.some((header) => header === col)
    );
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return "";
    
    // Handle dd/mm/yyyy format
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [dia, mes, ano] = parts;
      return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    }
    
    // Return as-is if already in ISO format
    return dateStr;
  };

  const parseGenero = (genero: string): string => {
    const generoLower = genero?.toLowerCase().trim() || "";
    if (generoLower === "masculino" || generoLower === "m") return "M";
    if (generoLower === "feminino" || generoLower === "f") return "F";
    if (generoLower === "outro" || generoLower === "o") return "O";
    return genero?.toUpperCase().charAt(0) || "O";
  };

  const parseCPF = (cpf: string): string => {
    // Remove formatting (dots and dashes)
    return cpf?.replace(/\D/g, "") || "";
  };

  const parseTime = (horario: string): { inicio: string; fim: string } => {
    // Format: "08:00 - 09:00"
    const parts = horario?.split(" - ") || ["08:00", "09:00"];
    return {
      inicio: parts[0]?.trim() || "08:00",
      fim: parts[1]?.trim() || "09:00",
    };
  };

  const parseStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      "confirmado": "green",
      "aguardando confirmação": "yellow",
      "cancelado": "red",
      "faltou": "gray",
      "encaixe": "blue",
      "remarcado": "orange",
      "avaliação": "purple",
    };
    return statusMap[status?.toLowerCase().trim()] || "green";
  };

  const parseDuracao = (duracao: string): string => {
    // Expected format: "HH:MM:SS" or "HH:MM"
    if (!duracao) return "01:00:00";
    
    const parts = duracao.split(":");
    if (parts.length === 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
    }
    return duracao;
  };

  const importPacientes = async (data: any[]): Promise<ImportResult> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return { success: 0, errors: 0, errorMessages: ["Usuário não autenticado"] };
    }

    let success = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const row of data) {
      try {
        const paciente = {
          user_id: userId,
          nome_completo: row["Nome Completo"]?.trim() || "",
          genero: parseGenero(row["Gênero"]),
          data_nascimento: parseDate(row["Data de Nascimento"]),
          cpf: parseCPF(row["CPF"]),
          telefone: row["Telefone"]?.trim() || "",
          email: row["Email"]?.trim() || "",
          convenio: row["Convênio"]?.trim() || "",
          cep: row["CEP"]?.trim() || "",
          logradouro: row["Logradouro"]?.trim() || "",
          numero: row["Número"]?.toString().trim() || "",
          bairro: row["Bairro"]?.trim() || "",
          cidade: row["Cidade"]?.trim() || "",
          estado: row["Estado"]?.trim() || "",
          situacao: row["Situação"]?.trim() || "Ativo",
          responsavel: row["Responsável"]?.trim() || null,
          nome_contato_emergencia: row["Contato de Emergência"]?.trim() || null,
          telefone_contato_emergencia: row["Telefone Emergência"]?.trim() || null,
        };

        // Validate required fields
        if (!paciente.nome_completo || !paciente.cpf || !paciente.data_nascimento) {
          errors++;
          errorMessages.push(`Linha ${data.indexOf(row) + 2}: Campos obrigatórios faltando (Nome, CPF ou Data de Nascimento)`);
          continue;
        }

        const { error } = await supabase.from("pacientes").insert(paciente);
        
        if (error) {
          errors++;
          if (error.message.includes("duplicate") || error.message.includes("unique")) {
            errorMessages.push(`${paciente.nome_completo}: CPF já cadastrado`);
          } else {
            errorMessages.push(`${paciente.nome_completo}: ${error.message}`);
          }
        } else {
          success++;
        }
      } catch (e: any) {
        errors++;
        errorMessages.push(`Erro na linha ${data.indexOf(row) + 2}: ${e.message}`);
      }
    }

    return { success, errors, errorMessages };
  };

  const importConvenios = async (data: any[]): Promise<ImportResult> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return { success: 0, errors: 0, errorMessages: ["Usuário não autenticado"] };
    }

    let success = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const row of data) {
      try {
        const convenio = {
          user_id: userId,
          nome_convenio: row["Nome do Convênio"]?.trim() || "",
          consulta: row["Tipo de Consulta"]?.trim() || "",
          duracao: parseDuracao(row["Duração"]),
          valor: parseFloat(row["Valor"]?.toString().replace(",", ".")) || 0,
          pagamento: parseInt(row["Pagamento (Dias)"]?.toString()) || 30,
          ativo: row["Status"]?.toLowerCase().trim() === "ativo",
        };

        // Validate required fields
        if (!convenio.nome_convenio || !convenio.consulta) {
          errors++;
          errorMessages.push(`Linha ${data.indexOf(row) + 2}: Campos obrigatórios faltando (Nome do Convênio ou Tipo de Consulta)`);
          continue;
        }

        const { error } = await supabase.from("convenios").insert(convenio);
        
        if (error) {
          errors++;
          errorMessages.push(`${convenio.nome_convenio}: ${error.message}`);
        } else {
          success++;
        }
      } catch (e: any) {
        errors++;
        errorMessages.push(`Erro na linha ${data.indexOf(row) + 2}: ${e.message}`);
      }
    }

    return { success, errors, errorMessages };
  };

  const importAgendamentos = async (data: any[]): Promise<ImportResult> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return { success: 0, errors: 0, errorMessages: ["Usuário não autenticado"] };
    }

    let success = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const row of data) {
      try {
        const horarios = parseTime(row["Horário"]);
        
        const agendamento = {
          user_id: userId,
          data_consulta: parseDate(row["Data"]),
          inicio: horarios.inicio,
          fim: horarios.fim,
          nome_paciente: row["Paciente"]?.trim() || "",
          telefone: row["Telefone"]?.trim() || null,
          convenio: row["Convênio"]?.trim() || "",
          consulta: row["Consulta"]?.trim() || "",
          modalidade: row["Modalidade"]?.trim() || "Presencial",
          frequencia: row["Frequência"]?.trim() || "Semanal",
          valor: parseFloat(row["Valor"]?.toString().replace(",", ".")) || 0,
          color: parseStatus(row["Status"]),
          observacoes: row["Observações"]?.trim() || null,
        };

        // Validate required fields
        if (!agendamento.nome_paciente || !agendamento.data_consulta || !agendamento.convenio) {
          errors++;
          errorMessages.push(`Linha ${data.indexOf(row) + 2}: Campos obrigatórios faltando (Paciente, Data ou Convênio)`);
          continue;
        }

        const { error } = await supabase.from("agendamentos").insert(agendamento);
        
        if (error) {
          errors++;
          errorMessages.push(`${agendamento.nome_paciente} (${agendamento.data_consulta}): ${error.message}`);
        } else {
          success++;
        }
      } catch (e: any) {
        errors++;
        errorMessages.push(`Erro na linha ${data.indexOf(row) + 2}: ${e.message}`);
      }
    }

    return { success, errors, errorMessages };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, type: ImportType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.endsWith(".xlsx")) {
      toast.error("Formato inválido", {
        description: "Por favor, selecione um arquivo .xlsx exportado pelo sistema.",
      });
      return;
    }

    setIsImporting(true);
    setImportType(type);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error("Arquivo vazio", {
          description: "O arquivo não contém dados para importar.",
        });
        setIsImporting(false);
        return;
      }

      const headers = jsonData[0] as string[];
      const expectedColumns = type === "pacientes" 
        ? PACIENTES_COLUMNS 
        : type === "convenios" 
          ? CONVENIOS_COLUMNS 
          : AGENDAMENTOS_COLUMNS;

      if (!validateColumns(headers, expectedColumns)) {
        toast.error("Estrutura inválida", {
          description: `O arquivo não corresponde ao formato de exportação de ${type}. Use apenas arquivos exportados pelo sistema.`,
        });
        setIsImporting(false);
        return;
      }

      // Convert to array of objects
      const dataRows = jsonData.slice(1).map((row) => {
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      }).filter((row) => Object.values(row).some((v) => v !== undefined && v !== ""));

      if (dataRows.length === 0) {
        toast.error("Arquivo vazio", {
          description: "O arquivo não contém dados válidos para importar.",
        });
        setIsImporting(false);
        return;
      }

      let result: ImportResult;
      
      if (type === "pacientes") {
        result = await importPacientes(dataRows);
      } else if (type === "convenios") {
        result = await importConvenios(dataRows);
      } else {
        result = await importAgendamentos(dataRows);
      }

      if (result.success > 0) {
        toast.success(`Importação concluída`, {
          description: `${result.success} registro(s) importado(s) com sucesso.${result.errors > 0 ? ` ${result.errors} erro(s).` : ""}`,
        });
      }

      if (result.errors > 0 && result.success === 0) {
        toast.error("Falha na importação", {
          description: result.errorMessages.slice(0, 3).join("; "),
        });
      } else if (result.errorMessages.length > 0) {
        console.warn("Erros na importação:", result.errorMessages);
      }

    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo", {
        description: "Não foi possível ler o arquivo. Verifique se é um arquivo Excel válido.",
      });
    } finally {
      setIsImporting(false);
      setImportType(null);
      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return {
    isImporting,
    importType,
    fileInputRef,
    handleFileSelect,
  };
}
