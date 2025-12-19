# Guia de Deploy - Vercel + Supabase

Este guia explica como fazer o deploy do seu projeto usando Vercel para o frontend e Supabase para o backend/banco de dados.

---

## 📋 Pré-requisitos

- Conta no [GitHub](https://github.com) (já configurada)
- Conta no [Vercel](https://vercel.com)
- Conta no [Supabase](https://supabase.com)

---

## 🗄️ Parte 1: Configurar o Supabase

### 1.1 Criar um novo projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: Nome do seu projeto (ex: `sistema-gestao`)
   - **Database Password**: Crie uma senha forte (guarde ela!)
   - **Region**: Escolha a mais próxima (ex: `South America (São Paulo)`)
4. Clique em **"Create new project"**
5. Aguarde alguns minutos até o projeto ser criado

### 1.2 Executar o Schema do Banco de Dados

1. No painel do Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em **"New query"**
3. Copie todo o conteúdo do arquivo `database/schema.sql` do repositório
4. Cole no editor SQL
5. Clique em **"Run"** para executar
6. Verifique se todas as tabelas foram criadas em **Table Editor**

### 1.3 Obter as Credenciais do Supabase

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem)
2. Clique em **API** no menu lateral
3. Anote as seguintes informações:
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...`
   - **Project Reference ID**: O `xxxxxxxx` da URL acima

---

## 🚀 Parte 2: Configurar o Vercel

### 2.1 Importar o Projeto do GitHub

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em **"Add New..."** → **"Project"**
3. Na lista de repositórios, encontre o repositório do projeto
4. Clique em **"Import"**

### 2.2 Configurar as Variáveis de Ambiente

Na tela de configuração do projeto, antes de fazer o deploy:

1. Expanda a seção **"Environment Variables"**
2. Adicione as seguintes variáveis:

| Nome da Variável | Valor |
|------------------|-------|
| `VITE_SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sua-anon-key-aqui` |
| `VITE_SUPABASE_PROJECT_ID` | `seu-project-id` |

> ⚠️ **Importante**: Substitua os valores pelas credenciais obtidas no Supabase (Parte 1.3)

### 2.3 Configurar o Build

O Vercel geralmente detecta automaticamente as configurações, mas verifique:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2.4 Fazer o Deploy

1. Clique em **"Deploy"**
2. Aguarde o build completar (geralmente 1-3 minutos)
3. Após concluído, você receberá uma URL do tipo `seu-projeto.vercel.app`

---

## 🔄 Parte 3: Configurar Deploy Automático

O Vercel já configura automaticamente o deploy contínuo:

- Cada **push** na branch `main` dispara um novo deploy
- Pull Requests geram **Preview Deployments** para teste

---

## 🌐 Parte 4: Configurar Domínio Personalizado (Opcional)

### 4.1 No Vercel

1. Acesse seu projeto no Vercel
2. Vá em **Settings** → **Domains**
3. Digite seu domínio (ex: `meusite.com.br`)
4. Clique em **"Add"**
5. O Vercel mostrará os registros DNS necessários

### 4.2 No seu Provedor de Domínio

Configure os registros DNS conforme indicado pelo Vercel:

- **Tipo A**: Aponte para o IP do Vercel
- **Tipo CNAME**: Aponte para `cname.vercel-dns.com`

---

## ✅ Checklist Final

- [ ] Projeto criado no Supabase
- [ ] Schema SQL executado com sucesso
- [ ] Tabelas criadas (pacientes, convenios, agendamentos, tarefas, configuracoes_financeiras)
- [ ] Credenciais do Supabase anotadas
- [ ] Projeto importado no Vercel
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Deploy realizado com sucesso
- [ ] Aplicação funcionando na URL do Vercel

---

## 🔧 Solução de Problemas

### Erro: "Failed to fetch" ou "Network Error"

- Verifique se as variáveis de ambiente estão corretas no Vercel
- Confira se a URL do Supabase está com `https://`

### Erro: "Row Level Security policy violation"

- Verifique se as políticas RLS foram criadas corretamente no Supabase
- Execute novamente o arquivo `database/schema.sql`

### Dados não aparecem

- Verifique no Supabase se as tabelas têm dados
- Confira o console do navegador (F12) para erros

### Build falhou no Vercel

- Verifique os logs de build no Vercel
- Certifique-se que todas as dependências estão no `package.json`

---

## 📞 Suporte

- [Documentação do Vercel](https://vercel.com/docs)
- [Documentação do Supabase](https://supabase.com/docs)

---

*Última atualização: Dezembro 2025*
