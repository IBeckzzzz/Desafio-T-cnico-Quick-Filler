# PROCESSO.md

## Uso de IA

Usei agentes e assistentes de IA como parte do processo de desenvolvimento, principalmente para:

- estruturar e revisar componentes React/Next.js;
- diagnosticar erros de compilação e runtime;
- revisar integração com a API Gemini;
- trabalhar no modelo dinâmico de extração;
- estruturar o serviço de geração de Excel;
- revisar fluxos de API entre upload, review, persistência e exportação;
- melhorar a interface visual das telas de upload, processamento e revisão.

O código final não foi tratado como uma simples cópia das respostas do agente. O processo envolveu executar a aplicação, observar os logs, comparar o comportamento com o PDF e corrigir decisões que não se provaram adequadas.

---

## Ferramentas utilizadas e para quê

### Agentes/assistentes de IA

Usados para:

- geração inicial de código;
- análise de erros;
- sugestões de arquitetura;
- revisão de componentes;
- elaboração de código de integração com Gemini e Excel.

### VS Code

Usado para:

- edição dos arquivos;
- execução do projeto;
- leitura dos erros do Next.js/Turbopack;
- execução dos comandos de build e desenvolvimento.

### Next.js / React DevTools do próprio ambiente

Usados para observar:

- erros de renderização;
- hydration mismatch;
- erros de runtime;
- problemas de rotas.

### Terminal / PowerShell

Usado para:

- instalar dependências;
- rodar o projeto;
- limpar `.next`;
- localizar trechos antigos do código;
- verificar logs de API.

### Google Gemini

Usado como mecanismo de extração e estruturação dos PDFs.

### PDF viewer do navegador

Usado para manter o documento original visível enquanto os dados extraídos eram revisados.

---

## Pontos em que o agente errou ou tomou o caminho errado

### 1. Dependência excessiva de um schema fixo

No início, a aplicação trabalhava com campos fixos como `nome`, `cpf`, `matricula`, `salario`, `eventos` e `marcacoes`.

Isso funcionava para um modelo específico, mas falhava quando o documento de outra empresa tinha estrutura diferente.

O problema foi percebido ao testar documentos com layouts diferentes e observar que o cartão de ponto podia acabar recebendo campos de holerite ou que a estrutura da resposta não correspondia ao componente de review.

A solução foi mudar o modelo para uma estrutura dinâmica:

```text
pages -> metadata -> sections -> columns -> rows
```

---

### 2. Alterar o frontend sem alinhar o contrato da API

Em alguns momentos, o agente corrigiu o `TimesheetReview` para enviar:

```json
{
  "value": { ... }
}
```

enquanto o backend ainda procurava:

```json
{
  "dados": { ... }
}
```

Isso causou o erro:

```text
O campo 'dados' é obrigatório.
```

O diagnóstico veio ao pesquisar o próprio código com o terminal e localizar a string antiga na rota:

```text
src/app/api/transcricoes/[id]/route.ts
```

A correção foi unificar o contrato da API em `value`, mantendo `dados` apenas como fallback de compatibilidade.

---

### 3. Usar `Map` em memória para persistência

A primeira implementação guardava as transcrições em:

```ts
new Map<string, TranscriptionData>()
```

Isso funcionou durante alguns testes, mas falhou no fluxo em que o POST salvava a transcrição e o GET seguinte da Review retornava `Transcrição não encontrada`.

A causa foi a natureza em memória do `Map` e a necessidade de compartilhar o estado entre os handlers/contextos da aplicação.

A solução adotada para o desafio foi persistir localmente em:

```text
data/transcriptions.json
```

---

### 4. O Excel inicialmente recebia JSON em vez de uma planilha estruturada

Em um teste, o arquivo aberto no Google Sheets continha o objeto JSON inteiro em uma linha.

O diagnóstico foi feito observando que o endpoint usado pelo botão de download era o endpoint da transcrição, e não o endpoint específico de geração do Excel.

