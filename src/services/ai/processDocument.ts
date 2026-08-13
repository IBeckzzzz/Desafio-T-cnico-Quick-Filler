import fs from "fs/promises";
import { GoogleGenAI } from "@google/genai";

import { DOCUMENT_EXTRACTION_PROMPT } from "./prompts";

/* =========================================================
   TIPOS
   ========================================================= */

export interface DynamicMetadata {
  label: string;
  value: string;
}

export interface DynamicSection {
  name: string;
  columns: string[];
  rows: Record<string, string>[];
}

export interface DynamicPage {
  page: number;
  metadata: DynamicMetadata[];
  sections: DynamicSection[];
}

export interface DynamicDocument {
  document_type:
    | "holerite"
    | "cartao-ponto"
    | "outro";

  layout_name: string;

  pages: DynamicPage[];
}

/* =========================================================
   SCHEMA DINÂMICO
   ========================================================= */

const DYNAMIC_DOCUMENT_SCHEMA = {
  type: "object",

  properties: {
    document_type: {
      type: "string",
      enum: [
        "holerite",
        "cartao-ponto",
        "outro",
      ],
    },

    layout_name: {
      type: "string",
    },

    pages: {
      type: "array",

      items: {
        type: "object",

        properties: {
          page: {
            type: "integer",
          },

          metadata: {
            type: "array",

            items: {
              type: "object",

              properties: {
                label: {
                  type: "string",
                },

                value: {
                  type: "string",
                },
              },

              required: [
                "label",
                "value",
              ],

              additionalProperties: false,
            },
          },

          sections: {
            type: "array",

            items: {
              type: "object",

              properties: {
                name: {
                  type: "string",
                },

                columns: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },

                rows: {
                  type: "array",

                  items: {
                    type: "object",

                    additionalProperties: {
                      type: "string",
                    },
                  },
                },
              },

              required: [
                "name",
                "columns",
                "rows",
              ],

              additionalProperties: false,
            },
          },
        },

        required: [
          "page",
          "metadata",
          "sections",
        ],

        additionalProperties: false,
      },
    },
  },

  required: [
    "document_type",
    "layout_name",
    "pages",
  ],

  additionalProperties: false,
};

/* =========================================================
   PROMPT PRINCIPAL
   ========================================================= */

