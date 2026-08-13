import { NextResponse } from "next/server";

import { getTranscription } from "@/lib/transcriptions";
import { generateExcel } from "@/services/excel/excelService";

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

    console.log(
      "================================"
    );

    console.log(
      "GERANDO EXCEL"
    );

    console.log(
      "ID:",
      id
    );

    console.log(
      "Tipo:",
      transcription.tipo
    );

    console.log(
      "================================"
    );

    const excelBuffer =
      await generateExcel(
        transcription.dados
      );

    /*
     * Converte o Buffer para Uint8Array
     * para compatibilidade com Response
     * no ambiente de produção.
     */
    const excelBody =
      new Uint8Array(
        excelBuffer
      );

    return new Response(
      excelBody,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename="quick-filler-${id}.xlsx"`,

          "Content-Length":
            String(
              excelBody.byteLength
            ),
        },
      }
    );
  } catch (error) {
    console.error(
      "Erro ao gerar Excel:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao gerar a planilha.",
      },
      {
        status: 500,
      }
    );
  }
}