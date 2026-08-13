# PROCESSO.md

## Uso de IA

Usei agentes e assistentes de IA como parte do processo de desenvolvimento, principalmente para:

- estruturar e revisar componentes React/Next.js;
- diagnosticar erros de compilação, runtime e deploy;
- revisar a integração com a API Gemini;
- definir e evoluir o modelo dinâmico de extração;
- estruturar o serviço de geração de Excel;
- revisar os contratos entre upload, review, persistência e exportação;
- adaptar o armazenamento para o ambiente de produção da Vercel;
- revisar a interface visual das telas de upload, processamento e revisão.

O código não foi tratado como uma simples cópia das respostas do agente. O processo envolveu executar a aplicação, observar os logs, testar PDFs diferentes, comparar o comportamento com os documentos e corrigir decisões que não se provaram adequadas.

Um ponto importante foi a diferença entre o ambiente local e o ambiente de produção. Durante o desenvolvimento, algumas decisões funcionaram localmente, mas falharam na Vercel por causa das características do filesystem e do modelo de execução serverless. Isso levou à adoção do Vercel Blob para persistência dos PDFs e das transcrições.

---

## Ferramentas utilizadas e para quê

### Agentes/assistentes de IA

Usados para:

- geração inicial de código;
- análise de erros;
- sugestões de arquitetura;
- revisão de componentes;
- elaboração de integrações com Gemini, Vercel Blob e Excel;
- apoio na depuração de problemas de build e deploy.

### VS Code

Usado para:

- edição dos arquivos;
- execução e inspeção do projeto;
- leitura dos erros do Next.js/Turbopack;
- revisão de componentes;
- execução dos comandos de build.

### Terminal / PowerShell / Git Bash

Usados para:

- instalar dependências;
- executar o projeto;
- executar `pnpm build`;
- pesquisar ocorrências de código antigo;
- inspecionar logs;
- versionar e publicar alterações no GitHub.

### Vercel

Usada para:

- deploy da aplicação;
- execução do ambiente de produção;
- configuração de variáveis de ambiente;
- hospedagem do projeto;
- armazenamento persistente dos PDFs e transcrições com Vercel Blob.

### Google Gemini

Usado como mecanismo de extração e estruturação dos PDFs.

### Vercel Blob

Usado para persistir:

- os PDFs enviados;
- os JSONs das transcrições.

A adoção do Blob ocorreu porque o filesystem das Functions da Vercel não deve ser usado como armazenamento persistente de produção.

### PDF viewer do navegador

Usado para manter o documento original visível enquanto os dados extraídos eram revisados e corrigidos.

---

## Pontos em que o agente errou ou tomou o caminho errado

### 1. Dependência excessiva de um schema fixo

No início, a aplicação trabalhava com campos fixos como `nome`, `cpf`, `matricula`, `salario`, `eventos` e `marcacoes`.

Isso funcionava para um modelo específico, mas falhava quando o documento de outra empresa tinha estrutura diferente.

O problema foi percebido ao testar documentos com layouts diferentes e observar que o cartão de ponto podia acabar recebendo campos de holerite ou que a resposta da IA não correspondia ao componente de Review.

A solução foi mudar o modelo para uma estrutura dinâmica:

```text
pages -> metadata -> sections -> columns -> rows
```

---

### 2. Alterar o frontend sem alinhar o contrato da API

Em alguns momentos, o frontend passou a enviar:

```json
{
  "value": { ... }
}
```

enquanto o backend ainda esperava:

```json
{
  "dados": { ... }
}
```

Isso causou o erro:

```text
O campo 'dados' é obrigatório.
```

O diagnóstico veio da inspeção dos logs e da busca pela mensagem no próprio código.

A correção foi unificar o contrato em `value`, mantendo `dados` somente como fallback de compatibilidade.

---

### 3. Usar armazenamento somente em memória

A primeira implementação guardava as transcrições em:

```ts
new Map<string, TranscriptionData>()
```

