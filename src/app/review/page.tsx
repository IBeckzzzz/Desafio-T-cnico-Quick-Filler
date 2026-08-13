"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
} from "@mui/material";

import PayslipReview from "@/components/review/PayslipReview";
import TimesheetReview from "@/components/review/TimesheetReview";

/* =========================================================
   TIPOS
   ========================================================= */

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

interface Transcription {
  id: string;
  file: string;
  tipo: string;
  dados: DynamicDocument;
}

/* =========================================================
   NORMALIZAR TIPO
   ========================================================= */

function normalizeTipo(tipo: string) {
  return (tipo || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

/* =========================================================
   VALIDAR DOCUMENTO DINÂMICO
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

  for (const page of document.pages) {
    if (
      !page ||
      typeof page.page !==
        "number"
    ) {
      return false;
    }

    if (
      !Array.isArray(
        page.metadata
      )
    ) {
      return false;
    }

    if (
      !Array.isArray(
        page.sections
      )
    ) {
      return false;
    }

    for (
      const metadata of page.metadata
    ) {
      if (
        typeof metadata?.label !==
          "string" ||
        typeof metadata?.value !==
          "string"
      ) {
        return false;
      }
    }

    for (
      const section of page.sections
    ) {
      if (
        typeof section?.name !==
          "string"
      ) {
        return false;
      }

      if (
        !Array.isArray(
          section.columns
        )
      ) {
        return false;
      }

      if (
        !Array.isArray(
          section.rows
        )
      ) {
        return false;
      }

      for (
        const row of section.rows
      ) {
        if (
          !row ||
          typeof row !==
            "object"
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

/* =========================================================
   IDENTIFICAR CARTÃO DE PONTO
   ========================================================= */

function isTimesheetType(
  tipo: string
) {
  return (
    tipo === "cartao-ponto" ||
    tipo === "cartao-de-ponto" ||
    tipo === "folha-ponto" ||
    tipo === "folha-de-ponto" ||
    tipo === "timesheet" ||
    tipo === "ponto"
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function ReviewPage() {
  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id") ?? "";

  const file =
    searchParams.get("file") ?? "";

  const [status, setStatus] =
    useState<
      "loading" | "ready" | "error"
    >("loading");

  const [error, setError] =
    useState("");

  const [transcription, setTranscription] =
    useState<Transcription | null>(
      null
    );

  /* =======================================================
     CARREGAR TRANSCRIÇÃO
     ======================================================= */

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;

    async function carregar() {
      try {

        console.log(
          "================================"
        );

        console.log(
          "[Review] carregando transcrição"
        );

        console.log(
          "ID:",
          id
        );

        console.log(
          "================================"
        );

        const response =
          await fetch(
            `/api/transcricoes/${encodeURIComponent(
              id
            )}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        /*
         * Não usamos response.json()
         * diretamente.
         *
         * Primeiro lemos o corpo como texto,
         * para evitar:
         *
         * Unexpected end of JSON input
         */

        const responseText =
          await response.text();

        let data: {
  id?: string;
  file?: string;
  tipo?: string;
  status?: string;
  value?: unknown;
  dados?: unknown;
  error?: string;
} | null = null;

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
              "[Review] resposta não é JSON válido:",
              parseError
            );

            throw new Error(
              `O servidor retornou uma resposta inválida (${response.status}).`
            );
          }
        }

        console.log(
          "[Review] status:",
          response.status
        );

        console.log(
          "[Review] resposta:",
          data
        );

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `Não foi possível carregar a transcrição (${response.status}).`
          );
        }

        if (!data) {
          throw new Error(
            "O servidor não retornou os dados da transcrição."
          );
        }

        /*
         * A API nova retorna:
         *
         * value: DynamicDocument
         *
         * Mas mantemos dados como fallback
         * para compatibilidade.
         */

        const dados =
          data?.value ??
          data?.dados;

        if (
          !isDynamicDocument(dados)
        ) {
          throw new Error(
            "A transcrição foi encontrada, mas não contém dados válidos no formato esperado."
          );
        }

        const normalized: Transcription =
          {
            id:
              data?.id ??
              id,

            file:
              data?.file ??
              file,

            tipo:
              data?.tipo ??
              "",

            dados,
          };

        if (!active) {
          return;
        }

        setTranscription(
          normalized
        );

        setStatus("ready");
      } catch (err) {
        console.error(
          "[Review] erro:",
          err
        );

        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar a transcrição."
        );

        setStatus("error");
      }
    }

    carregar();

    return () => {
      active = false;
    };
  }, [id, file]);

  /* =======================================================
     ID AUSENTE
     ======================================================= */

  if (!id) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#f5f7fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "650px",
          }}
        >
          <Alert
            severity="error"
            sx={{
              width: "100%",
            }}
          >
            ID da transcrição não informado.
          </Alert>

          <Button
            variant="outlined"
            onClick={() => {
              window.location.href = "/";
            }}
            sx={{
              marginTop: "1rem",
              textTransform: "none",
            }}
          >
            Voltar
          </Button>
        </Box>
      </Box>
    );
  }

  /* =======================================================
     LOADING
     ======================================================= */

  if (
    status === "loading"
  ) {
    return (
      <Box
        sx={{
          minHeight:
            "100vh",
          backgroundColor:
            "#f5f7fa",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection:
              "column",
            alignItems:
              "center",
            gap: "1rem",
          }}
        >
          <CircularProgress
            size={32}
            sx={{
              color:
                "#173772",
            }}
          />

          <Box
            sx={{
              color:
                "#64748b",
              fontSize:
                "0.9rem",
            }}
          >
            Carregando documento...
          </Box>
        </Box>
      </Box>
    );
  }

  /* =======================================================
     ERRO
     ======================================================= */

  if (
    status === "error" ||
    !transcription
  ) {
    return (
      <Box
        sx={{
          minHeight:
            "100vh",
          backgroundColor:
            "#f5f7fa",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          padding: "1.5rem",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth:
              "650px",
          }}
        >
          <Alert
            severity="error"
            sx={{
              width: "100%",
            }}
          >
            {error ||
              "Não foi possível carregar a transcrição."}
          </Alert>

          <Button
            variant="outlined"
            onClick={() => {
              window.location.href =
                "/";
            }}
            sx={{
              marginTop:
                "1rem",
              textTransform:
                "none",
            }}
          >
            Voltar
          </Button>
        </Box>
      </Box>
    );
  }

  /* =======================================================
     TIPO
     ======================================================= */

  const tipo =
    normalizeTipo(
      transcription.tipo
    );

  const dados =
    transcription.dados;

  /* =======================================================
     VALIDAR FORMATO
     ======================================================= */

  const formatoValido =
    isDynamicDocument(
      dados
    );

  if (!formatoValido) {
    return (
      <Box
        sx={{
          minHeight:
            "100vh",
          backgroundColor:
            "#f5f7fa",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          padding: "1.5rem",
        }}
      >
        <Alert
          severity="warning"
          sx={{
            maxWidth:
              "700px",
            width: "100%",
          }}
        >
          O documento foi processado, mas os dados
          retornados pela IA não estão no formato
          dinâmico esperado.
          <br />
          <br />
          Verifique o console para visualizar a resposta
          recebida da Gemini.
        </Alert>
      </Box>
    );
  }

  /* =======================================================
     DECISÃO DA TELA
     ======================================================= */

  const isTimesheet =
    isTimesheetType(
      tipo
    );

  console.log(
    "================================"
  );

  console.log(
    "[Review] decisão"
  );

  console.log(
    "Tipo:",
    tipo
  );

  console.log(
    "Document type IA:",
    dados.document_type
  );

  console.log(
    "Layout:",
    dados.layout_name
  );

  console.log(
    "Páginas:",
    dados.pages.length
  );

  console.log(
    "Tela:",
    isTimesheet
      ? "TimesheetReview"
      : "PayslipReview"
  );

  console.log(
    "================================"
  );

  /* =======================================================
     CARTÃO DE PONTO
     ======================================================= */

  if (
    isTimesheet
  ) {
    return (
      <TimesheetReview
        id={
          transcription.id
        }
        file={
          transcription.file
        }
        dados={dados}
      />
    );
  }

  /* =======================================================
     HOLERITE
     ======================================================= */

  return (
    <PayslipReview
      id={
        transcription.id
      }
      file={
        transcription.file
      }
      dados={dados}
    />
  );
}