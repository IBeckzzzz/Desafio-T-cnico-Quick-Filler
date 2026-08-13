# Quick Filler

Aplicação web desenvolvida para o desafio técnico do **Quick Filler**, com foco em **extração, revisão e exportação de informações presentes em documentos PDF**.

A solução utiliza **Next.js, React, TypeScript, Material UI e Google Gemini** para transformar documentos com layouts diferentes em uma estrutura dinâmica que pode ser revisada pelo usuário e exportada para Excel.

## Objetivo

O objetivo do Quick Filler é permitir que o usuário:

1. envie um PDF;
2. informe o tipo do documento;
3. aguarde a extração assistida por IA;
4. revise e corrija os dados encontrados;
5. salve as alterações;
6. gere uma planilha `.xlsx` com os dados revisados.

A solução foi pensada para não depender de um único template. Em vez de assumir campos fixos como `nome`, `cpf`, `salario` ou `horasTrabalhadas`, a aplicação trabalha com uma estrutura dinâmica de **páginas, metadados, seções, colunas e linhas**.

---

## Funcionalidades

### Upload de documentos

- seleção de arquivos PDF;
- suporte a arrastar e soltar;
- validação do formato PDF;
- escolha entre **Holerite** e **Cartão de ponto**;
- feedback visual durante o processamento;
- tela de carregamento enquanto a Gemini processa o documento.

### Extração assistida por IA

O PDF é enviado integralmente para a API da Gemini. A IA analisa todas as páginas e retorna os dados em JSON estruturado.

A estrutura principal utilizada atualmente é:

```text
DynamicDocument
├── document_type
├── layout_name
└── pages[]
    ├── page
    ├── metadata[]
    │   ├── label
    │   └── value
    └── sections[]
        ├── name
        ├── columns[]
        └── rows[]
```

Essa abordagem permite trabalhar com documentos visualmente diferentes sem criar um schema específico para cada empresa.

### Revisão de holerite

A tela de revisão do holerite permite:

- visualizar o PDF original;
- visualizar metadados extraídos;
- visualizar as seções encontradas pela IA;
- editar os valores diretamente na interface;
- salvar as alterações;
- exportar os dados revisados para Excel.

### Revisão de cartão de ponto

A tela de revisão do cartão de ponto segue a mesma linguagem visual do holerite, porém trabalha com a estrutura encontrada especificamente no documento.

Exemplo de colunas que podem ser identificadas:

```text
DIAS
MANHÃ Entrada
MANHÃ Saída
TARDE Entrada
TARDE Saída
EXTRA Entrada
EXTRA Saída
Horas Extras
```

As colunas não são fixadas no código: elas são obtidas da estrutura devolvida pela IA.

### Exportação para Excel

O serviço de exportação transforma os dados estruturados em um arquivo `.xlsx` utilizando a biblioteca `xlsx`.

A planilha possui, conforme a estrutura disponível:

- aba de resumo;
- aba consolidada dos dados;
- abas individuais por página;
- colunas identificadas no PDF;
- valores editados pelo usuário na Review.

O endpoint utilizado para gerar a planilha é:

```text
GET /api/transcricoes/:id/planilha
```

---

# Arquitetura

A aplicação foi organizada em camadas para separar interface, API, processamento de IA, persistência e exportação.

```text
src/
├── app/
│   ├── api/
│   │   ├── transcricoes/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── planilha/
│   │   │           └── route.ts
│   │   └── uploads/
│   ├── review/
│   │   └── page.tsx
│   └── page.tsx
│
├── components/
│   ├── upload/
│   │   └── UploadCard.tsx
│   └── review/
│       ├── PayslipReview.tsx
│       └── TimesheetReview.tsx
│
├── services/
│   ├── ai/
│   │   └── processDocument.ts
│   └── excel/
│       └── excelService.ts
│
└── lib/
    └── transcriptions.ts
```

## Fluxo da aplicação

```text
Usuário
   │
   ▼
UploadCard
   │
   ▼
POST /api/transcricoes
   │
   ▼
processDocument.ts
   │
   ▼
Google Gemini
   │
   ▼
DynamicDocument
   │
   ▼
Persistência da transcrição
   │
   ▼
/review?id=...
   │
   ├──────────────────┐
   ▼                  ▼
PayslipReview     TimesheetReview
   │                  │
   └────────┬─────────┘
            ▼
PUT /api/transcricoes/:id
            │
            ▼
GET /api/transcricoes/:id/planilha
            │
            ▼
excelService.ts
            │
            ▼
Arquivo XLSX
```

