-- ========================================
-- SISTEMA AeR BARBARA LANA - BANCO DE DADOS
-- ========================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TABELA: pacientes
-- ========================================
CREATE TABLE public.pacientes (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    genero VARCHAR(50) NOT NULL,
    responsavel VARCHAR(255),
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    convenio VARCHAR(100) NOT NULL,
    cep VARCHAR(8) NOT NULL,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    situacao VARCHAR(50) NOT NULL DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pacientes_nome ON public.pacientes(nome_completo);
CREATE INDEX idx_pacientes_convenio ON public.pacientes(convenio);
CREATE INDEX idx_pacientes_situacao ON public.pacientes(situacao);
CREATE INDEX idx_pacientes_nascimento ON public.pacientes(data_nascimento);

CREATE TRIGGER update_pacientes_updated_at
    BEFORE UPDATE ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de pacientes" ON public.pacientes
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de pacientes" ON public.pacientes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de pacientes" ON public.pacientes
    FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de pacientes" ON public.pacientes
    FOR DELETE USING (true);

-- ========================================
-- TABELA: convenios
-- ========================================
CREATE TABLE public.convenios (
    id SERIAL PRIMARY KEY,
    nome_convenio VARCHAR(100) NOT NULL UNIQUE,
    consulta VARCHAR(100) NOT NULL,
    duracao TIME NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    pagamento INT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_convenios_ativo ON public.convenios(ativo);

CREATE TRIGGER update_convenios_updated_at
    BEFORE UPDATE ON public.convenios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de convenios" ON public.convenios
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de convenios" ON public.convenios
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de convenios" ON public.convenios
    FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de convenios" ON public.convenios
    FOR DELETE USING (true);

-- ========================================
-- TABELA: agendamentos
-- ========================================
CREATE TABLE public.agendamentos (
    id SERIAL PRIMARY KEY,
    data_consulta DATE NOT NULL,
    nome_paciente VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    inicio TIME NOT NULL,
    fim TIME NOT NULL,
    convenio VARCHAR(100) NOT NULL,
    consulta VARCHAR(100) NOT NULL,
    modalidade VARCHAR(20) DEFAULT 'Presencial' NOT NULL,
    frequencia VARCHAR(50) NOT NULL,
    observacoes TEXT,
    valor DECIMAL(10, 2) DEFAULT 0.00,
    color VARCHAR(20) DEFAULT 'green',
    status_pagamento VARCHAR(20) DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agendamentos_data ON public.agendamentos(data_consulta);
CREATE INDEX idx_agendamentos_paciente ON public.agendamentos(nome_paciente);
CREATE INDEX idx_agendamentos_convenio ON public.agendamentos(convenio);
CREATE INDEX idx_agendamentos_color ON public.agendamentos(color);

CREATE TRIGGER update_agendamentos_updated_at
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de agendamentos" ON public.agendamentos
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de agendamentos" ON public.agendamentos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de agendamentos" ON public.agendamentos
    FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de agendamentos" ON public.agendamentos
    FOR DELETE USING (true);

-- ========================================
-- TABELA: tarefas (Anotações da Barbara)
-- ========================================
CREATE TABLE public.tarefas (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    data_vencimento DATE,
    criada_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de tarefas" ON public.tarefas
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de tarefas" ON public.tarefas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de tarefas" ON public.tarefas
    FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de tarefas" ON public.tarefas
    FOR DELETE USING (true);

-- ========================================
-- TABELA: configuracoes_financeiras
-- ========================================
CREATE TABLE public.configuracoes_financeiras (
    id SERIAL PRIMARY KEY,
    nome_configuracao VARCHAR(100) NOT NULL UNIQUE,
    valor_percentual DECIMAL(5, 2) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_config_financeiras_updated_at
    BEFORE UPDATE ON public.configuracoes_financeiras
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.configuracoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de config" ON public.configuracoes_financeiras
    FOR SELECT USING (true);

CREATE POLICY "Permitir atualização de config" ON public.configuracoes_financeiras
    FOR UPDATE USING (true);

CREATE POLICY "Permitir inserção de config" ON public.configuracoes_financeiras
    FOR INSERT WITH CHECK (true);

-- Dados iniciais de configuração
INSERT INTO public.configuracoes_financeiras (nome_configuracao, valor_percentual, descricao) VALUES
('percentual_clinica', 45.00, 'Percentual de repasse para a clínica'),
('percentual_impostos', 6.00, 'Percentual de impostos sobre o faturamento');

-- Dados iniciais de convênios
INSERT INTO public.convenios (nome_convenio, consulta, duracao, valor, pagamento) VALUES
('Unimed', 'Consulta Básica', '00:30:00', 150.00, 1),
('SUS', 'Consulta Gratuita', '00:30:00', 0.00, 0),
('Particular', 'Consulta Particular', '00:45:00', 200.00, 1),
('Amil', 'Consulta Especializada', '00:45:00', 180.00, 1),
('Bradesco Saúde', 'Exame de Rotina', '01:00:00', 250.00, 1),
('SulAmérica', 'Consulta Cardiológica', '00:40:00', 220.00, 1),
('Golden Cross', 'Consulta Dermatológica', '00:35:00', 190.00, 1),
('NotreDame', 'Consulta Geral', '00:30:00', 160.00, 1),
('Porto Seguro', 'Consulta Ortopédica', '00:50:00', 210.00, 1),
('Hapvida', 'Consulta Pediátrica', '00:30:00', 140.00, 1);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tarefas;