import { supabase } from "@/integrations/supabase/client";

// Re-export the supabase client
export { supabase };

// Helper function to format phone number
export function formatarTelefone(telefone: string): string | null {
  const numeros = (telefone || "").replace(/\D/g, "");

  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  } else if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  return telefone;
}

// Helper function to format CPF
export function formatarCPF(cpf: string): string {
  const numeros = (cpf || "").replace(/\D/g, "");
  if (numeros.length === 11) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
  }
  return cpf;
}

// Helper function to format date for display
export function formatarData(data: string): string {
  if (!data) return "";
  const date = new Date(data);
  return date.toLocaleDateString("pt-BR");
}

// Helper function to format currency
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

// Helper function to calculate age
export function calcularIdade(dataNascimento: string): number {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();

  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }

  return idade;
}