const DYNAMIC_EXTRACTION_PROMPT = `
Você é um sistema de extração documental.

Sua função é analisar visualmente o PDF inteiro e descobrir
a estrutura real do documento.

IMPORTANTE:

NÃO presuma que o documento possui campos previamente
definidos.

NÃO tente encaixar todos os documentos no mesmo modelo.

Cada empresa pode utilizar um layout completamente diferente.

Seu trabalho é descobrir o layout apresentado no PDF e
representá-lo fielmente no JSON.

=========================================================
1. IDENTIFICAÇÃO
=========================================================

Determine se o documento é:

- holerite
- cartao-ponto
- outro

Use "outro" somente quando realmente não for possível
classificar como um dos dois.

Também dê um nome simples para o layout encontrado em:

layout_name

Exemplos:

- recibo_pagamento
- ficha_financeira
- declaracao_remuneracao
- sipon
- ponto_eletronico
- cartao_ponto

Não invente nome de empresa.

=========================================================
2. TODAS AS PÁGINAS
=========================================================

Analise TODAS as páginas do PDF.

Para cada página:

- preserve o número original da página
- preserve a ordem das informações
- identifique os blocos existentes

Uma mesma página pode possuir mais de uma tabela ou
mais de uma estrutura.

=========================================================
3. METADATA
=========================================================

"metadata" deve conter informações identificadas fora
das tabelas principais.

Exemplos:

- Nome
- CPF
- Matrícula
- Cargo
- Data Admissão
- Empresa
- Centro de Custo
- Salário Base
- Salário Hora
- Mês/Ano
- Período
- Jornada
- Função
- CTPS
- Unidade
- Localização
- qualquer outro campo claramente apresentado como
  informação de identificação ou contexto.

IMPORTANTE:

Preserve exatamente o rótulo encontrado no documento.

Exemplo:

{
  "label": "Data Admissão",
  "value": "09/09/2019"
}

Não renomeie para "admissao".

Não padronize o rótulo.

Se o campo existir mas estiver vazio, mantenha:

"value": ""

=========================================================
4. SECTIONS
=========================================================

Cada tabela ou bloco tabular diferente deve virar uma
section.

Exemplos:

- Proventos
- Descontos
- Rendimentos
- Resultados
- Bases
- Marcações
- Ocorrências
- Totais
- Folha Normal
- Folha de Pagamento: MÊS
- Folha de Pagamento: ACERTO

O nome deve refletir o que aparece no documento.

=========================================================
5. COLUMNS
=========================================================

Descubra os cabeçalhos reais da tabela.

Exemplo:

[
  "Descrição",
  "Qtde",
  "Valor"
]

Outro documento pode ter:

[
  "Verba",
  "Nome",
  "Base / Saldo / Benefício",
  "Valor"
]

Outro:

[
  "Dia",
  "Entrada Saída",
  "Intervalo 1",
  "Intervalo 2",
  "HE Diurno",
  "HE Noturno",
  "Situação"
]

NÃO force todas as tabelas para o mesmo conjunto de
colunas.

=========================================================
6. ROWS
=========================================================

Cada linha da tabela deve virar um objeto.

Use exatamente os nomes das colunas encontrados.

Exemplo:

{
  "Descrição": "SALARIO",
  "Qtde": "",
  "Valor": "953,36"
}

Se uma célula estiver vazia:

""

Se um valor estiver ilegível:

use "?"

Não invente informação.

=========================================================
7. FIDELIDADE
=========================================================

Preserve os valores como aparecem no documento.

Valores monetários devem permanecer como texto.

Exemplo correto:

"2.389,77"

Não transforme em:

2389.77

Datas e horários também devem ser preservados no texto,
sem corrigir automaticamente.

=========================================================
8. CARTÃO DE PONTO
=========================================================

Para cartão de ponto:

- preserve a ordem das linhas
- preserve todas as colunas existentes
- preserve ocorrências
- preserve situações
- preserve horas extras
- preserve atrasos
- preserve faltas
- preserve abonos
- preserve intervalos
- preserve qualquer coluna adicional presente

NÃO limite o número de horários.

Se o documento possuir:

Ent1
Sai1
Ent2
Sai2
Ent3
Sai3
Ent4
Sai4

todas essas colunas devem ser preservadas.

Se possuir somente:

Entrada
Saída

preserve somente essas.

Se uma linha for:

"Feriado"

não transforme em horário.

Mantenha a informação na coluna correspondente.

Se um dia não possuir nenhuma marcação, mantenha a linha.

=========================================================
9. HOLERITE
=========================================================

Para holerites:

identifique separadamente:

- informações de identificação
- tabelas de proventos
- tabelas de descontos
- bases
- totais
- resultados
- outros blocos existentes

NÃO misture automaticamente bases e totais com a tabela
principal de verbas.

Se o documento possuir:

"TOTAL DE PROVENTOS"
"TOTAL DE DESCONTOS"
"LIQUIDO A RECEBER"

isso deve ficar em uma section apropriada ou metadata,
conforme a estrutura visual do documento.

=========================================================
10. FICHA FINANCEIRA
=========================================================

Se uma mesma página contiver vários meses:

NÃO trate a página inteira como um único registro.

Preserve cada bloco mensal como uma section separada,
ou se o layout mostrar claramente múltiplos registros
mensais, represente cada bloco individualmente.

Não descarte meses.

=========================================================
11. DOCUMENTOS COM DUPLICAÇÃO VISUAL
=========================================================

Se uma página contiver duas cópias idênticas do mesmo
recibo para impressão:

não duplique os dados.

Reconheça que se trata de uma repetição visual do mesmo
documento.

=========================================================
12. CAMPOS ILEGÍVEIS
=========================================================

Quando um caractere não puder ser identificado com
segurança:

use "?"

Exemplo:

"1?38,61"

Não invente.

=========================================================
13. NÃO INVENTAR
=========================================================

Nunca crie:

- nome
- CPF
- salário
- código
- horário
- data
- empresa
- cargo
- valores

que não estejam presentes no documento.

=========================================================
14. RESULTADO
=========================================================

Retorne SOMENTE JSON válido.

Não escreva explicações.

Não escreva markdown.

Não escreva blocos de código.

Não escreva comentários fora do JSON.
`;

/* =========================================================
   NORMALIZAÇÃO DO TIPO
   ========================================================= */