---

# API

## `POST /api/transcricoes`

Recebe o PDF e o tipo selecionado.

Responsabilidades:

- validar o arquivo;
- salvar o PDF;
- executar o processamento pela Gemini;
- criar o ID da transcrição;
- persistir os dados;
- retornar o identificador utilizado pela Review.

## `GET /api/transcricoes/:id`

Recupera uma transcrição existente para a tela de revisão.

## `PUT /api/transcricoes/:id`

Salva as alterações realizadas pelo usuário.

O contrato atual utiliza:

```json
{
  "value": {
    "document_type": "cartao-ponto",
    "layout_name": "...",
    "pages": []
  }
}
```

O backend mantém `dados` apenas como compatibilidade com partes antigas da aplicação.

## `GET /api/transcricoes/:id/planilha`

Gera o arquivo XLSX utilizando os dados atualmente armazenados da transcrição.

---

# Modelo de dados

Um documento processado segue conceitualmente esta estrutura:

```json
{
  "document_type": "holerite",
  "layout_name": "ficha_financeira",
  "pages": [
    {
      "page": 1,
      "metadata": [
        {
          "label": "CARGO",
          "value": "MOTORISTA GRANEL"
        }
      ],
      "sections": [
        {
          "name": "Folha Normal - Mês: abr-17",
          "columns": [
            "Rendimentos - Descrição",
            "Rendimentos - Qtde",
            "Rendimentos - Valor",
            "Descontos - Descrição",
            "Descontos - Qtde",
            "Descontos - Valor",
            "Resultados - Descrição",
            "Resultados - Valor"
          ],
          "rows": []
        }
      ]
    }
  ]
}
```

Esse modelo permite representar tanto documentos simples quanto fichas financeiras com várias páginas e competências diferentes.

---

# Persistência

Durante o desenvolvimento inicial, as transcrições eram mantidas em um `Map` em memória. Essa abordagem foi substituída por persistência local em arquivo para que a Review consiga recuperar a transcrição criada pelo upload.

O armazenamento atual é:

```text
data/transcriptions.json
```

A camada responsável é:

```text
src/lib/transcriptions.ts
```

### Limitação

Essa persistência em JSON é adequada para o desafio e para desenvolvimento local, mas **não é a solução ideal para produção**. Em um ambiente real, o próximo passo seria utilizar um banco de dados ou outro mecanismo de armazenamento persistente e compartilhado.

---

# Tecnologias

- **Next.js**
- **React**
- **TypeScript**
- **Material UI (MUI)**
- **Google Gemini API**
- **@google/genai**
- **xlsx**
- **PDF no navegador por iframe**

---

# Como executar localmente

## Pré-requisitos

- Node.js instalado;
- npm, yarn, pnpm ou bun;
- uma chave da API Gemini.

## Instalação

Com pnpm:

```bash
pnpm install
```

Caso a biblioteca de Excel ainda não esteja instalada:

```bash
pnpm add xlsx
```

Também é possível utilizar npm:

```bash
npm install
```