Isso funcionou durante alguns testes, mas falhou no fluxo em que o POST salvava a transcrição e o GET seguinte da Review retornava:

```text
Transcrição não encontrada.
```

A causa era o caráter temporário do estado em memória.

Primeiro foi utilizada persistência local em JSON para resolver o problema no desenvolvimento. Depois, ao publicar na Vercel, essa abordagem também se mostrou inadequada como persistência de produção.

A solução final foi migrar a persistência para o Vercel Blob.

---

### 4. Usar o filesystem local como armazenamento de produção

Depois da publicação na Vercel, o upload começou a falhar com:

```text
EROFS: read-only file system
```

ao tentar gravar o PDF em:

```text
/var/task/uploads/
```

Isso mostrou que a arquitetura local não poderia ser utilizada como armazenamento persistente na Vercel.

A solução foi separar:

```text
armazenamento persistente
→ Vercel Blob

arquivo temporário durante processamento
→ /tmp
```

Depois o endpoint de leitura do PDF também foi alterado para recuperar o documento pelo `pdfPath` armazenado na transcrição.

---

### 5. O Excel inicialmente recebia o objeto em vez da planilha estruturada

Em um teste, o arquivo aberto no Google Sheets continha o objeto JSON inteiro em uma linha.

O diagnóstico foi feito observando o arquivo gerado e comparando o endpoint chamado pelo botão de download.

O fluxo foi separado em:

```text
PUT /api/transcricoes/:id
GET /api/transcricoes/:id/planilha
```

com o segundo endpoint retornando o XLSX gerado pelo `excelService`.

---

### 6. Problemas específicos de produção no Next.js

Durante o deploy surgiram problemas que não apareciam da mesma forma durante o desenvolvimento local, entre eles:

- `useSearchParams()` exigindo um limite de `Suspense` para o prerender da rota `/review`;
- navegação interna com `window.location.href` sendo sinalizada pelo lint;
- incompatibilidade de `Buffer` com `Response` no build de produção;
- necessidade de tratar `getTranscription()` como função assíncrona após a migração para o Blob;
- conflito entre rotas dinâmicas `/api/uploads/[file]` e `/api/uploads/[id]`.

Esses problemas foram identificados principalmente pelos logs de build da Vercel e corrigidos individualmente antes da publicação.

---

## 3 decisões com mais de uma resposta razoável

### Decisão 1 — Schema fixo ou estrutura dinâmica

**Alternativas:**

- manter um schema fixo para holerite e ponto;
- criar schemas específicos por empresa/template;
- usar uma estrutura dinâmica baseada em páginas, metadados e tabelas.

**Escolha:** estrutura dinâmica.

**Por quê:** o desafio envolve documentos de empresas e templates diferentes. Um modelo dinâmico reduz o acoplamento com um layout específico e permite que o mesmo pipeline represente tabelas novas sem alterar o contrato principal a cada empresa.

---

### Decisão 2 — Um único componente de Review ou dois componentes

**Alternativas:**

- um componente genérico;
- dois componentes com a mesma linguagem visual;
- componentes totalmente independentes.

**Escolha:** `PayslipReview` e `TimesheetReview`, compartilhando o mesmo padrão visual.

**Por quê:** holerite e cartão de ponto possuem necessidades diferentes de revisão. Separar os componentes deixa a lógica específica mais clara, sem abrir mão de uma experiência visual consistente.

---

### Decisão 3 — Persistência local ou armazenamento externo

**Alternativas:**

- `Map` em memória;
- arquivo JSON local;
- banco de dados;
- armazenamento de objetos.

**Escolha:** Vercel Blob privado.

**Por quê:** a aplicação precisava armazenar tanto o PDF original quanto o JSON da transcrição em um ambiente de produção serverless. O Blob atende diretamente esse caso sem depender do filesystem da Function. Também mantém o PDF em armazenamento privado, o que é importante para documentos de RH.

---

### Decisão 4 — PDF por nome de arquivo ou por ID da transcrição

**Alternativas:**

