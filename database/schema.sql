-- =============================================
-- SCHEMA COMPLETO DO BANCO DE DADOS
-- Sistema de Gestão - Supabase
-- Atualizado: 2024
-- =============================================

-- =============================================
-- FUNÇÕES AUXILIARES (criar primeiro)
-- =============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Função para criar profile ao cadastrar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nome)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'));
    RETURN NEW;
END;
$$;

-- =============================================
-- TABELA: profiles (usuários do sistema)
-- =============================================
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    nome TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles 
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- TABELA: pacientes
-- =============================================
CREATE TABLE public.pacientes (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo VARCHAR NOT NULL,
    data_nascimento DATE NOT NULL,
    genero VARCHAR NOT NULL,
    cpf VARCHAR NOT NULL,
    telefone VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    convenio VARCHAR NOT NULL,
    responsavel VARCHAR,
    cep VARCHAR NOT NULL,
    logradouro VARCHAR NOT NULL,
    numero VARCHAR NOT NULL,
    bairro VARCHAR NOT NULL,
    cidade VARCHAR NOT NULL,
    estado VARCHAR NOT NULL,
    situacao VARCHAR NOT NULL DEFAULT 'Ativo',
    nome_contato_emergencia VARCHAR,
    telefone_contato_emergencia VARCHAR,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus pacientes" ON public.pacientes 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar seus pacientes" ON public.pacientes 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus pacientes" ON public.pacientes 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir seus pacientes" ON public.pacientes 
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TABELA: convenios
-- =============================================
CREATE TABLE public.convenios (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_convenio VARCHAR NOT NULL,
    consulta VARCHAR NOT NULL,
    duracao TIME NOT NULL,
    valor NUMERIC NOT NULL,
    pagamento INTEGER NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus convenios" ON public.convenios 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar seus convenios" ON public.convenios 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus convenios" ON public.convenios 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir seus convenios" ON public.convenios 
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TABELA: agendamentos
-- =============================================
CREATE TABLE public.agendamentos (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data_consulta DATE NOT NULL,
    inicio TIME NOT NULL,
    fim TIME NOT NULL,
    nome_paciente VARCHAR NOT NULL,
    telefone VARCHAR,
    convenio VARCHAR NOT NULL,
    consulta VARCHAR NOT NULL,
    modalidade VARCHAR NOT NULL DEFAULT 'Presencial',
    frequencia VARCHAR NOT NULL,
    valor NUMERIC DEFAULT 0.00,
    status_pagamento VARCHAR DEFAULT 'pendente',
    color VARCHAR DEFAULT 'green',
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus agendamentos" ON public.agendamentos 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar seus agendamentos" ON public.agendamentos 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus agendamentos" ON public.agendamentos 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir seus agendamentos" ON public.agendamentos 
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TABELA: compromissos_pessoais
-- =============================================
CREATE TABLE public.compromissos_pessoais (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    data_compromisso DATE NOT NULL,
    inicio TIME NOT NULL,
    fim TIME NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pendente',
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.compromissos_pessoais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus compromissos" ON public.compromissos_pessoais 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar seus compromissos" ON public.compromissos_pessoais 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus compromissos" ON public.compromissos_pessoais 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir seus compromissos" ON public.compromissos_pessoais 
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TABELA: tarefas
-- =============================================
CREATE TABLE public.tarefas (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    data_vencimento DATE,
    criada_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas tarefas" ON public.tarefas 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar suas tarefas" ON public.tarefas 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas tarefas" ON public.tarefas 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir suas tarefas" ON public.tarefas 
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TABELA: configuracoes_financeiras
-- =============================================
CREATE TABLE public.configuracoes_financeiras (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_configuracao VARCHAR NOT NULL,
    valor_percentual NUMERIC NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.configuracoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas configs" ON public.configuracoes_financeiras 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar suas configs" ON public.configuracoes_financeiras 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas configs" ON public.configuracoes_financeiras 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir suas configs" ON public.configuracoes_financeiras 
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS para updated_at
-- =============================================
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pacientes_updated_at
    BEFORE UPDATE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_convenios_updated_at
    BEFORE UPDATE ON public.convenios
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agendamentos_updated_at
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compromissos_pessoais_updated_at
    BEFORE UPDATE ON public.compromissos_pessoais
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_financeiras_updated_at
    BEFORE UPDATE ON public.configuracoes_financeiras
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER: criar profile ao cadastrar usuário
-- =============================================
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX idx_pacientes_user_id ON public.pacientes(user_id);
CREATE INDEX idx_convenios_user_id ON public.convenios(user_id);
CREATE INDEX idx_agendamentos_user_id ON public.agendamentos(user_id);
CREATE INDEX idx_agendamentos_data ON public.agendamentos(data_consulta);
CREATE INDEX idx_compromissos_user_id ON public.compromissos_pessoais(user_id);
CREATE INDEX idx_compromissos_data ON public.compromissos_pessoais(data_compromisso);
CREATE INDEX idx_tarefas_user_id ON public.tarefas(user_id);
CREATE INDEX idx_configuracoes_user_id ON public.configuracoes_financeiras(user_id);