Depois o fluxo foi separado em:

```text
PUT /api/transcricoes/:id
GET /api/transcricoes/:id/planilha
```

com o segundo endpoint retornando o buffer XLSX.

---

## 3 decisões com mais de uma resposta razoável

### Decisão 1 — Schema fixo ou estrutura dinâmica

**Alternativas:**

- manter um schema fixo para holerite e ponto;
- criar schemas específicos por empresa/template;
- usar uma estrutura dinâmica baseada em páginas, metadados e tabelas.

**Escolha:** estrutura dinâmica.

**Por quê:** o desafio explicitamente envolve documentos de empresas e templates diferentes. Um schema dinâmico reduz o acoplamento com um layout específico e permite que o mesmo pipeline represente tabelas novas.

---

### Decisão 2 — Persistência em banco ou arquivo local

**Alternativas:**

- banco de dados;
- cache/memória;
- arquivo JSON local.

**Escolha:** arquivo JSON local para a entrega do desafio.

**Por quê:** é simples, reproduzível e suficiente para uma execução local/demo. A desvantagem é que não é a melhor escolha para produção, o que está documentado explicitamente na solução.

---

### Decisão 3 — Um Review genérico ou dois Reviews

**Alternativas:**

- um único componente genérico;
- dois componentes com visual e arquitetura semelhantes;
- componentes totalmente independentes.

**Escolha:** dois componentes, `PayslipReview` e `TimesheetReview`, compartilhando o mesmo padrão visual.

**Por quê:** os documentos possuem necessidades semânticas diferentes. Separar os componentes facilita evoluir cada tipo sem criar um componente único excessivamente complexo, mantendo a mesma experiência visual.

---

## O que quebra primeiro em produção?

O primeiro ponto de fragilidade seria a **dependência do provedor de IA** e a persistência local.

### Gemini

Erros transitórios como `503 UNAVAILABLE` e limites como `429` podem impedir uma extração mesmo com código correto.

Em produção, isso precisa de:

- retry/backoff consistente;
- observabilidade;
- limites de tamanho e tempo;
- tratamento de falhas;
- possibilidade de troca/fallback de modelo.

### Persistência

O `data/transcriptions.json` não é adequado para múltiplas instâncias da aplicação ou concorrência real.

Em produção, deve ser substituído por banco/armazenamento persistente apropriado.

### Extração

PDFs extremamente heterogêneos, digitalizações ruins e layouts nunca vistos podem gerar baixa qualidade de extração.

A aplicação ainda precisa de uma camada formal de confiança/validação para decidir quando é melhor retornar `não sei ler este documento`.

---

## Onde não confio no que entreguei?

Não considero a solução totalmente confiável nestes pontos:

1. **Precisão semântica da extração em qualquer layout possível.** A Gemini consegue representar layouts variados, mas isso não significa que todos os valores serão extraídos corretamente.
2. **Reconhecimento automático do tipo do documento.** O fluxo atual ainda utiliza a seleção de tipo feita pelo usuário.
3. **Rastreabilidade célula -> origem no PDF.** A aplicação não carrega coordenadas do texto para permitir esse destaque.
4. **Persistência local em produção.** O JSON foi uma escolha pragmática para o desafio, não uma arquitetura de produção.
5. **Transformação específica de ficha financeira.** A estrutura dinâmica suporta a ficha financeira, mas a regra adicional do bônus de transformar meses em entradas padronizadas ainda não foi implementada.

---

## Como percebi os problemas

A principal ferramenta de validação foi o comportamento real da aplicação:

- logs HTTP do Next.js;
- mensagens do Turbopack;
- erros no console do navegador;
- comparação entre o PDF e os dados exibidos;
- inspeção dos arquivos e busca de strings antigas no código;
- testes de salvar e baixar Excel.

Isso foi importante porque vários erros não eram evidentes apenas lendo o código. Alguns só apareciam quando duas partes do sistema tinham contratos diferentes.
