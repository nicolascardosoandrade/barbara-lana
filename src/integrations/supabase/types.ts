export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          color: string | null
          consulta: string
          convenio: string
          created_at: string | null
          data_consulta: string
          fim: string
          frequencia: string
          id: number
          inicio: string
          modalidade: string
          nome_paciente: string
          observacoes: string | null
          status_pagamento: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string | null
          valor: number | null
        }
        Insert: {
          color?: string | null
          consulta: string
          convenio: string
          created_at?: string | null
          data_consulta: string
          fim: string
          frequencia: string
          id?: number
          inicio: string
          modalidade?: string
          nome_paciente: string
          observacoes?: string | null
          status_pagamento?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Update: {
          color?: string | null
          consulta?: string
          convenio?: string
          created_at?: string | null
          data_consulta?: string
          fim?: string
          frequencia?: string
          id?: number
          inicio?: string
          modalidade?: string
          nome_paciente?: string
          observacoes?: string | null
          status_pagamento?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      compromissos_pessoais: {
        Row: {
          created_at: string | null
          data_compromisso: string
          fim: string
          id: number
          inicio: string
          nome: string
          observacoes: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_compromisso: string
          fim: string
          id?: number
          inicio: string
          nome: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_compromisso?: string
          fim?: string
          id?: number
          inicio?: string
          nome?: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      configuracoes_financeiras: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: number
          nome_configuracao: string
          updated_at: string | null
          user_id: string | null
          valor_percentual: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome_configuracao: string
          updated_at?: string | null
          user_id?: string | null
          valor_percentual: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          nome_configuracao?: string
          updated_at?: string | null
          user_id?: string | null
          valor_percentual?: number
        }
        Relationships: []
      }
      convenios: {
        Row: {
          ativo: boolean | null
          consulta: string
          created_at: string | null
          duracao: string
          id: number
          nome_convenio: string
          pagamento: number
          updated_at: string | null
          user_id: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          consulta: string
          created_at?: string | null
          duracao: string
          id?: number
          nome_convenio: string
          pagamento: number
          updated_at?: string | null
          user_id?: string | null
          valor: number
        }
        Update: {
          ativo?: boolean | null
          consulta?: string
          created_at?: string | null
          duracao?: string
          id?: number
          nome_convenio?: string
          pagamento?: number
          updated_at?: string | null
          user_id?: string | null
          valor?: number
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          convenio: string
          cpf: string
          created_at: string | null
          data_nascimento: string
          email: string
          estado: string
          genero: string
          id: number
          logradouro: string
          nome_completo: string
          nome_contato_emergencia: string | null
          numero: string
          responsavel: string | null
          situacao: string
          telefone: string
          telefone_contato_emergencia: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bairro: string
          cep: string
          cidade: string
          convenio: string
          cpf: string
          created_at?: string | null
          data_nascimento: string
          email: string
          estado: string
          genero: string
          id?: number
          logradouro: string
          nome_completo: string
          nome_contato_emergencia?: string | null
          numero: string
          responsavel?: string | null
          situacao?: string
          telefone: string
          telefone_contato_emergencia?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          convenio?: string
          cpf?: string
          created_at?: string | null
          data_nascimento?: string
          email?: string
          estado?: string
          genero?: string
          id?: number
          logradouro?: string
          nome_completo?: string
          nome_contato_emergencia?: string | null
          numero?: string
          responsavel?: string | null
          situacao?: string
          telefone?: string
          telefone_contato_emergencia?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          criada_em: string | null
          data_vencimento: string | null
          descricao: string
          id: number
          user_id: string | null
        }
        Insert: {
          criada_em?: string | null
          data_vencimento?: string | null
          descricao: string
          id?: number
          user_id?: string | null
        }
        Update: {
          criada_em?: string | null
          data_vencimento?: string | null
          descricao?: string
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
