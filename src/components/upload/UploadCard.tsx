"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  AccessTime,
  CloudUpload,
  Description,
  ReceiptLong,
} from "@mui/icons-material";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";

import { useDropzone } from "react-dropzone";

import { DocumentType } from "@/types/document";

export default function UploadCard() {
  const router = useRouter();

  const [file, setFile] =
    useState<File | null>(null);

  const [type, setType] =
    useState<DocumentType>(
      DocumentType.PAYSLIP
    );

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =========================================================
     DROPZONE
     ========================================================= */

  const onDrop = (
    acceptedFiles: File[]
  ) => {
    if (processing) {
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(
        acceptedFiles[0]
      );

      setError("");
    }
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,

    accept: {
      "application/pdf": [".pdf"],
    },

    maxFiles: 1,
    multiple: false,
    disabled: processing,
  });

  /* =========================================================
     UPLOAD
     ========================================================= */

  const handleUpload =
    async () => {
      if (
        !file ||
        processing
      ) {
        return;
      }

      try {
        setProcessing(true);
        setError("");

        const form =
          new FormData();

        form.append(
          "arquivo",
          file
        );

        form.append(
          "tipo",
          type
        );

        const response =
          await fetch(
            "/api/transcricoes",
            {
              method: "POST",
              body: form,
            }
          );

        /*
         * Não usamos response.json()
         * diretamente porque uma resposta
         * 405/500 pode vir sem JSON.
         */

        const responseText =
          await response.text();

        let data:
          | {
              id?: string;
              file?: string;
              error?: string;
              status?: string;
            }
          | null = null;

        if (
          responseText.trim()
        ) {
          try {
            data =
              JSON.parse(
                responseText
              );
          } catch (parseError) {
            console.error(
              "Resposta da API não é um JSON válido:",
              parseError
            );
          }
        }

        /* =====================================================
           ERRO DA API
           ===================================================== */

        if (!response.ok) {
          let errorMessage =
            "Não foi possível processar o documento.";

          if (
            data?.error
          ) {
            errorMessage =
              data.error;
          } else if (
            responseText.trim()
          ) {
            errorMessage =
              responseText;
          } else {
            errorMessage =
              `Erro do servidor (${response.status}).`;
          }

          throw new Error(
            errorMessage
          );
        }

        /* =====================================================
           RESPOSTA SEM JSON
           ===================================================== */

        if (!data) {
          throw new Error(
            "O servidor não retornou uma resposta válida."
          );
        }

        /* =====================================================
           ID AUSENTE
           ===================================================== */

        if (!data.id) {
          throw new Error(
            "A transcrição foi processada, mas o servidor não retornou o ID."
          );
        }

        /* =====================================================
           REDIRECT
           ===================================================== */

        router.push(
          `/review?id=${encodeURIComponent(
            data.id
          )}&file=${encodeURIComponent(
            data.file ||
              file.name
          )}`
        );
      } catch (error) {
        console.error(
          "Erro ao processar documento:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Erro ao processar o documento."
        );

        setProcessing(false);
      }
    };

  /* =========================================================
     LOADING
     ========================================================= */

  if (processing) {
    return (
      <Card
        elevation={0}
        className="qf-card"
        sx={{
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <CardContent
          sx={{
            minHeight:
              "360px",

            padding: {
              xs: "1.5rem",
              sm: "2rem",
            },

            display: "flex",
            flexDirection:
              "column",
            alignItems:
              "center",
            textAlign: "center",
          }}
        >
          {/* LOADING PRINCIPAL */}

          <Box
            sx={{
              width: "56px",
              height: "56px",
              borderRadius:
                "50%",
              backgroundColor:
                "var(--brand-soft)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            <CircularProgress
              size={28}
              thickness={3}
              sx={{
                color:
                  "var(--brand-strong)",
              }}
            />
          </Box>

          {/* TÍTULO */}

          <div
            className="qf-font-semibold qf-text-foreground"
            style={{
              fontSize:
                "1.25rem",
              lineHeight:
                "1.5rem",
              marginTop:
                "1rem",
            }}
          >
            Processando documento
          </div>

          {/* DESCRIÇÃO */}

          <div
            className="qf-text-sm qf-text-muted"
            style={{
              maxWidth:
                "380px",
              lineHeight:
                "1.45",
              marginTop:
                "0.5rem",
            }}
          >
            Estamos analisando o PDF e
            extraindo os dados automaticamente.
            Isso pode levar alguns segundos.
          </div>

          {/* ETAPAS */}

          <Box
            component="ul"
            className="qf-stepper"
            sx={{
              width: "100%",
              maxWidth:
                "360px",
              marginTop:
                "1.5rem",
            }}
          >
            {[
              "Enviando documento",
              "Analisando conteúdo",
              "Estruturando os dados",
            ].map(
              (label) => (
                <li
                  key={label}
                  className="qf-stepper-item"
                  style={{
                    border:
                      "1px solid var(--border)",
                    backgroundColor:
                      "var(--surface)",
                    padding:
                      "0.55rem 0.7rem",
                    marginBottom:
                      "0.45rem",
                    borderRadius:
                      "0.5rem",
                  }}
                >
                  <span
                    className="qf-stepper-number qf-stepper-number-active"
                    style={{
                      width:
                        "1.25rem",
                      height:
                        "1.25rem",
                      marginTop: 0,
                    }}
                  >
                    <CircularProgress
                      size={10}
                      thickness={5}
                      sx={{
                        color:
                          "var(--brand-strong)",
                      }}
                    />
                  </span>

                  <span
                    className="qf-stepper-label qf-stepper-label-active"
                    style={{
                      fontSize:
                        "0.75rem",
                      textAlign:
                        "left",
                    }}
                  >
                    {label}
                  </span>

                  <span
                    className="qf-stepper-status qf-stepper-status-active"
                    style={{
                      fontSize:
                        "0.625rem",
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.04em",
                    }}
                  >
                    Processando
                  </span>
                </li>
              )
            )}
          </Box>

          {/* RODAPÉ */}

          <div
            className="qf-text-xs qf-text-muted"
            style={{
              marginTop:
                "0.6rem",
            }}
          >
            Não feche esta página durante o processamento.
          </div>
        </CardContent>
      </Card>
    );
  }

  /* =========================================================
     UPLOAD
     ========================================================= */

  return (
    <Card
      elevation={0}
      className="qf-card"
      sx={{
        width: "100%",
      }}
    >
      <CardContent className="qf-card-padding">

        {/* ===================================================
            DROPZONE
            =================================================== */}

        {file ? (
          <Box className="qf-file-selected">

            <Box className="qf-file-icon">
              <Description />
            </Box>

            <Box className="qf-flex-1 qf-min-w-0">
              <div className="qf-text-base qf-font-semibold qf-text-foreground qf-truncate">
                {file.name}
              </div>

              <div className="qf-text-sm qf-text-muted">
                PDF selecionado
              </div>
            </Box>
          </Box>
        ) : (
          <Box
            {...getRootProps()}
            className={`qf-dropzone ${
              isDragActive
                ? "qf-dropzone-active"
                : ""
            }`}
          >
            <input
              {...getInputProps()}
            />

            <Box className="qf-dropzone-icon">
              <CloudUpload />
            </Box>

            <div
              className="qf-text-lg qf-font-semibold qf-text-foreground"
              style={{
                marginTop:
                  "1rem",
              }}
            >
              {isDragActive
                ? "Solte seu PDF aqui"
                : "Arraste seu PDF aqui"}
            </div>

            <div
              className="qf-text-base qf-text-muted"
              style={{
                marginTop:
                  "0.4rem",
              }}
            >
              ou{" "}
              <span className="qf-text-brand-strong qf-font-semibold">
                clique para selecionar
              </span>{" "}
              um arquivo
            </div>

            <div
              className="qf-text-sm qf-text-muted"
              style={{
                marginTop:
                  "1rem",
              }}
            >
              Apenas arquivos PDF · até 20 MB
            </div>
          </Box>
        )}

        {/* ===================================================
            TIPO
            =================================================== */}

        <FormControl
          fullWidth
          sx={{
            marginTop:
              "1.75rem",
          }}
        >
          <div className="qf-label">
            Tipo do documento
          </div>

          <RadioGroup
            value={type}
            onChange={(event) =>
              setType(
                event.target
                  .value as DocumentType
              )
            }
            className="qf-grid-radio"
            sx={{
              marginTop:
                "0.75rem",
            }}
          >

            {/* HOLERITE */}

            <FormControlLabel
              value={
                DocumentType.PAYSLIP
              }
              control={
                <Radio
                  sx={{
                    display:
                      "none",
                  }}
                />
              }
              label={
                <Box
                  className={`qf-radio-card ${
                    type ===
                    DocumentType.PAYSLIP
                      ? "qf-radio-card-active"
                      : ""
                  }`}
                >
                  <ReceiptLong
                    sx={{
                      color:
                        type ===
                        DocumentType.PAYSLIP
                          ? "var(--brand-strong)"
                          : "var(--muted-foreground)",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  />

                  <Box className="qf-flex-1">
                    <div className="qf-font-semibold qf-text-foreground">
                      Holerite
                    </div>

                    <div
                      className="qf-text-sm qf-text-muted qf-leading-relaxed"
                      style={{
                        marginTop:
                          "0.2rem",
                      }}
                    >
                      Proventos, descontos e bases de cálculo
                    </div>
                  </Box>

                  <span className="qf-radio-indicator">
                    {type ===
                      DocumentType.PAYSLIP && (
                      <span className="qf-radio-indicator-dot" />
                    )}
                  </span>
                </Box>
              }
              sx={{
                margin: 0,
                width: "100%",
                ".MuiFormControlLabel-label":
                  {
                    width: "100%",
                  },
              }}
            />

            {/* CARTÃO DE PONTO */}

            <FormControlLabel
              value={
                DocumentType.TIMESHEET
              }
              control={
                <Radio
                  sx={{
                    display:
                      "none",
                  }}
                />
              }
              label={
                <Box
                  className={`qf-radio-card ${
                    type ===
                    DocumentType.TIMESHEET
                      ? "qf-radio-card-active"
                      : ""
                  }`}
                >
                  <AccessTime
                    sx={{
                      color:
                        type ===
                        DocumentType.TIMESHEET
                          ? "var(--brand-strong)"
                          : "var(--muted-foreground)",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  />

                  <Box className="qf-flex-1">
                    <div className="qf-font-semibold qf-text-foreground">
                      Cartão de ponto
                    </div>

                    <div
                      className="qf-text-sm qf-text-muted qf-leading-relaxed"
                      style={{
                        marginTop:
                          "0.2rem",
                      }}
                    >
                      Marcações, jornada e horas extras
                    </div>
                  </Box>

                  <span className="qf-radio-indicator">
                    {type ===
                      DocumentType.TIMESHEET && (
                      <span className="qf-radio-indicator-dot" />
                    )}
                  </span>
                </Box>
              }
              sx={{
                margin: 0,
                width: "100%",
                ".MuiFormControlLabel-label":
                  {
                    width: "100%",
                  },
              }}
            />

          </RadioGroup>
        </FormControl>

        {/* ===================================================
            AÇÃO
            =================================================== */}

        <Box
          sx={{
            borderTop:
              "1px solid var(--border)",
            marginTop:
              "1.5rem",
            paddingTop:
              "1.5rem",
          }}
        >
          <Button
            fullWidth
            onClick={
              handleUpload
            }
            disabled={
              !file ||
              processing
            }
            className="qf-button qf-button-primary qf-button-block"
            sx={{
              textTransform:
                "none",
            }}
          >
            Processar documento
          </Button>

          <div
            className="qf-text-sm qf-text-muted"
            style={{
              marginTop:
                "0.75rem",
            }}
          >
            Você poderá revisar e corrigir todos os
            campos antes de exportar.
          </div>
        </Box>

        {/* ===================================================
            ERRO
            =================================================== */}

        {error && (
          <Box
            sx={{
              marginTop:
                "1rem",
            }}
          >
            <div className="qf-text-sm qf-text-destructive">
              {error}
            </div>
          </Box>
        )}

      </CardContent>
    </Card>
  );
}