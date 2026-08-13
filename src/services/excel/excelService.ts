import * as XLSX from "xlsx";

interface DynamicMetadata {
  label: string;
  value: string;
}

interface DynamicSection {
  name: string;
  columns: string[];
  rows: Record<string, string>[];
}

interface DynamicPage {
  page: number;
  metadata: DynamicMetadata[];
  sections: DynamicSection[];
}

interface DynamicDocument {
  document_type:
    | "holerite"
    | "cartao-ponto"
    | "outro";

  layout_name: string;

  pages: DynamicPage[];
}

/* =========================================================
   TIPOS AUXILIARES
   ========================================================= */

type ExcelRow = (
  string | number | null
)[];

/* =========================================================
   LIMPAR NOME DA ABA
   ========================================================= */

function sanitizeSheetName(
  name: string
) {
  return (name || "Dados")
    .replace(/[\\/?*[\]:]/g, "")
    .slice(0, 31)
    .trim() || "Dados";
}

/* =========================================================
   GARANTIR NOME ÚNICO DA ABA
   ========================================================= */

function uniqueSheetName(
  workbook: XLSX.WorkBook,
  desiredName: string
) {
  const base =
    sanitizeSheetName(
      desiredName
    );

  let name = base;
  let counter = 2;

  while (
    workbook.SheetNames.includes(
      name
    )
  ) {
    const suffix =
      ` (${counter})`;

    name =
      `${base.slice(
        0,
        31 - suffix.length
      )}${suffix}`;

    counter++;
  }

  return name;
}

/* =========================================================
   VALORES
   ========================================================= */

function normalizeCellValue(
  value: unknown
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  return JSON.stringify(value);
}

/* =========================================================
   VALIDAR DOCUMENTO
   ========================================================= */

