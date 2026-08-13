"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowBack,
  Description,
  Download,
  Save,
} from "@mui/icons-material";

import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  TextField,
} from "@mui/material";

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

interface PayslipReviewProps {
  id: string;
  file: string;
  dados: DynamicDocument;
}

export default function PayslipReview({
  id,
  file,
  dados: dadosIniciais,
}: PayslipReviewProps) {
  const router = useRouter();

  const [dados, setDados] =
    useState<DynamicDocument>(
      dadosIniciais
    );

  const [saving, setSaving] =
    useState(false);

  const [downloading, setDownloading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const pdfUrl = file
    ? `/api/uploads/${encodeURIComponent(
        file
      )}`
    : "";

  /* =========================================================
     METADATA
     ========================================================= */

  function atualizarMetadata(
    pageIndex: number,
    metadataIndex: number,
    value: string
  ) {
    setDados((atual) => {
      const pages = [...atual.pages];

      const metadata = [
        ...pages[pageIndex].metadata,
      ];

      metadata[metadataIndex] = {
        ...metadata[metadataIndex],
        value,
      };

      pages[pageIndex] = {
        ...pages[pageIndex],
        metadata,
      };

      return {
        ...atual,
        pages,
      };
    });
  }

  /* =========================================================
     ATUALIZAR CÉLULA
     ========================================================= */

  function atualizarCelula(
    pageIndex: number,
    sectionIndex: number,
    rowIndex: number,
    column: string,
    value: string
  ) {
    setDados((atual) => {
      const pages = [...atual.pages];

      const sections = [
        ...pages[pageIndex].sections,
      ];

      const rows = [
        ...sections[sectionIndex].rows,
      ];

      rows[rowIndex] = {
        ...rows[rowIndex],
        [column]: value,
      };

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        rows,
      };

      pages[pageIndex] = {
        ...pages[pageIndex],
        sections,
      };

      return {
        ...atual,
        pages,
      };
    });
  }

  /* =========================================================
     LER RESPOSTA DA API
     ========================================================= */

  async function parseApiResponse(
    response: Response
  ) {
    const text =
      await response.text();

    if (!text.trim()) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        error: text,
      };
    }
  }

  /* =========================================================
     SALVAR
     ========================================================= */

  async function handleSalvar() {
    try {
      setSaving(true);
      setError("");

      const response =
        await fetch(
          `/api/transcricoes/${encodeURIComponent(
            id
          )}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              value: dados,
            }),
          }
        );

      const result =
        await parseApiResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          result?.error ||
            `Erro ao salvar as alterações (${response.status}).`
        );
      }

      setSuccessMessage(
        "Alterações salvas com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao salvar alterações:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Erro ao salvar as alterações."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     BAIXAR EXCEL
     ========================================================= */

  async function handleDownloadExcel() {
    try {
      setDownloading(true);
      setError("");

      /* -----------------------------------------------------
         1. SALVAR ALTERAÇÕES ATUAIS
         ----------------------------------------------------- */

      const saveResponse =
        await fetch(
          `/api/transcricoes/${encodeURIComponent(
            id
          )}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              value: dados,
            }),
          }
        );

      const saveResult =
        await parseApiResponse(
          saveResponse
        );

      if (!saveResponse.ok) {
        throw new Error(
          saveResult?.error ||
            `Não foi possível salvar os dados (${saveResponse.status}).`
        );
      }

      /* -----------------------------------------------------
         2. GERAR EXCEL
         ----------------------------------------------------- */

      const response =
        await fetch(
          `/api/transcricoes/${encodeURIComponent(
            id
          )}/planilha`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      if (!response.ok) {
        const result =
          await parseApiResponse(
            response
          );

        throw new Error(
          result?.error ||
            `Erro ao gerar o Excel (${response.status}).`
        );
      }

      /* -----------------------------------------------------
         3. VALIDAR CONTENT-TYPE
         ----------------------------------------------------- */

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      console.log(
        "Content-Type do Excel:",
        contentType
      );

      /*
       * O endpoint de planilha precisa
       * devolver um XLSX.
       */

      const isExcel =
        contentType.includes(
          "spreadsheetml"
        ) ||
        contentType.includes(
          "application/vnd.ms-excel"
        ) ||
        contentType.includes(
          "application/octet-stream"
        );

      if (!isExcel) {
        const unexpectedText =
          await response.text();

        let message =
          "O servidor não retornou um arquivo Excel.";

        if (
          unexpectedText.trim()
        ) {
          try {
            const parsed =
              JSON.parse(
                unexpectedText
              );

            message =
              parsed?.error ||
              message;
          } catch {
            message =
              unexpectedText;
          }
        }

        throw new Error(
          message
        );
      }

      /* -----------------------------------------------------
         4. RECEBER ARQUIVO
         ----------------------------------------------------- */

      const blob =
        await response.blob();

      if (blob.size === 0) {
        throw new Error(
          "A planilha gerada está vazia."
        );
      }

      /* -----------------------------------------------------
         5. DOWNLOAD
         ----------------------------------------------------- */

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `quick-filler-${id}.xlsx`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );

      setSuccessMessage(
        "Excel gerado com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao gerar Excel:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Erro ao gerar o Excel."
      );
    } finally {
      setDownloading(false);
    }
  }

  /* =========================================================
     CONTAGEM
     ========================================================= */

  const totalPaginas =
    dados.pages.length;

  const totalSecoes =
    dados.pages.reduce(
      (total, page) =>
        total +
        page.sections.length,
      0
    );

  const totalRegistros =
    dados.pages.reduce(
      (total, page) =>
        total +
        page.sections.reduce(
          (
            sectionTotal,
            section
          ) =>
            sectionTotal +
            section.rows.length,
          0
        ),
      0
    );

  /* =========================================================
     UI
     ========================================================= */

  return (
    <Box
      className="qf-page"
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header
        className="qf-header"
        style={{
          flexShrink: 0,
          backgroundColor: "#ffffff",
        }}
      >
        <Box
          sx={{
            width: "100%",
            padding: {
              xs: "0 1rem",
              md: "0 1.5rem",
            },
          }}
        >
          <Box
            sx={{
              height: "82px",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "1rem",
            }}
          >
            {/* ESQUERDA */}

            <Box
              sx={{
                display: "flex",
                alignItems:
                  "center",
                gap: "1.25rem",
                minWidth: 0,
              }}
            >
              <Button
                variant="outlined"
                startIcon={
                  <ArrowBack />
                }
                onClick={() =>
                  router.push("/")
                }
                sx={{
                  height: "44px",
                  px: "1rem",
                  borderRadius:
                    "10px",
                  borderColor:
                    "#dce3ec",
                  color:
                    "#283446",
                  textTransform:
                    "none",
                  flexShrink: 0,

                  "&:hover": {
                    borderColor:
                      "#c4cfdd",
                    backgroundColor:
                      "#f8fafc",
                  },
                }}
              >
                Voltar
              </Button>

              <Box
                sx={{
                  width: "1px",
                  height: "42px",
                  backgroundColor:
                    "#e2e8f0",
                }}
              />

              <Box
                sx={{
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    fontSize: {
                      xs: "1.05rem",
                      md: "1.4rem",
                    },
                    fontWeight:
                      700,
                    color:
                      "#172033",
                  }}
                >
                  Revisão do holerite
                </Box>

                <Box
                  className="qf-truncate"
                  sx={{
                    mt:
                      "0.25rem",
                    display: "flex",
                    alignItems:
                      "center",
                    gap:
                      "0.35rem",
                    color:
                      "#64748b",
                    fontSize:
                      "0.875rem",
                  }}
                >
                  <Description
                    sx={{
                      fontSize: 16,
                    }}
                  />

                  <span className="qf-truncate">
                    {file}
                  </span>
                </Box>
              </Box>
            </Box>

            {/* DIREITA */}

            <Box
              sx={{
                display: {
                  xs: "none",
                  sm: "flex",
                },
                alignItems:
                  "center",
                gap: "1rem",
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "0.4rem",
                  px:
                    "0.85rem",
                  py:
                    "0.45rem",
                  borderRadius:
                    "999px",
                  border:
                    "1px solid #a7e3b6",
                  backgroundColor:
                    "#e9faed",
                  color:
                    "#159447",
                  fontSize:
                    "0.875rem",
                  fontWeight:
                    600,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius:
                      "50%",
                    backgroundColor:
                      "#159447",
                  }}
                />

                Extração concluída
              </Box>

              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius:
                    "10px",
                  backgroundColor:
                    "#173772",
                  color:
                    "#ffffff",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <Description />
              </Box>

              <Box
                sx={{
                  fontWeight:
                    700,
                  color:
                    "#172033",
                }}
              >
                Quick Filler
              </Box>
            </Box>
          </Box>
        </Box>
      </header>

      {/* =====================================================
          CONTEÚDO
          ===================================================== */}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          padding: {
            xs: "1rem",
            md: "1.5rem",
          },
        }}
      >
        <Box
          sx={{
            height: "100%",
            display:
              "grid",
            gridTemplateColumns:
              {
                xs: "1fr",
                lg:
                  "minmax(0, 1.15fr) minmax(460px, 0.85fr)",
              },
            gap:
              "1.5rem",
            minHeight: 0,
          }}
        >
          {/* =================================================
              PDF
              ================================================= */}

          <Paper
            elevation={0}
            sx={{
              minHeight: 0,
              overflow:
                "hidden",
              border:
                "1px solid #dce3ec",
              borderRadius:
                "16px",
              backgroundColor:
                "#ffffff",
              display:
                "flex",
              flexDirection:
                "column",
            }}
          >
            <Box
              sx={{
                minHeight:
                  "70px",
                px:
                  "1.25rem",
                borderBottom:
                  "1px solid #e4e9f0",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
              }}
            >
              <Box
                sx={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "0.75rem",
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius:
                      "9px",
                    backgroundColor:
                      "#eaf1fb",
                    color:
                      "#28539b",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <Description
                    sx={{
                      fontSize: 20,
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    fontSize:
                      "1rem",
                    fontWeight:
                      700,
                    color:
                      "#202b3c",
                  }}
                >
                  Documento original
                </Box>
              </Box>

              <Box
                sx={{
                  px:
                    "0.75rem",
                  py:
                    "0.35rem",
                  border:
                    "1px solid #dbe3ef",
                  borderRadius:
                    "999px",
                  color:
                    "#52719b",
                  fontSize:
                    "0.75rem",
                  fontWeight:
                    700,
                }}
              >
                PDF
              </Box>
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                p:
                  "1rem",
              }}
            >
              <Box
                sx={{
                  width:
                    "100%",
                  height:
                    "100%",
                  minHeight: 0,
                  overflow:
                    "hidden",
                  borderRadius:
                    "14px",
                  backgroundColor:
                    "#273142",
                }}
              >
                {pdfUrl && (
                  <iframe
                    src={pdfUrl}
                    title="Documento PDF"
                    width="100%"
                    height="100%"
                    style={{
                      border:
                        "none",
                      display:
                        "block",
                    }}
                  />
                )}
              </Box>
            </Box>
          </Paper>

          {/* =================================================
              DADOS
              ================================================= */}

          <Paper
            elevation={0}
            sx={{
              minHeight: 0,
              overflow:
                "hidden",
              border:
                "1px solid #dce3ec",
              borderRadius:
                "16px",
              backgroundColor:
                "#ffffff",
              display:
                "flex",
              flexDirection:
                "column",
            }}
          >
            <Box
              sx={{
                minHeight:
                  "82px",
                px:
                  "1.25rem",
                borderBottom:
                  "1px solid #e4e9f0",
                display:
                  "flex",
                alignItems:
                  "center",
              }}
            >
              <Box>
                <Box
                  sx={{
                    fontSize:
                      "1rem",
                    fontWeight:
                      700,
                    color:
                      "#202b3c",
                  }}
                >
                  Dados extraídos
                </Box>

                <Box
                  sx={{
                    mt:
                      "0.2rem",
                    fontSize:
                      "0.875rem",
                    color:
                      "#6b7c93",
                  }}
                >
                  Revise e corrija as informações antes da exportação.
                </Box>
              </Box>
            </Box>

            <Box
              className="qf-scroll"
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY:
                  "auto",
                p:
                  "1.25rem",
              }}
            >
              {/* RESUMO */}

              <Box
                sx={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap:
                    "0.75rem",
                  mb:
                    "1.75rem",
                }}
              >
                {[
                  [
                    "Páginas",
                    totalPaginas,
                  ],
                  [
                    "Seções",
                    totalSecoes,
                  ],
                  [
                    "Registros",
                    totalRegistros,
                  ],
                ].map(
                  ([label, value]) => (
                    <Box
                      key={
                        String(
                          label
                        )
                      }
                      sx={{
                        p:
                          "0.9rem 1rem",
                        border:
                          "1px solid #e1e7ef",
                        borderRadius:
                          "10px",
                        backgroundColor:
                          "#f8fafc",
                      }}
                    >
                      <Box
                        sx={{
                          fontSize:
                            "0.68rem",
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "0.06em",
                          color:
                            "#748398",
                        }}
                      >
                        {label}
                      </Box>

                      <Box
                        sx={{
                          mt:
                            "0.2rem",
                          fontSize:
                            "1.3rem",
                          fontWeight:
                            700,
                          color:
                            "#172033",
                        }}
                      >
                        {value}
                      </Box>
                    </Box>
                  )
                )}
              </Box>

              {/* PÁGINAS */}

              {dados.pages.map(
                (
                  page,
                  pageIndex
                ) => (
                  <Box
                    key={
                      pageIndex
                    }
                    sx={{
                      mb:
                        "2rem",
                    }}
                  >
                    {/* PÁGINA */}

                    <Box className="qf-section-header">
                      <span className="qf-section-header-bar" />

                      <span className="qf-section-header-title">
                        Página{" "}
                        {page.page}
                      </span>
                    </Box>

                    {/* METADATA */}

                    {page.metadata
                      .length >
                      0 && (
                      <Box
                        sx={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            {
                              xs: "1fr",
                              sm:
                                "repeat(2, minmax(0, 1fr))",
                            },
                          gap:
                            "0.75rem",
                          mt:
                            "1rem",
                          mb:
                            "1.5rem",
                        }}
                      >
                        {page.metadata.map(
                          (
                            metadata,
                            metadataIndex
                          ) => (
                            <TextField
                              key={`${pageIndex}-${metadataIndex}`}
                              label={
                                metadata.label
                              }
                              value={
                                metadata.value
                              }
                              onChange={(
                                e
                              ) =>
                                atualizarMetadata(
                                  pageIndex,
                                  metadataIndex,
                                  e
                                    .target
                                    .value
                                )
                              }
                              size="small"
                              fullWidth
                            />
                          )
                        )}
                      </Box>
                    )}

                    {/* SEÇÕES */}

                    {page.sections.map(
                      (
                        section,
                        sectionIndex
                      ) => (
                        <Box
                          key={
                            sectionIndex
                          }
                          sx={{
                            mb:
                              "1.75rem",
                          }}
                        >
                          <Box
                            sx={{
                              fontSize:
                                "0.75rem",
                              fontWeight:
                                700,
                              textTransform:
                                "uppercase",
                              letterSpacing:
                                "0.06em",
                              color:
                                "#52657d",
                              mb:
                                "0.5rem",
                            }}
                          >
                            {
                              section.name
                            }
                          </Box>

                          <Box className="qf-table-container qf-table-scroll qf-scroll">
                            <Box
                              sx={{
                                minWidth:
                                  Math.max(
                                    620,
                                    section
                                      .columns
                                      .length *
                                      150
                                  ),
                              }}
                            >
                              {/* CABEÇALHO */}

                              <Box
                                sx={{
                                  display:
                                    "grid",
                                  gridTemplateColumns:
                                    `repeat(${Math.max(
                                      section
                                        .columns
                                        .length,
                                      1
                                    )}, minmax(120px, 1fr))`,
                                  gap:
                                    "0.5rem",
                                  px:
                                    "0.75rem",
                                  py:
                                    "0.7rem",
                                  backgroundColor:
                                    "#f7f9fb",
                                  borderBottom:
                                    "1px solid #e2e8f0",
                                }}
                              >
                                {section.columns.map(
                                  (
                                    column
                                  ) => (
                                    <Box
                                      key={
                                        column
                                      }
                                      className="qf-text-table qf-font-semibold qf-text-muted"
                                    >
                                      {
                                        column
                                      }
                                    </Box>
                                  )
                                )}
                              </Box>

                              {/* LINHAS */}

                              {section.rows
                                .length ===
                              0 ? (
                                <Box
                                  sx={{
                                    p:
                                      "1rem",
                                    color:
                                      "#64748b",
                                    fontSize:
                                      "0.875rem",
                                  }}
                                >
                                  Nenhum registro encontrado nesta seção.
                                </Box>
                              ) : (
                                section.rows.map(
                                  (
                                    row,
                                    rowIndex
                                  ) => (
                                    <Box
                                      key={
                                        rowIndex
                                      }
                                      sx={{
                                        display:
                                          "grid",
                                        gridTemplateColumns:
                                          `repeat(${Math.max(
                                            section
                                              .columns
                                              .length,
                                            1
                                          )}, minmax(120px, 1fr))`,
                                        gap:
                                          "0.5rem",
                                        px:
                                          "0.75rem",
                                        py:
                                          "0.35rem",
                                        borderBottom:
                                          "1px solid #edf0f4",
                                      }}
                                    >
                                      {section.columns.map(
                                        (
                                          column
                                        ) => (
                                          <TextField
                                            key={
                                              column
                                            }
                                            value={
                                              row[
                                                column
                                              ] ??
                                              ""
                                            }
                                            onChange={(
                                              e
                                            ) =>
                                              atualizarCelula(
                                                pageIndex,
                                                sectionIndex,
                                                rowIndex,
                                                column,
                                                e
                                                  .target
                                                  .value
                                              )
                                            }
                                            fullWidth
                                            variant="standard"
                                            className="qf-mui-table-field"
                                          />
                                        )
                                      )}
                                    </Box>
                                  )
                                )
                              )}
                            </Box>
                          </Box>
                        </Box>
                      )
                    )}

                    {page.metadata.length ===
                      0 &&
                      page.sections.length ===
                        0 && (
                        <Box
                          sx={{
                            p:
                              "2rem",
                            textAlign:
                              "center",
                            color:
                              "#64748b",
                          }}
                        >
                          Nenhum dado foi extraído desta página.
                        </Box>
                      )}
                  </Box>
                )
              )}

              {dados.pages.length ===
                0 && (
                <Box
                  sx={{
                    p:
                      "2rem",
                    textAlign:
                      "center",
                    color:
                      "#64748b",
                  }}
                >
                  Nenhum dado de holerite foi extraído.
                </Box>
              )}
            </Box>

            {/* =================================================
                AÇÕES
                ================================================= */}

            <Box
              sx={{
                borderTop:
                  "1px solid #e3e8ef",
                backgroundColor:
                  "#ffffff",
                p:
                  "1rem 1.25rem 0.9rem",
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    {
                      xs: "1fr",
                      sm:
                        "1.5fr 1fr",
                    },
                  gap:
                    "0.75rem",
                }}
              >
                <Button
                  variant="contained"
                  startIcon={
                    <Save />
                  }
                  onClick={
                    handleSalvar
                  }
                  disabled={
                    saving ||
                    downloading
                  }
                  fullWidth
                  sx={{
                    minHeight:
                      "52px",
                    borderRadius:
                      "12px",
                    backgroundColor:
                      "#24488f",
                    textTransform:
                      "none",
                    fontWeight:
                      700,
                    boxShadow:
                      "none",

                    "&:hover": {
                      backgroundColor:
                        "#173772",
                      boxShadow:
                        "none",
                    },
                  }}
                >
                  {saving
                    ? "Salvando..."
                    : "Salvar alterações"}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={
                    <Download />
                  }
                  onClick={
                    handleDownloadExcel
                  }
                  disabled={
                    saving ||
                    downloading
                  }
                  fullWidth
                  sx={{
                    minHeight:
                      "52px",
                    borderRadius:
                      "12px",
                    borderColor:
                      "#d6deea",
                    color:
                      "#263346",
                    textTransform:
                      "none",
                    fontWeight:
                      600,

                    "&:hover": {
                      borderColor:
                        "#b8c4d4",
                      backgroundColor:
                        "#f8fafc",
                    },
                  }}
                >
                  {downloading
                    ? "Gerando..."
                    : "Baixar Excel"}
                </Button>
              </Box>

              <Box
                sx={{
                  mt:
                    "0.65rem",
                  textAlign:
                    "center",
                  fontSize:
                    "0.75rem",
                  color:
                    "#748398",
                }}
              >
                ID da transcrição:{" "}
                {id}
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* =====================================================
          FEEDBACK - SUCESSO
          ===================================================== */}

      <Snackbar
        open={Boolean(
          successMessage
        )}
        autoHideDuration={
          3000
        }
        onClose={() =>
          setSuccessMessage("")
        }
        anchorOrigin={{
          vertical:
            "bottom",
          horizontal:
            "right",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() =>
            setSuccessMessage("")
          }
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* =====================================================
          FEEDBACK - ERRO
          ===================================================== */}

      <Snackbar
        open={Boolean(
          error
        )}
        autoHideDuration={
          5000
        }
        onClose={() =>
          setError("")
        }
        anchorOrigin={{
          vertical:
            "bottom",
          horizontal:
            "right",
        }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() =>
            setError("")
          }
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}