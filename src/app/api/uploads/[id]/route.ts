import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

import { getTranscription } from "@/lib/transcriptions";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const transcription =
      await getTranscription(id);

    if (!transcription) {
      return NextResponse.json(
        {
          error:
            "Transcrição não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    if (!transcription.pdfPath) {
      return NextResponse.json(
        {
          error:
            "PDF não associado à transcrição.",
        },
        {
          status: 404,
        }
      );
    }

    console.log(
      "================================"
    );

    console.log(
      "BUSCANDO PDF"
    );

    console.log(
      "ID:",
      id
    );

    console.log(
      "PDF Path:",
      transcription.pdfPath
    );

    console.log(
      "================================"
    );

    const blob =
      await get(
        transcription.pdfPath,
        {
          access: "private",
          useCache: false,
        }
      );

    if (!blob) {
      return NextResponse.json(
        {
          error:
            "Arquivo PDF não encontrado no Blob.",
        },
        {
          status: 404,
        }
      );
    }

    return new Response(
      blob.stream,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="${transcription.file}"`,

          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erro ao buscar PDF:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar o PDF.",
      },
      {
        status: 500,
      }
    );
  }
}