function isDynamicDocument(
  dados: unknown
): dados is DynamicDocument {
  if (
    !dados ||
    typeof dados !== "object"
  ) {
    return false;
  }

  const document =
    dados as Partial<DynamicDocument>;

  if (
    !Array.isArray(
      document.pages
    )
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   CRIAR SHEET DE RESUMO
   ========================================================= */

function createSummarySheet(
  workbook: XLSX.WorkBook,
  dados: DynamicDocument
) {
  const rows: ExcelRow[] = [
    [
      "Informação",
      "Valor",
    ],
    [
      "Tipo do documento",
      dados.document_type,
    ],
    [
      "Layout identificado",
      dados.layout_name,
    ],
    [
      "Quantidade de páginas",
      dados.pages.length,
    ],
  ];

  const sheet =
    XLSX.utils.aoa_to_sheet(
      rows
    );

  /*
   * Larguras
   */
  sheet["!cols"] = [
    { wch: 28 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    "Resumo"
  );
}

/* =========================================================
   ADICIONAR METADATA
   ========================================================= */

function addMetadata(
  rows: ExcelRow[],
  metadata: DynamicMetadata[]
) {
  if (
    !metadata ||
    metadata.length === 0
  ) {
    return;
  }

  rows.push([
    "DADOS DE IDENTIFICAÇÃO",
  ]);

  rows.push([
    "Campo",
    "Valor",
  ]);

  for (
    const item of metadata
  ) {
    rows.push([
      normalizeCellValue(
        item.label
      ),
      normalizeCellValue(
        item.value
      ),
    ]);
  }

  rows.push([]);
}

/* =========================================================
   ADICIONAR SECTION
   ========================================================= */

function addSection(
  rows: ExcelRow[],
  section: DynamicSection
) {
  rows.push([
    section.name,
  ]);

  /*
   * Cabeçalhos reais encontrados
   * pela Gemini.
   */
  rows.push(
    section.columns.map(
      (column) =>
        normalizeCellValue(
          column
        )
    )
  );

  /*
   * Linhas reais.
   */
  for (
    const row of section.rows
  ) {
    rows.push(
      section.columns.map(
        (column) =>
          normalizeCellValue(
            row[column]
          )
      )
    );
  }

  rows.push([]);
}

/* =========================================================
   CRIAR SHEET DE UMA PÁGINA
   ========================================================= */

function createPageSheet(
  workbook: XLSX.WorkBook,
  page: DynamicPage
) {
  const rows: ExcelRow[] = [];

  rows.push([
    `Página ${page.page}`,
  ]);

  rows.push([]);

  /*
   * Metadata
   */
  addMetadata(
    rows,
    page.metadata
  );

  /*
   * Sections
   */
  for (
    const section of page.sections
  ) {
    addSection(
      rows,
      section
    );
  }

  const sheet =
    XLSX.utils.aoa_to_sheet(
      rows
    );

  /*
   * Larguras padrão.
   */
  const maxColumns =
    Math.max(
      2,
      ...page.sections.map(
        (section) =>
          section.columns.length
      )
    );

  sheet["!cols"] =
    Array.from(
      {
        length:
          maxColumns,
      },
      (_, index) => ({
        wch:
          index === 0
            ? 24
            : 20,
      })
    );

  return sheet;
}

/* =========================================================
   CRIAR UMA ABA CONSOLIDADA
   ========================================================= */

function createAllDataSheet(
  workbook: XLSX.WorkBook,
  dados: DynamicDocument
) {
  const rows: ExcelRow[] = [];

  /*
   * Cabeçalho
   */
  rows.push([
    "QUICK FILLER",
  ]);

  rows.push([
    "Tipo",
    dados.document_type,
  ]);

  rows.push([
    "Layout",
    dados.layout_name,
  ]);

  rows.push([]);

  /*
   * Todas as páginas
   */
  for (
    const page of dados.pages
  ) {
    rows.push([
      `PÁGINA ${page.page}`,
    ]);

    rows.push([]);

    addMetadata(
      rows,
      page.metadata
    );

    for (
      const section of page.sections
    ) {
      rows.push([
        section.name,
      ]);

      rows.push(
        section.columns.map(
          normalizeCellValue
        )
      );

      for (
        const row of section.rows
      ) {
        rows.push(
          section.columns.map(
            (column) =>
              normalizeCellValue(
                row[column]
              )
          )
        );
      }

      rows.push([]);
      rows.push([]);
    }
  }

  const sheet =
    XLSX.utils.aoa_to_sheet(
      rows
    );

  const maxColumns =
    Math.max(
      2,
      ...dados.pages.flatMap(
        (page) =>
          page.sections.map(
            (section) =>
              section.columns
                .length
          )
      )
    );

  sheet["!cols"] =
    Array.from(
      {
        length:
          maxColumns,
      },
      (_, index) => ({
        wch:
          index === 0
            ? 26
            : 20,
      })
    );

  const sheetName =
    uniqueSheetName(
      workbook,
      "Dados"
    );

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    sheetName
  );
}

/* =========================================================
   FUNÇÃO PRINCIPAL
   ========================================================= */

export async function generateExcel(
  dados: DynamicDocument
): Promise<Buffer> {
  if (
    !isDynamicDocument(
      dados
    )
  ) {
    throw new Error(
      "Os dados recebidos não estão no formato dinâmico esperado."
    );
  }

  const workbook =
    XLSX.utils.book_new();

  /*
   * 1. Resumo
   */
  createSummarySheet(
    workbook,
    dados
  );

  /*
   * 2. Dados consolidados
   */
  createAllDataSheet(
    workbook,
    dados
  );

  /*
   * 3. Uma aba por página
   *
   * Isso facilita a conferência
   * de documentos longos.
   */
  for (
    const page of dados.pages
  ) {
    const sheet =
      createPageSheet(
        workbook,
        page
      );

    const sheetName =
      uniqueSheetName(
        workbook,
        `Página ${page.page}`
      );

    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      sheetName
    );
  }

  /*
   * Gerar XLSX
   */
  const buffer =
    XLSX.write(
      workbook,
      {
        type: "buffer",
        bookType: "xlsx",
      }
    );

  return buffer;
}