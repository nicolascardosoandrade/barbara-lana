-- Create table for personal commitments
CREATE TABLE public.compromissos_pessoais (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  data_compromisso DATE NOT NULL,
  inicio TIME NOT NULL,
  fim TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.compromissos_pessoais ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Permitir leitura de compromissos" ON public.compromissos_pessoais
FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de compromissos" ON public.compromissos_pessoais
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de compromissos" ON public.compromissos_pessoais
FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de compromissos" ON public.compromissos_pessoais
FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_compromissos_pessoais_updated_at
BEFORE UPDATE ON public.compromissos_pessoais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();