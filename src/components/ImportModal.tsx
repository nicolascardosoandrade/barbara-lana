import { useState, useRef } from "react";
import { read, utils } from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  X,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
} from "lucide-react";

type ImportType = "pacientes" | "convenios" | "agendamentos" | "compromissos";

interface ImportError {
  linha: number;
  nome: string;
  motivo: string;
}

interface ImportReport {
  total: number;
  success: number;
  errors: ImportError[];
}

const LABELS: Record<ImportType, string> = {
  pacientes: "Pacientes",
  convenios: "Convênios",
  agendamentos: "Agendamentos",
  compromissos: "Compromissos Pessoais",
};

const PACIENTES_COLUMNS = [
  "Nome Completo", "Gênero", "Data de Nascimento", "CPF", "Telefone", "Email",
  "Convênio", "CEP", "Logradouro", "Número", "Bairro", "Cidade", "Estado",
  "Situação", "Responsável", "Contato de Emergência", "Telefone Emergência",
];

const CONVENIOS_COLUMNS = [
  "Nome do Convênio", "Tipo de Consulta", "Duração", "Valor", "Pagamento (Dias)", "Status",
];

const AGENDAMENTOS_COLUMNS = [
  "Data", "Horário", "Paciente", "Telefone", "Convênio", "Consulta",
  "Modalidade", "Frequência", "Valor", "Status", "Observações",
];

const COMPROMISSOS_COLUMNS = [
  "Nome", "Data", "Início", "Término", "Status", "Observações",
];

const EXPECTED_COLUMNS: Record<ImportType, string[]> = {
  pacientes: PACIENTES_COLUMNS,
  convenios: CONVENIOS_COLUMNS,
  agendamentos: AGENDAMENTOS_COLUMNS,
  compromissos: COMPROMISSOS_COLUMNS,
};

// --- Parsing helpers ---
const parseDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [dia, mes, ano] = parts;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  return dateStr;
};

const parseGenero = (genero: string): string => {
  const g = genero?.toLowerCase().trim() || "";
  if (g === "masculino" || g === "m") return "M";
  if (g === "feminino" || g === "f") return "F";
  return "O";
};

const parseCPF = (cpf: string): string => cpf?.replace(/\D/g, "") || "";

const parseTime = (horario: string) => {
  const parts = horario?.split(" - ") || ["08:00", "09:00"];
  return { inicio: parts[0]?.trim() || "08:00", fim: parts[1]?.trim() || "09:00" };
};

const parseStatus = (status: string): string => {
  const map: Record<string, string> = {
    agendado: "green", atendido: "blue", cancelado: "red",
    "não desmarcado": "lilac", "nao desmarcado": "lilac",
    confirmado: "green", faltou: "red", encaixe: "blue",
  };
  return map[status?.toLowerCase().trim() || ""] || "green";
};

const parseDuracao = (d: string): string => {
  if (!d) return "01:00:00";
  const p = d.split(":");
  if (p.length === 2) return `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}:00`;
  return d;
};

// --- Validation helpers ---
const isValidDate = (d: string): boolean => {
  if (!d) return false;
  const date = new Date(d);
  return !isNaN(date.getTime());
};

const isValidCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, "");
  return clean.length === 11;
};

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
  onImportComplete?: () => void;
}