function normalizeDocumentType(
  tipo: string
): "holerite" | "cartao-ponto" | "outro" {
  const normalized = (tipo || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  if (
    normalized === "cartao-ponto" ||
    normalized === "cartao-de-ponto" ||
    normalized === "folha-ponto" ||
    normalized === "folha-de-ponto" ||
    normalized === "timesheet" ||
    normalized === "ponto"
  ) {
    return "cartao-ponto";
  }

  if (normalized === "holerite") {
    return "holerite";
  }

  return "outro";
}

/* =========================================================
   VALIDAÇÃO
   ========================================================= */

function validateDynamicDocument(
  data: unknown
): DynamicDocument {
  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new Error(
      "A Gemini retornou uma estrutura inválida."
    );
  }

  const document =
    data as DynamicDocument;

  if (
    !Array.isArray(
      document.pages
    )
  ) {
    throw new Error(
      "A Gemini não retornou a lista de páginas."
    );
  }

  for (
    const page of document.pages
  ) {
    if (
      !page ||
      typeof page.page !==
        "number"
    ) {
      throw new Error(
        "Uma página retornada pela Gemini é inválida."
      );
    }

    if (
      !Array.isArray(
        page.metadata
      )
    ) {
      throw new Error(
        "Metadata de página inválida."
      );
    }

    if (
      !Array.isArray(
        page.sections
      )
    ) {
      throw new Error(
        "Sections de página inválidas."
      );
    }

    for (
      const section of page.sections
    ) {
      if (
        !section ||
        typeof section.name !==
          "string"
      ) {
        throw new Error(
          "Uma section retornada pela Gemini é inválida."
        );
      }

      if (
        !Array.isArray(
          section.columns
        )
      ) {
        throw new Error(
          "As colunas de uma section são inválidas."
        );
      }

      if (
        !Array.isArray(
          section.rows
        )
      ) {
        throw new Error(
          "As linhas de uma section são inválidas."
        );
      }
    }
  }

  return document;
}

/* =========================================================
   PROCESSAMENTO
   ========================================================= */

export async function processDocument(
  filePath: string,
  tipo: string
): Promise<DynamicDocument> {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não configurada."
    );
  }

  const requestedType =
    normalizeDocumentType(tipo);

  console.log(
    "================================"
  );

  console.log(
    "INICIANDO PROCESSAMENTO GEMINI"
  );

  console.log(
    `Arquivo: ${filePath}`
  );

  console.log(
    `Tipo selecionado: ${requestedType}`
  );

  console.log(
    "================================"
  );

  const pdfBuffer =
    await fs.readFile(filePath);

  const ai =
    new GoogleGenAI({
      apiKey,
    });

  const prompt = `
${DOCUMENT_EXTRACTION_PROMPT}

${DYNAMIC_EXTRACTION_PROMPT}

TIPO SELECIONADO PELO USUÁRIO:
${requestedType}

Use o tipo selecionado apenas como orientação inicial.

Confirme visualmente o tipo real do documento.

Se o conteúdo do PDF não corresponder ao tipo selecionado,
priorize o que está visualmente presente no documento.

Analise todas as páginas.

Retorne exatamente a estrutura definida pelo schema.
`;

  console.log(
    "Enviando PDF para Gemini..."
  );

  const response =
    await ai.models.generateContent({
      model: "gemini-3.6-flash",

      contents: [
        {
          text: prompt,
        },

        {
          inlineData: {
            mimeType:
              "application/pdf",

            data: pdfBuffer.toString(
              "base64"
            ),
          },
        },
      ],

      config: {
        responseMimeType:
          "application/json",

        responseJsonSchema:
          DYNAMIC_DOCUMENT_SCHEMA,
      },
    });

  console.log(
    "Resposta recebida da Gemini."
  );

  const responseText =
    response.text;

  if (!responseText) {
    throw new Error(
      "A Gemini não retornou conteúdo."
    );
  }

  console.log(
    "================================"
  );

  console.log(
    "JSON DINÂMICO RECEBIDO DA GEMINI"
  );

  console.log(
    responseText
  );

  console.log(
    "================================"
  );

  try {
    const parsed =
      JSON.parse(
        responseText
      );

    return validateDynamicDocument(
      parsed
    );
  } catch (error) {
    console.error(
      "Erro ao interpretar JSON da Gemini:",
      error
    );

    throw new Error(
      "A Gemini retornou um JSON inválido ou incompatível com a estrutura dinâmica."
    );
  }
}