## Variável de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
GEMINI_API_KEY=sua_chave_aqui
```

Não publique essa chave no repositório.

## Iniciar o servidor

Com pnpm:

```bash
pnpm dev
```

Ou:

```bash
npm run dev
```

A aplicação ficará disponível em:

```text
http://localhost:3000
```

---

# Tratamento de erros da Gemini

A integração depende de um serviço externo e pode apresentar falhas transitórias, como `429` e `503`.

A aplicação deve tratar essas situações com retry/backoff para reduzir falhas ocasionais causadas por limite de requisições ou indisponibilidade temporária do provedor.

Mesmo com retry, a disponibilidade da API da Gemini continua sendo uma dependência externa da aplicação.

---

# Decisões técnicas

## Estrutura dinâmica em vez de schema fixo

A principal decisão arquitetural foi abandonar um schema com campos fixos e utilizar:

```text
pages → metadata → sections → columns → rows
```

A vantagem é permitir documentos de empresas diferentes sem precisar criar um novo conjunto de campos para cada template.

## Duas telas de Review

Foram mantidas duas telas:

- `PayslipReview`
- `TimesheetReview`

Apesar de utilizarem o mesmo padrão visual e a mesma estrutura de dados, os dois documentos possuem necessidades diferentes de revisão.

## Exportação baseada na estrutura extraída

O Excel é criado a partir das `columns` e `rows` encontradas no PDF, em vez de depender de um conjunto de campos fixo.

Isso permite que o exportador acompanhe diferentes layouts de documentos.

---

# Bônus do desafio

## Rastreabilidade visual

**Status: não implementado.**

A aplicação apresenta o PDF original ao lado dos dados extraídos, mas ainda não transporta coordenadas de texto/OCR por todo o pipeline para destacar no documento a origem exata da célula selecionada.

## Detecção automática do tipo

**Status: parcialmente implementado.**

O modelo dinâmico possui `document_type`, mas o fluxo atual ainda utiliza o tipo informado pelo usuário para direcionar o processamento e a tela de revisão.

Uma evolução seria permitir que a própria IA classificasse o documento antes da etapa de revisão.

## Ficha financeira

**Status: parcialmente implementado.**

A estrutura dinâmica suporta fichas financeiras com várias páginas e competências mensais.

O `payroll-01.pdf`, por exemplo, foi identificado como uma **ficha financeira**, com diversas competências e grupos de **Rendimentos, Descontos e Resultados**.

A regra específica pedida pelo desafio para transformar uma ficha anual em uma entrada por mês, compartilhando o mesmo `page` e ignorando a coluna `Total`, ainda não foi implementada como uma regra especializada.

## Layout desconhecido

**Status: parcialmente implementado.**

A arquitetura dinâmica permite representar layouts não previstos anteriormente.

Ainda falta uma camada explícita de confiança/validação para diferenciar:

```text
"consegui extrair"
```

de:

```text
"não tenho confiança suficiente para interpretar este documento"
```

A evolução recomendada é rejeitar ou sinalizar documentos de baixa confiança em vez de apresentar dados potencialmente incorretos como válidos.

---

# Uso de IA no desenvolvimento

O desafio permite explicitamente o uso de agentes e assistentes de IA. A solução foi desenvolvida com apoio de ferramentas de IA para implementação, depuração, revisão de código e decisões de interface.

O processo está documentado separadamente em:

- [`PROCESSO.md`](./PROCESSO.md)

O arquivo registra:

- ferramentas utilizadas e suas finalidades;
- erros e caminhos que precisaram ser corrigidos;
- trechos reescritos manualmente e os motivos;
- decisões técnicas em que havia mais de uma alternativa razoável;
- o que provavelmente quebraria primeiro em produção;
- pontos da solução nos quais ainda existe incerteza.

As decisões técnicas e funcionalidades que ficaram de fora também estão detalhadas em:

- [`SOLUCAO.md`](./SOLUCAO.md)

---

# Entregáveis do desafio

A entrega final deve conter:

1. **Link do repositório**;
2. **URL da aplicação publicada**;
3. [`SOLUCAO.md`](./SOLUCAO.md);
4. [`PROCESSO.md`](./PROCESSO.md);
5. planilhas geradas a partir dos PDFs disponíveis em `exemplos/`.

Os itens de número 1 e 2 devem ser preenchidos quando o repositório e a aplicação estiverem publicados.

---

# Estrutura esperada da entrega

```text
quick-filler/
├── src/
├── public/
├── exemplos/
├── data/
├── .env.local
├── README.md
├── SOLUCAO.md
├── PROCESSO.md
├── package.json
└── ...
```

> **Importante:** `.env.local` contém a chave da Gemini e não deve ser versionado.

---

# Status atual

A aplicação possui o fluxo principal implementado:

```text
PDF
 ↓
Upload
 ↓
Gemini
 ↓
Extração dinâmica
 ↓
Review de holerite / ponto
 ↓
Edição
 ↓
Salvar
 ↓
Exportação XLSX
```

Os bônus foram documentados individualmente neste README para deixar explícito o que está implementado, parcialmente implementado e o que ainda seria necessário desenvolver.

---

# Licença e propriedade

A solução foi desenvolvida para o desafio técnico e pode ser publicada, reaproveitada e utilizada pelo autor da entrega, conforme as condições estabelecidas no enunciado do processo seletivo.

Os materiais fornecidos pelo desafio seguem as condições de licença definidas pelo repositório original.