export function ImportModal({ open, onOpenChange, type, onImportComplete }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setReport(null);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (isImporting) return;
    resetState();
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".xlsx")) {
      setFile(null);
      return;
    }
    setFile(f);
    setReport(null);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateColumns = (headers: string[]): boolean => {
    const norm = headers.map(h => h?.trim().toLowerCase());
    const expected = EXPECTED_COLUMNS[type].slice(0, 3).map(c => c.toLowerCase());
    return expected.every(col => norm.some(h => h === col));
  };

  // --- Import functions ---
  const importPacientes = async (data: Record<string, any>[]): Promise<ImportReport> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { total: data.length, success: 0, errors: [{ linha: 0, nome: "-", motivo: "Usuário não autenticado" }] };

    const { data: existing } = await supabase.from("pacientes").select("cpf").eq("user_id", userId);
    const existingCPFs = new Set((existing || []).map(p => p.cpf));

    const errors: ImportError[] = [];
    let success = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const linha = i + 2;
      const nome = row["Nome Completo"]?.trim() || "";
      const cpfRaw = row["CPF"]?.toString() || "";
      const cpf = parseCPF(cpfRaw);
      const dataNasc = parseDate(row["Data de Nascimento"]?.toString() || "");

      // Collect all validation errors for this row
      const rowErrors: string[] = [];
      if (!nome) rowErrors.push("Campo 'Nome Completo' obrigatório está vazio");
      if (cpf) {
        if (!isValidCPF(cpfRaw)) rowErrors.push("CPF inválido (deve ter 11 dígitos)");
        else if (existingCPFs.has(cpf)) rowErrors.push("CPF já cadastrado no sistema");
      }
      if (!dataNasc || !isValidDate(dataNasc)) rowErrors.push("Data de nascimento inválida ou ausente");

      if (rowErrors.length > 0) {
        errors.push({ linha, nome: nome || `Linha ${linha}`, motivo: rowErrors.join("; ") });
        continue;
      }

      const paciente = {
        user_id: userId, nome_completo: nome, genero: parseGenero(row["Gênero"]),
        data_nascimento: dataNasc, cpf, telefone: row["Telefone"]?.trim() || "",
        email: row["Email"]?.trim() || "", convenio: row["Convênio"]?.trim() || "",
        cep: row["CEP"]?.trim() || "", logradouro: row["Logradouro"]?.trim() || "",
        numero: row["Número"]?.toString().trim() || "", bairro: row["Bairro"]?.trim() || "",
        cidade: row["Cidade"]?.trim() || "", estado: row["Estado"]?.trim() || "",
        situacao: row["Situação"]?.trim() || "Ativo",
        responsavel: row["Responsável"]?.trim() || null,
        nome_contato_emergencia: row["Contato de Emergência"]?.trim() || null,
        telefone_contato_emergencia: row["Telefone Emergência"]?.trim() || null,
      };

      const { error } = await supabase.from("pacientes").insert(paciente);
      if (error) {
        errors.push({ linha, nome, motivo: error.message.includes("duplicate") ? "CPF já cadastrado (duplicata)" : error.message });
      } else {
        if (cpf) existingCPFs.add(cpf);
        success++;
      }
    }
    return { total: data.length, success, errors };
  };

  const importConvenios = async (data: Record<string, any>[]): Promise<ImportReport> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { total: data.length, success: 0, errors: [{ linha: 0, nome: "-", motivo: "Usuário não autenticado" }] };

    const { data: existing } = await supabase.from("convenios").select("nome_convenio, consulta").eq("user_id", userId);
    const existingSet = new Set((existing || []).map(c => `${c.nome_convenio}|${c.consulta}`.toLowerCase()));

    const errors: ImportError[] = [];
    let success = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const linha = i + 2;
      const nome = row["Nome do Convênio"]?.trim() || "";
      const consulta = row["Tipo de Consulta"]?.trim() || "";

      const rowErrors: string[] = [];
      if (!nome) rowErrors.push("Campo 'Nome do Convênio' obrigatório está vazio");
      if (!consulta) rowErrors.push("Campo 'Tipo de Consulta' obrigatório está vazio");
      else if (nome && existingSet.has(`${nome}|${consulta}`.toLowerCase())) rowErrors.push("Convênio com mesmo nome e tipo de consulta já existe");

      if (rowErrors.length > 0) {
        errors.push({ linha, nome: nome || `Linha ${linha}`, motivo: rowErrors.join("; ") });
        continue;
      }

      const convenio = {
        user_id: userId, nome_convenio: nome, consulta,
        duracao: parseDuracao(row["Duração"]),
        valor: parseFloat(row["Valor"]?.toString().replace(",", ".")) || 0,
        pagamento: parseInt(row["Pagamento (Dias)"]?.toString()) || 30,
        ativo: row["Status"]?.toLowerCase().trim() !== "inativo",
      };

      const { error } = await supabase.from("convenios").insert(convenio);
      if (error) {
        errors.push({ linha, nome, motivo: error.message });
      } else {
        existingSet.add(`${nome}|${consulta}`.toLowerCase());
        success++;
      }
    }
    return { total: data.length, success, errors };
  };

  const importAgendamentos = async (data: Record<string, any>[]): Promise<ImportReport> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { total: data.length, success: 0, errors: [{ linha: 0, nome: "-", motivo: "Usuário não autenticado" }] };

    // Pre-fetch convenios for validation
    const { data: convs } = await supabase.from("convenios").select("nome_convenio").eq("user_id", userId);
    const convNames = new Set((convs || []).map(c => c.nome_convenio.toLowerCase()));

    const errors: ImportError[] = [];
    let success = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const linha = i + 2;
      const nome = row["Paciente"]?.trim() || "";
      const dataConsulta = parseDate(row["Data"]?.toString() || "");
      const convenio = row["Convênio"]?.trim() || "";

      const rowErrors: string[] = [];
      if (!nome) rowErrors.push("Campo 'Paciente' obrigatório está vazio");
      if (!dataConsulta || !isValidDate(dataConsulta)) rowErrors.push("Data da consulta inválida ou ausente");
      if (!convenio) rowErrors.push("Campo 'Convênio' obrigatório está vazio");
      else if (!convNames.has(convenio.toLowerCase())) rowErrors.push(`Convênio "${convenio}" não encontrado no sistema`);

      if (rowErrors.length > 0) {
        errors.push({ linha, nome: nome || `Linha ${linha}`, motivo: rowErrors.join("; ") });
        continue;
      }

      const horarios = parseTime(row["Horário"]);
      const agendamento = {
        user_id: userId, data_consulta: dataConsulta,
        inicio: horarios.inicio, fim: horarios.fim,
        nome_paciente: nome, telefone: row["Telefone"]?.trim() || null,
        convenio, consulta: row["Consulta"]?.trim() || "Sessão",
        modalidade: row["Modalidade"]?.trim() || "Presencial",
        frequencia: row["Frequência"]?.trim() || "Semanal",
        valor: parseFloat(row["Valor"]?.toString().replace(",", ".")) || 0,
        color: parseStatus(row["Status"]),
        observacoes: row["Observações"]?.trim() || null,
      };

      const { error } = await supabase.from("agendamentos").insert(agendamento);
      if (error) {
        errors.push({ linha, nome, motivo: error.message });
      } else {
        success++;
      }
    }
    return { total: data.length, success, errors };
  };

  const importCompromissos = async (data: Record<string, any>[]): Promise<ImportReport> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { total: data.length, success: 0, errors: [{ linha: 0, nome: "-", motivo: "Usuário não autenticado" }] };

    const errors: ImportError[] = [];
    let success = 0;

    const parseCompromissoStatus = (status: string): string => {
      const map: Record<string, string> = {
        "pendente": "pendente",
        "concluído": "concluido",
        "concluido": "concluido",
        "cancelado": "cancelado",
      };
      return map[status?.toLowerCase().trim() || ""] || "pendente";
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const linha = i + 2;
      const nome = row["Nome"]?.trim() || "";
      const dataRaw = row["Data"]?.toString() || "";
      const inicio = row["Início"]?.toString().trim() || "";
      const fim = row["Término"]?.toString().trim() || "";

      const rowErrors: string[] = [];
      if (!nome) rowErrors.push("Campo 'Nome' obrigatório está vazio");
      
      const dataComp = parseDate(dataRaw);
      if (!dataComp || !isValidDate(dataComp)) rowErrors.push("Data inválida ou ausente");
      if (!inicio) rowErrors.push("Campo 'Início' obrigatório está vazio");
      if (!fim) rowErrors.push("Campo 'Término' obrigatório está vazio");

      if (rowErrors.length > 0) {
        errors.push({ linha, nome: nome || `Linha ${linha}`, motivo: rowErrors.join("; ") });
        continue;
      }

      const compromisso = {
        user_id: userId,
        nome,
        data_compromisso: dataComp,
        inicio: inicio.length === 5 ? `${inicio}:00` : inicio,
        fim: fim.length === 5 ? `${fim}:00` : fim,
        status: parseCompromissoStatus(row["Status"]),
        observacoes: row["Observações"]?.trim() || null,
      };

      const { error } = await supabase.from("compromissos_pessoais").insert(compromisso);
      if (error) {
        errors.push({ linha, nome, motivo: error.message });
      } else {
        success++;
      }
    }
    return { total: data.length, success, errors };
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setReport(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        setReport({ total: 0, success: 0, errors: [{ linha: 0, nome: "-", motivo: "O arquivo não contém dados para importar" }] });
        setIsImporting(false);
        return;
      }

      const headers = jsonData[0] as string[];
      if (!validateColumns(headers)) {
        setReport({ total: 0, success: 0, errors: [{ linha: 0, nome: "-", motivo: `O arquivo não corresponde ao formato de exportação de ${LABELS[type]}. Use apenas arquivos exportados pelo sistema.` }] });
        setIsImporting(false);
        return;
      }

      const dataRows = jsonData.slice(1).map(row => {
        const obj: Record<string, any> = {};
        headers.forEach((header, idx) => { obj[header] = row[idx] !== undefined ? row[idx] : ""; });
        return obj;
      }).filter(obj => Object.values(obj).some(v => v !== undefined && v !== null && v !== ""));

      if (dataRows.length === 0) {
        setReport({ total: 0, success: 0, errors: [{ linha: 0, nome: "-", motivo: "O arquivo não contém dados válidos" }] });
        setIsImporting(false);
        return;
      }

      let result: ImportReport;
      if (type === "pacientes") result = await importPacientes(dataRows);
      else if (type === "convenios") result = await importConvenios(dataRows);
      else if (type === "compromissos") result = await importCompromissos(dataRows);
      else result = await importAgendamentos(dataRows);

      setReport(result);
      if (result.success > 0) onImportComplete?.();
    } catch (err: any) {
      setReport({ total: 0, success: 0, errors: [{ linha: 0, nome: "-", motivo: "Não foi possível ler o arquivo. Verifique se é um arquivo Excel válido." }] });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar {LABELS[type]}
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo .xlsx exportado pelo sistema para importar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Upload area */}
          {!report && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
              />

              {!file ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="w-full border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <Upload className="h-10 w-10 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Clique para selecionar o arquivo</p>
                    <p className="text-xs text-muted-foreground">Formato aceito: .xlsx</p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30">
                  <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={removeFile}
                    disabled={isImporting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Importing spinner */}
          {isImporting && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processando importação...</p>
            </div>
          )}

          {/* Report */}
          {report && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 border rounded-lg p-3 bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{report.success}</p>
                    <p className="text-xs text-muted-foreground">Importados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border rounded-lg p-3 bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-destructive">{report.errors.length}</p>
                    <p className="text-xs text-muted-foreground">Com erro</p>
                  </div>
                </div>
              </div>

              {report.success > 0 && report.errors.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Todos os {report.success} registros foram importados com sucesso!
                  </p>
                </div>
              )}

              {/* Error details */}
              {report.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h4 className="text-sm font-medium">Detalhes dos erros</h4>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-1.5">
                      {report.errors.map((err, idx) => (
                        <div key={idx} className="text-xs border rounded p-2 bg-muted/30 space-y-0.5">
                          <div className="flex items-center gap-2">
                            {err.linha > 0 && (
                              <span className="font-mono text-muted-foreground">Linha {err.linha}</span>
                            )}
                            <span className="font-medium truncate">{err.nome}</span>
                          </div>
                          <p className="text-destructive">{err.motivo}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          {!report ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmImport} disabled={!file || isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Confirmar Importação
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
