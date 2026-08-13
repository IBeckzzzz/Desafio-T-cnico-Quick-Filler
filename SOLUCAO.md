# SOLUCAO.md

## Como rodar

### Requisitos

- Node.js
- pnpm ou npm
- chave da API Gemini

### Instalar dependências

```bash
pnpm install
```

Dependência de geração de Excel:

```bash
pnpm add xlsx
```

### Configuração

`.env.local`:

```env
GEMINI_API_KEY=sua_chave_aqui
```

### Executar

```bash
pnpm dev
```

Aplicação:

```text
http://localhost:3000
```

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

Isso substitui o contrato antigo baseado em `dados` como campo obrigatório do request.

### 4. Geração do Excel

O Excel é gerado a partir do documento dinâmico, utilizando:

- resumo;
- dados consolidados;
- uma aba por página.

As colunas são exatamente as colunas encontradas na seção.

### 5. Persistência

Foi adotado armazenamento local em `data/transcriptions.json` para o desafio.

---

## O que ficou de fora

### Rastreabilidade visual

Não implementada.

Para implementá-la corretamente seria necessário manter as coordenadas/segmentos encontrados no PDF durante o pipeline e associá-los às células da estrutura dinâmica.

### Detecção automática de tipo

Não implementada como fluxo principal. O usuário ainda seleciona o tipo do documento.

### Ficha financeira especial

A estrutura dinâmica suporta a ficha financeira e seus múltiplos meses, mas a regra adicional do bônus para consolidar cada mês em uma entrada específica e ignorar a coluna `Total` ainda não está implementada.

### Layout desconhecido com confiança

Ainda não existe uma camada formal de confidence score capaz de dizer automaticamente:

```text
não sei ler este documento
```

antes de exportar uma extração de baixa qualidade.

---

## Arquitetura de rotas

```text
POST /api/transcricoes
```

Processa PDF e cria transcrição.

```text
GET /api/transcricoes/:id
```

Recupera transcrição.

```text
PUT /api/transcricoes/:id
```

Salva alterações.

```text
GET /api/transcricoes/:id/planilha
```

Gera e retorna XLSX.

---

## Dados de exemplo

A solução consegue representar uma ficha financeira como o `payroll-01.pdf`, em que a Gemini identificou o layout como `ficha_financeira`, diferentes competências mensais e as três grandes categorias de informações: Rendimentos, Descontos e Resultados. fileciteturn46file0L15-L23

---

## Riscos conhecidos

- dependência de disponibilidade e limites da Gemini;
- armazenamento local inadequado para múltiplas instâncias;
- ausência de rastreabilidade visual;
- OCR/extração suscetível a PDFs de baixa qualidade;
- necessidade de melhorar regras de validação e confiança da extração.
