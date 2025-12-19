
-- Adicionar coluna user_id em todas as tabelas relevantes
ALTER TABLE public.agendamentos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.compromissos_pessoais ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.configuracoes_financeiras ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.convenios ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pacientes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tarefas ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remover políticas antigas de agendamentos
DROP POLICY IF EXISTS "Permitir leitura de agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir inserção de agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir atualização de agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir exclusão de agendamentos" ON public.agendamentos;

-- Novas políticas para agendamentos
CREATE POLICY "Usuários podem ver seus agendamentos" ON public.agendamentos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar seus agendamentos" ON public.agendamentos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus agendamentos" ON public.agendamentos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir seus agendamentos" ON public.agendamentos FOR DELETE USING (auth.uid() = user_id);

-- Remover políticas antigas de compromissos_pessoais
DROP POLICY IF EXISTS "Permitir leitura de compromissos" ON public.compromissos_pessoais;
DROP POLICY IF EXISTS "Permitir inserção de compromissos" ON public.compromissos_pessoais;
DROP POLICY IF EXISTS "Permitir atualização de compromissos" ON public.compromissos_pessoais;
DROP POLICY IF EXISTS "Permitir exclusão de compromissos" ON public.compromissos_pessoais;

-- Novas políticas para compromissos_pessoais
CREATE POLICY "Usuários podem ver seus compromissos" ON public.compromissos_pessoais FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar seus compromissos" ON public.compromissos_pessoais FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus compromissos" ON public.compromissos_pessoais FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir seus compromissos" ON public.compromissos_pessoais FOR DELETE USING (auth.uid() = user_id);

-- Remover políticas antigas de configuracoes_financeiras
DROP POLICY IF EXISTS "Permitir leitura de config" ON public.configuracoes_financeiras;
DROP POLICY IF EXISTS "Permitir inserção de config" ON public.configuracoes_financeiras;
DROP POLICY IF EXISTS "Permitir atualização de config" ON public.configuracoes_financeiras;

-- Novas políticas para configuracoes_financeiras
CREATE POLICY "Usuários podem ver suas configs" ON public.configuracoes_financeiras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar suas configs" ON public.configuracoes_financeiras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas configs" ON public.configuracoes_financeiras FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir suas configs" ON public.configuracoes_financeiras FOR DELETE USING (auth.uid() = user_id);

-- Remover políticas antigas de convenios
DROP POLICY IF EXISTS "Permitir leitura de convenios" ON public.convenios;
DROP POLICY IF EXISTS "Permitir inserção de convenios" ON public.convenios;
DROP POLICY IF EXISTS "Permitir atualização de convenios" ON public.convenios;
DROP POLICY IF EXISTS "Permitir exclusão de convenios" ON public.convenios;

-- Novas políticas para convenios
CREATE POLICY "Usuários podem ver seus convenios" ON public.convenios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar seus convenios" ON public.convenios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus convenios" ON public.convenios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir seus convenios" ON public.convenios FOR DELETE USING (auth.uid() = user_id);

-- Remover políticas antigas de pacientes
DROP POLICY IF EXISTS "Permitir leitura de pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Permitir inserção de pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Permitir atualização de pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Permitir exclusão de pacientes" ON public.pacientes;

-- Novas políticas para pacientes
CREATE POLICY "Usuários podem ver seus pacientes" ON public.pacientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar seus pacientes" ON public.pacientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus pacientes" ON public.pacientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir seus pacientes" ON public.pacientes FOR DELETE USING (auth.uid() = user_id);

-- Remover políticas antigas de tarefas
DROP POLICY IF EXISTS "Permitir leitura de tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Permitir inserção de tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Permitir atualização de tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Permitir exclusão de tarefas" ON public.tarefas;

-- Novas políticas para tarefas
CREATE POLICY "Usuários podem ver suas tarefas" ON public.tarefas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar suas tarefas" ON public.tarefas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas tarefas" ON public.tarefas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir suas tarefas" ON public.tarefas FOR DELETE USING (auth.uid() = user_id);
