import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

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
  try {
    const formData =
      await request.formData();

    const file =
      formData.get("arquivo");

    const tipoOriginal = String(
      formData.get("tipo") || ""
    );

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

    const uploadDir =
      path.join(
        process.cwd(),
        "uploads"
      );

    if (
      !fs.existsSync(
        uploadDir
      )
    ) {
      fs.mkdirSync(
        uploadDir,
        {
          recursive: true,
        }
      );
    }

    const fileName =
      file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

    const filePath =
      path.join(
        uploadDir,
        fileName
      );

    const bytes =
      await file.arrayBuffer();

    await writeFile(
      filePath,
      Buffer.from(bytes)
    );

    console.log(
      "================================"
    );
    console.log(
      "PDF RECEBIDO"
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
      "================================"
    );

    const dados =
      await processDocument(
        filePath,
        tipo
      );

    const id =
      crypto.randomUUID();

    saveTranscription({
      id,
      file: fileName,
      tipo,
      dados,
    });

    console.log(
      "Transcrição salva:",
      id
    );

    return NextResponse.json(
      {
        id,
        status: "processed",
        tipo,
        file: fileName,
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
  }
}