- `/api/uploads/:file`;
- `/api/uploads/:id`.

**Escolha:** recuperar o PDF pelo ID da transcrição e pelo `pdfPath` salvo no registro.

**Por quê:** o ID é único e permite localizar exatamente o objeto armazenado. Isso evita problemas de colisão de nomes, alterações de nome e inconsistências entre o nome exibido na interface e o caminho real no Blob.

---

## O que quebra primeiro em produção?

A primeira fragilidade relevante continua sendo a **dependência da IA para a extração**.

### Gemini

Erros transitórios como `503 UNAVAILABLE` e limites como `429` podem impedir uma extração mesmo com o restante da aplicação funcionando.

Em uma evolução de produção, isso precisa de:

- retry/backoff consistente;
- observabilidade;
- limites de tamanho e tempo;
- tratamento de falhas;
- possível fallback de modelo;
- controle de custo e volume.

### Qualidade da extração

Mesmo quando a API responde corretamente, a qualidade do conteúdo extraído pode variar conforme:

- qualidade do PDF;
- digitalização;
- estrutura da tabela;
- layout não conhecido;
- informações ambíguas ou pouco legíveis.

Uma camada formal de confiança ainda seria importante para diferenciar "extração concluída" de "extração confiável".

### Persistência e escala

O Vercel Blob resolve a persistência de arquivos e JSONs para o cenário atual, mas a aplicação ainda não possui uma camada completa de banco de dados relacional para consultas, histórico, autenticação, multiusuário ou auditoria.

Caso o produto evolua para esses cenários, um banco de dados e uma modelagem de domínio mais completa seriam necessários.

---

## Onde não confio no que entreguei?

Não considero a solução totalmente confiável nestes pontos:

1. **Precisão semântica em qualquer layout possível.** A estrutura dinâmica permite representar muitos layouts, mas não garante que a IA interprete todos os valores corretamente.
2. **Reconhecimento automático do tipo.** O fluxo ainda parte do tipo selecionado pelo usuário; o `document_type` é produzido no modelo, mas não substitui totalmente essa seleção no fluxo atual.
3. **Rastreabilidade célula → origem no PDF.** A aplicação apresenta o PDF original ao lado dos dados, mas ainda não transporta coordenadas de texto/OCR por todo o pipeline.
4. **Regras especializadas para fichas financeiras.** A estrutura dinâmica representa múltiplas competências, mas a regra específica do bônus para transformar cada mês em uma entrada padronizada ainda não foi implementada como uma transformação dedicada.
5. **Detecção formal de layout desconhecido.** A solução consegue representar layouts novos, mas ainda falta uma camada explícita de confiança para dizer "não sei ler este documento" em vez de retornar dados possivelmente incorretos.

---

## Como percebi os problemas

A principal ferramenta de validação foi o comportamento real da aplicação:

- logs HTTP do Next.js;
- mensagens do Turbopack;
- erros no console do navegador;
- mensagens de build da Vercel;
- comparação entre o PDF original e os dados exibidos;
- testes de salvar e baixar Excel;
- busca de strings antigas no código;
- testes locais com `pnpm build`;
- testes da aplicação publicada.

Isso foi importante porque vários erros não eram evidentes apenas lendo o código.

Alguns exemplos foram:

```text
POST /api/transcricoes
→ Gemini
→ 503

POST /api/transcricoes
→ /var/task/uploads
→ EROFS

GET /api/transcricoes/:id
→ transcrição não encontrada

GET /api/uploads/:id
→ arquivo não encontrado

GET /api/transcricoes/:id/planilha
→ Buffer incompatível com Response
```

Os problemas foram usados como feedback para ajustar o contrato entre as camadas e, posteriormente, adaptar a aplicação para o ambiente de produção da Vercel.

---

## Estado final da arquitetura

O fluxo final ficou:

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

A principal evolução arquitetural durante o processo foi sair de uma persistência local/in-memory, adequada apenas para testes iniciais, para uma persistência baseada em Vercel Blob compatível com o ambiente publicado.
