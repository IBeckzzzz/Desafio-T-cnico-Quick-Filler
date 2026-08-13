# SOLUCAO.md

## Como rodar

### Requisitos

- Node.js;
- pnpm ou npm;
- uma chave da API Gemini;
- acesso a um projeto Vercel;
- Vercel Blob privado conectado ao projeto.

### Instalar dependências

Com pnpm:

```bash
pnpm install
```

Ou com npm:

```bash
npm install
```

A instalação normal já deve instalar as dependências registradas no `package.json`, incluindo:

- `@google/genai`;
- `@vercel/blob`;
- `xlsx`.

Não é necessário instalar `xlsx` ou `@vercel/blob` manualmente após um clone limpo do projeto.

### Configuração local

A aplicação utiliza a API Gemini e o Vercel Blob.

No ambiente local, faça login e conecte o projeto à Vercel:

```bash
vercel login
vercel link
vercel env pull .env.local
```

O `.env.local` deve conter, entre outras variáveis necessárias ao ambiente, a chave:

```env
GEMINI_API_KEY=sua_chave_aqui
```

**Nunca versione ou publique `.env.local`.**

Como os PDFs e as transcrições agora são armazenados no Vercel Blob, o desenvolvimento local precisa ter acesso às variáveis/credenciais de desenvolvimento do projeto conectado à Vercel.

### Executar

```bash
pnpm dev
```

Ou:

```bash
npm run dev
```

Aplicação:

```text
http://localhost:3000
```

### Validar o build

Antes de publicar:

```bash
pnpm build
```

O build valida a compilação, o TypeScript e o prerender das páginas.

---

## Deploy na Vercel

A aplicação está preparada para produção na Vercel.

### Configuração necessária

1. Importar o repositório do GitHub na Vercel.
2. Configurar `GEMINI_API_KEY` em **Project Settings → Environment Variables**.
3. Conectar/criar um **Vercel Blob privado** para o projeto.
4. Garantir que as variáveis necessárias estejam disponíveis no ambiente de produção.
5. Publicar a branch `main`.

### Persistência em produção

A aplicação não utiliza mais:

```text
uploads/
data/transcriptions.json
```

como armazenamento persistente.

O fluxo atual utiliza:

```text
PDF
 ↓
Vercel Blob privado
 ↓
processamento pela Gemini
 ↓
transcrição em JSON
 ↓
Vercel Blob privado
```

Os PDFs mantêm um `pdfPath` associado à transcrição para que a Review consiga recuperar o documento original.

O filesystem local da Function pode ser usado apenas para arquivos temporários durante uma execução, quando necessário; ele não é tratado como armazenamento permanente.

---

## Decisões técnicas

### 1. Extração dinâmica

A resposta da IA foi modelada como:

```text
DynamicDocument
├── document_type
├── layout_name
└── pages[]
    ├── metadata[]
    └── sections[]
        ├── columns[]
        └── rows[]
```

A estrutura foi escolhida para atender documentos com layouts diferentes sem depender de uma lista fechada de campos.

Em vez de assumir campos fixos como `nome`, `cpf`, `salario` ou `horasTrabalhadas`, o sistema representa o conteúdo encontrado no documento como páginas, metadados, seções, colunas e linhas.

### 2. Separação entre Review de holerite e ponto

Foram mantidos:

```text
PayslipReview.tsx
TimesheetReview.tsx
```

Os dois componentes usam a mesma linguagem visual, mas possuem páginas específicas para a semântica de cada documento.

### 3. Contrato de API

O formato atual de atualização é:

```json
{
  "value": {}
}
```

Esse formato substitui o contrato antigo baseado em `dados` como campo obrigatório do request.

O backend ainda pode aceitar `dados` como fallback de compatibilidade, mas o contrato principal é `value`.

### 4. Geração do Excel

O Excel é gerado a partir do documento dinâmico, utilizando:

- resumo;
- dados consolidados;
- uma aba por página;
- colunas encontradas nas seções;
- valores corrigidos pelo usuário na Review.

Endpoint:

```text
GET /api/transcricoes/:id/planilha
```

A geração é feita pelo `excelService.ts` e retorna um arquivo `.xlsx`.

### 5. Persistência

A persistência final utiliza **Vercel Blob privado**.

Os PDFs são armazenados em objetos do Blob e as transcrições são armazenadas como JSON.

Estrutura conceitual:

```text
Vercel Blob
├── uploads/
│   └── <arquivo>.pdf
└── transcriptions/
    └── <id>.json
```

A camada responsável é:

```text
src/lib/transcriptions.ts
```

A escolha foi feita para permitir que a aplicação funcione no ambiente serverless da Vercel sem depender do filesystem local da Function.

### 6. Recuperação do PDF por ID da transcrição

A Review não depende apenas do nome do arquivo para localizar o documento original.

