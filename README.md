# 🔍 FakeIA — Detector de Fake News com IA

> Sistema inteligente de verificação de notícias e detecção de desinformação, com suporte a texto, imagens e links, alimentado por GPT-4o-mini via n8n.

---

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Arquitetura Geral](#arquitetura-geral)
- [Fluxo do Workflow n8n](#fluxo-do-workflow-n8n)
- [Frontend — Aurora Glamour UI](#frontend--aurora-glamour-ui)
- [Backend — Webhook n8n](#backend--webhook-n8n)
- [Prompt do Agente de IA](#prompt-do-agente-de-ia)
- [Banco de Dados](#banco-de-dados)
- [Como Usar](#como-usar)
- [Exemplo de Requisição](#exemplo-de-requisição)
- [Exemplo de Resposta](#exemplo-de-resposta)
- [Problemas Identificados e Melhorias Sugeridas](#problemas-identificados-e-melhorias-sugeridas)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)

---

## Sobre o Projeto

O **FakeAI** é um sistema completo de verificação de notícias e detecção de desinformação desenvolvido como projeto acadêmico. O sistema permite que o usuário envie uma notícia em formato de **texto**, **link (URL)** ou **imagem (print/screenshot)**, e recebe de volta uma análise detalhada baseada em metodologias de fact-checking profissional, como as utilizadas pela **Agência Lupa**, **AFP Checamos** e **Aos Fatos** — todas certificadas pela **IFCN (International Fact-Checking Network)**.

A interface gráfica (**Aurora Glamour UI**) se comunica com um workflow automatizado no **n8n**, que processa o conteúdo, aciona um agente de IA (**GPT-4o-mini**) e persiste o histórico de análises em um banco de dados **PostgreSQL**.

---

## Funcionalidades

- ✅ Análise de notícias em **texto livre**
- ✅ Análise de notícias via **URL/link** (com extração automática do conteúdo via Jina.ai)
- ✅ Análise de notícias via **imagem ou print** (base64)
- ✅ Classificação em **REAL**, **SUSPEITA** ou **FAKE NEWS**
- ✅ Pontuação de probabilidade de ser fake (0 a 100%)
- ✅ Raciocínio em cadeia (Chain-of-Thought) com 7 passos de análise antes da conclusão
- ✅ Identificação dos critérios que indicaram desinformação
- ✅ Indicação de fontes confiáveis para verificação independente
- ✅ Histórico de análises salvo por usuário no banco de dados
- ✅ Identificação de usuário por nome (suporte a múltiplos usuários)

---

## Arquitetura Geral

```
┌─────────────────────┐        POST /webhook/fakenews       ┌──────────────────────────┐
│                     │ ─────────────────────────────────► │                          │
│  Aurora Glamour UI  │                                     │    n8n Workflow (FakeAI) │
│  (Frontend React)   │ ◄───────────────────────────────── │                          │
│                     │         Resposta da análise         └──────────┬───────────────┘
└─────────────────────┘                                                │
                                                                       │ Persiste resultado
                                                                       ▼
                                                             ┌─────────────────────┐
                                                             │  PostgreSQL          │
                                                             │  tabela: fakeiadb    │
                                                             └─────────────────────┘
```

<img width="1408" height="768" alt="Workflowgeral" src="https://github.com/user-attachments/assets/c6b30201-7f69-47fd-9ac1-594aa30b9a41" />

---

## Fluxo do Workflow n8n

O workflow **FakeAI** recebe uma requisição HTTP POST e a processa de forma diferente conforme o tipo de conteúdo enviado. Abaixo está o fluxo detalhado:

### Visão Geral do Fluxo

```
Webhook (POST /fakenews)
        │
        ▼
      [If]  ── tipo === "imagem"? ──────────────────────────────────────┐
        │ NÃO                                                            │ SIM
        ▼                                                                ▼
[Code in JavaScript]                                             [Edit Fields]
  Detecta tipo                                                  Strip base64 prefix
  url / texto / imagem                                                   │
        │                                                                ▼
        ▼                                                       [Convert to File]
     [Switch]                                                   Converte para binário
      │       │                                                          │
   "url"    "texto"                                                      ▼
      │       │                                                  [Edit Fields1]
      ▼       │                                                  Preserva username
[HTTP Request] │                                                          │
 Jina.ai       │                                                          │
      │        │                                                          │
      ▼        │                                                          │
[Edit Fields2] │                                                          │
Preserva user  │                                                          │
      │        │                                                          │
      └────────┴──────────────────────────────────────────────────────┐  │
                                                                       │  │
                                                                       ▼  ▼
                                                                  [AI Agent]
                                                              GPT-4o-mini analisa
                                                                       │
                                                                       ▼
                                                          [Code in JavaScript1]
                                                          Extrai usuario/pergunta/resposta
                                                                       │
                                                                       ▼
                                                          [Insert rows in a table]
                                                          Salva no PostgreSQL
                                                                       │
                                                                       ▼
                                                          [Respond to Webhook]
                                                          Retorna análise ao frontend
```

<img width="1408" height="768" alt="Fluxon8n" src="https://github.com/user-attachments/assets/eb9d25ae-6cd1-4c85-aeb1-ed37f4748913" />

### Descrição de Cada Nó

| Nó | Tipo | Descrição |
|---|---|---|
| **Webhook** | Trigger | Recebe POST em `/fakenews` com os campos `username`, `texto` e `tipo` |
| **If** | Condição | Verifica se `body.tipo === "imagem"` para separar o fluxo de imagens |
| **Edit Fields** | Set | Remove o prefixo `data:image/png;base64,` da string base64 |
| **Convert to File** | Convert | Converte a string base64 em dado binário para envio ao modelo de IA |
| **Edit Fields1** | Set | Preserva o `username` junto com os dados binários da imagem |
| **Code in JavaScript** | Code | Detecta automaticamente o tipo de entrada (url, texto ou imagem base64) e prepara os dados |
| **Switch** | Router | Direciona para `HTTP Request` se for URL, ou direto ao `AI Agent` se for texto |
| **HTTP Request** | HTTP | Usa o serviço **Jina.ai** (`r.jina.ai`) para extrair o conteúdo textual da URL fornecida |
| **Edit Fields2** | Set | Preserva o `username` após a extração do conteúdo da URL |
| **AI Agent** | LangChain | Agente de IA com **GPT-4o-mini** que analisa o conteúdo e classifica a notícia |
| **Code in JavaScript1** | Code | Faz o parsing da resposta do modelo, extraindo os campos `usuario`, `pergunta` e `resposta` |
| **Insert rows in a table** | Postgres | Insere a análise na tabela `fakeiadb` do banco PostgreSQL |
| **Respond to Webhook** | Response | Devolve o campo `resposta` ao frontend com status HTTP 200 |

---

## Frontend — Aurora Glamour UI

A interface do usuário foi desenvolvida em **React** e tem como objetivo oferecer uma experiência simples e intuitiva para submissão de notícias e visualização dos resultados da análise.

### Funcionalidades da Interface

- Campo para entrada de texto, URL ou upload de imagem
- Seleção do tipo de conteúdo (texto / link / imagem)
- Identificação do usuário por username
- Exibição formatada do resultado da análise
- Indicação visual da classificação (REAL / SUSPEITA / FAKE NEWS)

### Comunicação com o Backend

O frontend envia uma requisição `POST` para o endpoint do webhook n8n:

**Endpoint:** `POST https://<sua-instancia-n8n>/webhook/fakenews`

**Payload esperado:**
```json
{
  "username": "nome_do_usuario",
  "texto": "conteúdo a ser analisado (texto, URL ou base64 de imagem)",
  "tipo": "texto | url | imagem",
  "nomeArquivo": "imagem.png",
  "mimeType": "image/png"
}
```

---

## Backend — Webhook n8n

### Endpoint

```
POST /webhook/fakenews
```

### Campos de Entrada

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `username` | string | Não | Identificador do usuário (padrão: "anonimo") |
| `texto` | string | Sim | Conteúdo a ser analisado (texto, URL ou base64) |
| `tipo` | string | Sim | Tipo do conteúdo: `texto`, `url` ou `imagem` |
| `nomeArquivo` | string | Só para imagem | Nome do arquivo de imagem |
| `mimeType` | string | Só para imagem | Tipo MIME da imagem (ex: `image/png`) |

### Processamento de URL

Quando o tipo é `url`, o workflow usa o serviço **Jina.ai Reader** (`https://r.jina.ai/`) para acessar a URL e extrair apenas o conteúdo principal da página (título, corpo, autor, data), descartando menus, anúncios e rodapés.

### Análise por IA

O **AI Agent** usa o modelo **GPT-4o-mini** da OpenAI com um prompt de sistema robusto baseado em metodologias IFCN, que guia o modelo através de **7 passos de raciocínio em cadeia (Chain-of-Thought)** antes de emitir qualquer classificação — detalhado na seção abaixo.

---

## Prompt do Agente de IA

O agente utiliza um prompt otimizado com as seguintes características:

- **Metodologia IFCN**: baseado nos padrões de apartidarismo, transparência de fontes e transparência metodológica das agências certificadas (Lupa, Aos Fatos, AFP Checamos)
- **Chain-of-Thought (7 passos)**: o modelo percorre extração da afirmação central → análise de linguagem → verificação de fontes → verificação factual → análise de domínio → pontuação de critérios → calibração de probabilidade — antes de emitir qualquer veredicto
- **Base de fontes explícita**: o modelo consulta mentalmente Agência Lupa, Aos Fatos, AFP Checamos, Boatos.org, G1 Fato ou Fake, Estadão Verifica, Reuters Fact Check, FactCheck.org, OMS, IBGE e portais `.gov.br`
- **Probabilidade calibrada**: independente da contagem de critérios, evitando falsos positivos mecânicos
- **Resposta estruturada e educativa**: formatada para ser clara e acessível ao usuário final

### Critérios de Análise (8 critérios)

| Código | Critério |
|---|---|
| C1 | Linguagem sensacionalista ou alarmista |
| C2 | Ausência de fontes identificáveis |
| C3 | Manipulação emocional explícita |
| C4 | Afirmações sem evidências verificáveis |
| C5 | Incoerência factual com dados conhecidos |
| C6 | Pedido de compartilhamento urgente |
| C7 | Domínio suspeito ou desconhecido |
| C8 | Padrão visual ou textual de montagem |

### Escala de Classificação

| Critérios Identificados | Classificação |
|---|---|
| 0 – 2 | ✅ REAL |
| 3 – 5 | ⚠️ SUSPEITA |
| 6 ou mais | ❌ FAKE NEWS |

---

## Banco de Dados

### Tabela: `fakeiadb` (schema: `public`)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | number | Chave primária (auto-gerada) |
| `usuario` | string | Nome do usuário que enviou a análise |
| `pergunta` | string | Conteúdo original enviado para verificação |
| `resposta` | string | Análise completa gerada pelo modelo de IA |
| `criado_em` | dateTime | Timestamp de criação do registro |

---

## Como Usar

### Pré-requisitos

- Node.js 18+
- Instância do n8n configurada e rodando
- Credenciais OpenAI configuradas no n8n
- Banco de dados PostgreSQL com a tabela `fakeiadb` criada
- Workflow `FakeAI` importado e **ativado** no n8n

### Criação da Tabela no PostgreSQL

```sql
CREATE TABLE public.fakeiadb (
  id SERIAL PRIMARY KEY,
  usuario VARCHAR(255),
  pergunta TEXT,
  resposta TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### Instalação do Frontend

```bash
# Clone o repositório
git clone https://github.com/TiagoStockmann/aurora-glamour-ui.git
cd aurora-glamour-ui

# Instale as dependências
npm install

# Configure a URL do webhook no arquivo de ambiente
# Crie um arquivo .env na raiz com:
VITE_WEBHOOK_URL=https://<sua-instancia-n8n>/webhook/fakenews

# Rode o projeto em modo de desenvolvimento
npm run dev
```

---

## Exemplo de Requisição

```bash
curl -X POST https://<sua-instancia-n8n>/webhook/fakenews \
  -H "Content-Type: application/json" \
  -d '{
    "username": "joao",
    "texto": "URGENTE! Governo vai confiscar poupanças nesta semana! Compartilhe antes que apaguem!",
    "tipo": "texto"
  }'
```

---

## Exemplo de Resposta

```
🔍 ANÁLISE FAKEAI

Usuário: joao

Fonte: Texto fornecido diretamente pelo usuário
Veículo identificado: Não identificado
Data de publicação: Não identificada
Tipo de conteúdo: TEXTO

Afirmação central analisada:
O texto afirma que o governo brasileiro irá confiscar poupanças "nesta semana",
pedindo compartilhamento urgente antes que a informação "seja apagada".

────────────────────────────────────────
🏷️ Classificação: FAKE NEWS ❌
📊 Probabilidade de ser falso: 97%
────────────────────────────────────────

Critérios identificados:
• [C1] Linguagem sensacionalista — uso de "URGENTE" em caixa alta, tom catastrófico
• [C2] Ausência de fontes — nenhuma fonte oficial, veículo ou documento citado
• [C3] Manipulação emocional — apelo ao medo financeiro com urgência artificial
• [C4] Sem evidências — afirmação grave sem qualquer dado, lei ou portaria
• [C6] Pedido de compartilhamento — "Compartilhe antes que apaguem!" é padrão clássico de desinformação

Trechos suspeitos no conteúdo:
"URGENTE! Governo vai confiscar poupanças nesta semana!"
"Compartilhe antes que apaguem!"

────────────────────────────────────────
Explicação:
O conteúdo apresenta cinco dos oito critérios clássicos de desinformação. A afirmação
sobre confisco de poupanças é uma narrativa recorrente em períodos de instabilidade
política e não possui respaldo em nenhuma medida legal vigente. A ausência total de
fontes, combinada com o apelo urgente ao compartilhamento antes que a informação
"suma", é um padrão deliberado para impedir que o leitor verifique a informação antes
de repassá-la.

────────────────────────────────────────
Como verificar você mesmo:
• Banco Central do Brasil: https://www.bcb.gov.br
• Aos Fatos: https://aosfatos.org
• Agência Lupa: https://lupa.uol.com.br
• G1 Fato ou Fake: https://g1.globo.com/fato-ou-fake

────────────────────────────────────────
Recomendação:
Não compartilhe esta mensagem. Consulte o Banco Central e as agências de
fact-checking antes de repassar qualquer informação sobre medidas econômicas.
```

---

## Problemas Identificados e Melhorias Sugeridas

### ⚠️ Problemas Identificados

**1. Memória de usuário sem recuperação**
O prompt do AI Agent menciona o uso de "memória anterior do usuário", mas o workflow **não recupera o histórico do banco de dados** antes de chamar a IA. Os registros são salvos no PostgreSQL, mas nunca são buscados e reinjetados no contexto da conversa, tornando a memória ineficaz.

**2. Duplicidade na detecção de imagem**
Existe uma lógica duplicada para imagens: o nó `If` detecta `tipo === "imagem"` e trata pelo caminho superior, mas o nó `Code in JavaScript` (caminho inferior) também detecta base64 de imagem. Se o campo `tipo` não for enviado como "imagem" mas o `texto` for um base64, pode haver conflito de rotas.

**3. Ausência de tratamento de erros**
Não há nós de erro configurados (`onError`) para os casos em que o Jina.ai esteja indisponível, a OpenAI retorne erro ou o banco de dados falhe. O workflow simplesmente quebraria sem devolver uma mensagem amigável ao usuário.

**4. Sem autenticação no webhook**
O endpoint `/webhook/fakenews` está aberto sem nenhum tipo de autenticação (token, API key ou Basic Auth), expondo o serviço a uso não autorizado e abuso.

### ✅ Melhorias Sugeridas

| Melhoria | Impacto | Prioridade |
|---|---|---|
| Adicionar nó de busca do histórico no Postgres antes do AI Agent | Alta — ativa a memória real por usuário | Alta |
| Adicionar tratamento de erro em todos os nós críticos | Alta — evita falhas silenciosas | Alta |
| Adicionar autenticação no webhook (header token) | Alta — segurança | Média |
| Consolidar a lógica de detecção de tipo em um único nó | Média — simplifica manutenção | Média |
| Adicionar rate limiting por usuário | Média — evita abuso | Média |
| Usar `gpt-4o` em vez de `gpt-4o-mini` para análises mais precisas | Melhora qualidade da análise | Baixa |
| Adicionar suporte a vídeo/áudio via transcrição | Expande capacidade | Baixa |

---

## Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| **Frontend** | React, JavaScript, Vite |
| **Orquestração** | n8n (workflow automation) |
| **Inteligência Artificial** | OpenAI GPT-4o-mini (via LangChain no n8n) |
| **Extração de conteúdo web** | Jina.ai Reader API |
| **Banco de Dados** | PostgreSQL |
| **Metodologia de fact-checking** | IFCN, Agência Lupa, Aos Fatos, AFP Checamos |
| **Comunicação** | REST API / Webhook HTTP POST |

---

## 👨‍💻 Autor

Desenvolvido por **Tiago Stockmann** como projeto acadêmico.

---

## 📄 Licença

Este projeto foi desenvolvido para fins educacionais.
