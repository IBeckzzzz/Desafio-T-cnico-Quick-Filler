import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

import { saveTranscription } from "@/lib/transcriptions";
import { processDocument } from "@/services/ai/processDocument";

function normalizeTipo(tipo: string) {
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

  return normalized || "outro";
}

export async function POST(
  request: Request
) {
  let tempFilePath: string | null = null;

  try {
    const formData =
      await request.formData();

    const file =
      formData.get("arquivo");

    const tipoOriginal = String(
      formData.get("tipo") || ""
    );

    /* =====================================================
       VALIDAR ARQUIVO
       ===================================================== */

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Arquivo não enviado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.type !==
      "application/pdf"
    ) {
      return NextResponse.json(
        {
          error:
            "Apenas arquivos PDF são permitidos.",
        },
        {
          status: 400,
        }
      );
    }

    const tipo =
      normalizeTipo(
        tipoOriginal
      );

    /* =====================================================
       NOME DO ARQUIVO
       ===================================================== */

    const fileName =
      file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

    const id =
      crypto.randomUUID();

    /*
     * Cada PDF recebe um caminho único no Blob.
     */
    const blobPath =
      `uploads/${id}-${fileName}`;

    /* =====================================================
       PDF → VERCEL BLOB
       ===================================================== */

    console.log(
      "================================"
    );

    console.log(
      "ENVIANDO PDF PARA VERCEL BLOB"
    );

    console.log(
      `Arquivo: ${fileName}`
    );

    console.log(
      `Tipo original: ${tipoOriginal}`
    );

    console.log(
      `Tipo normalizado: ${tipo}`
    );

    console.log(
      `Blob path: ${blobPath}`
    );

    console.log(
      "================================"
    );

    const blob =
      await put(
        blobPath,
        file,
        {
          access: "private",
          allowOverwrite: false,
        }
      );

    console.log(
      "PDF salvo no Vercel Blob:"
    );

    console.log(
      blob.pathname
    );

    /* =====================================================
       CRIAR ARQUIVO TEMPORÁRIO
       ===================================================== */

    /*
     * A Gemini recebe o PDF como bytes/base64 dentro
     * do processDocument, mas a função atual do projeto
     * trabalha com filePath.
     *
     * /tmp é gravável durante a execução da Function.
     */

    const bytes =
      await file.arrayBuffer();

    tempFilePath =
      path.join(
        os.tmpdir(),
        `${id}-${fileName}`
      );

    await writeFile(
      tempFilePath,
      Buffer.from(bytes)
    );

    console.log(
      "PDF temporário criado:"
    );

    console.log(
      tempFilePath
    );

    /* =====================================================
       GEMINI
       ===================================================== */

    console.log(
      "Iniciando extração..."
    );

    const dados =
      await processDocument(
        tempFilePath,
        tipo
      );

    console.log(
      "Extração concluída."
    );

    /* =====================================================
       SALVAR TRANSCRIÇÃO
       ===================================================== */

    /*
     * IMPORTANTE:
     * O TranscriptionData precisa possuir:
     *
     * pdfPath: string
     *
     * para conseguirmos recuperar o PDF do Blob
     * posteriormente na Review.
     */

    await saveTranscription({
      id,

      file:
        fileName,

      tipo,

      pdfPath:
        blob.pathname,

      dados,
    });

    console.log(
      "================================"
    );

    console.log(
      "TRANSCRIÇÃO SALVA"
    );

    console.log(
      `ID: ${id}`
    );

    console.log(
      `PDF: ${blob.pathname}`
    );

    console.log(
      "================================"
    );

    /* =====================================================
       RESPOSTA
       ===================================================== */

    return NextResponse.json(
      {
        id,

        status:
          "processed",

        tipo,

        file:
          fileName,

        dados,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao processar transcrição:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar o documento.",
      },
      {
        status: 500,
      }
    );
  } finally {
    /* =====================================================
       LIMPAR ARQUIVO TEMPORÁRIO
       ===================================================== */

    if (tempFilePath) {
      try {
        const fs =
          await import(
            "fs/promises"
          );

        await fs.unlink(
          tempFilePath
        );

        console.log(
          "Arquivo temporário removido:"
        );

        console.log(
          tempFilePath
        );
      } catch {
        /*
         * O arquivo temporário é descartável.
         * Se já tiver sido removido pela plataforma,
         * não precisamos fazer nada.
         */
      }
    }
  }
}