O fluxo utiliza:

```text
ID da transcrição
 ↓
getTranscription()
 ↓
pdfPath
 ↓
Vercel Blob
 ↓
PDF
```

Isso reduz o risco de colisão ou inconsistência entre nome de arquivo e objeto armazenado.

---

## Arquitetura de rotas

### `POST /api/transcricoes`

Recebe o PDF e o tipo selecionado.

Responsabilidades:

```text
validar arquivo
↓
armazenar PDF no Vercel Blob
↓
preparar/processar o PDF
↓
Gemini
↓
criar ID
↓
persistir transcrição
↓
retornar resultado
```

### `GET /api/transcricoes/:id`

Recupera a transcrição armazenada para a tela de Review.

### `PUT /api/transcricoes/:id`

Salva as alterações feitas na Review.

Corpo principal:

```json
{
  "value": {
    "document_type": "...",
    "layout_name": "...",
    "pages": []
  }
}
```

### `GET /api/uploads/:id`

Recupera o PDF original associado à transcrição.

O endpoint consulta a transcrição, obtém o `pdfPath` e então busca o objeto correspondente no Vercel Blob.

### `GET /api/transcricoes/:id/planilha`

Gera e retorna o XLSX utilizando os dados atualmente armazenados.

---

## Fluxo da solução

```text
Usuário
   ↓
UploadCard
   ↓
POST /api/transcricoes
   ↓
Vercel Blob
   ↓
processDocument.ts
   ↓
Google Gemini
   ↓
DynamicDocument
   ↓
Vercel Blob
   ↓
/review?id=...
   ↓
PayslipReview / TimesheetReview
   ↓
PUT /api/transcricoes/:id
   ↓
GET /api/transcricoes/:id/planilha
   ↓
excelService.ts
   ↓
XLSX
```

---

## O que ficou de fora

### Rastreabilidade visual

Não implementada.

Para implementá-la corretamente seria necessário manter coordenadas ou segmentos encontrados no PDF durante o pipeline e associá-los às células da estrutura dinâmica.

O estado atual mostra o PDF original ao lado da Review, mas não permite clicar em uma célula e destacar automaticamente sua origem exata no documento.

### Detecção automática de tipo

Não implementada como fluxo principal.

O usuário ainda seleciona o tipo do documento no upload. O modelo dinâmico possui `document_type`, mas essa informação não substitui completamente a seleção atual.

### Ficha financeira especial

A estrutura dinâmica suporta fichas financeiras com múltiplas páginas e competências.

Entretanto, a regra adicional do bônus para transformar uma ficha anual em uma entrada por mês, compartilhando o mesmo `page` e ignorando a coluna `Total`, ainda não foi implementada como uma transformação especializada.

### Layout desconhecido com confiança

Ainda não existe uma camada formal de confidence score capaz de decidir automaticamente entre:

```text
documento interpretado com confiança
```

e:

```text
não sei ler este documento
```

Uma evolução seria validar a estrutura extraída e rejeitar ou sinalizar documentos com baixa confiança antes da exportação.

---

## Dados de exemplo

A solução consegue representar documentos como o `payroll-01.pdf`, identificado como uma ficha financeira com múltiplas competências e grupos de Rendimentos, Descontos e Resultados.

O modelo dinâmico permite representar esse conteúdo sem criar um schema específico para cada competência ou empresa.

---

## Riscos conhecidos

- dependência da disponibilidade e dos limites da Gemini;
- variação da qualidade da extração conforme o PDF;
- ausência de rastreabilidade célula → origem no PDF;
- ausência de um confidence score formal;
- ausência de um banco relacional para histórico, usuários, auditoria e consultas;
- necessidade futura de controles de concorrência caso o volume de usuários cresça;
- necessidade de observabilidade mais completa para um ambiente de produção em escala.

---

## Estado atual

O fluxo principal está implementado:

```text
PDF
 ↓
Upload
 ↓
Vercel Blob
 ↓
Gemini
 ↓
Extração dinâmica
 ↓
Persistência da transcrição
 ↓
Review de holerite / cartão de ponto
 ↓
Edição
 ↓
Salvar
 ↓
Exportação XLSX
```

A aplicação está publicada na Vercel e utiliza o Vercel Blob privado como armazenamento persistente.

O projeto foi estruturado para que novos layouts possam ser representados pela mesma estrutura dinâmica, sem obrigar a criação de um schema de campos fixos para cada empresa.

---

## Referências da entrega

### Repositório

```text
https://github.com/IBeckzzzz/Desafio-T-cnico-Quick-Filler
```

### Aplicação publicada

```text
https://desafio-t-cnico-quick-filler.vercel.app/
```

### Documentação complementar

```text
PROCESSO.md
README.md
SOLUCAO.md
```
