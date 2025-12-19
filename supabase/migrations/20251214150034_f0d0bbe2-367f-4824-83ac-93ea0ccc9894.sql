-- Adicionar colunas de contato de emergência na tabela pacientes
ALTER TABLE public.pacientes 
ADD COLUMN nome_contato_emergencia character varying NULL,
ADD COLUMN telefone_contato_emergencia character varying NULL;