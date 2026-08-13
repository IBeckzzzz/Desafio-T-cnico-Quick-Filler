import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

interface RouteParams {
  params: Promise<{
    file: string;
  }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { file } =
      await params;

    if (!file) {
      return NextResponse.json(
        {
          error:
            "Arquivo não informado.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * O PDF agora está armazenado no
     * Vercel Blob em:
     *
     * uploads/nome-do-arquivo.pdf
     */

    const blobPath =
      `uploads/${file}`;

    console.log(
      "================================"
    );

    console.log(
      "BUSCANDO PDF NO VERCEL BLOB"
    );

    console.log(
      "Path:",
      blobPath
    );

    console.log(
      "================================"
    );

    const blob =
      await get(
        blobPath,
        {
          access: "private",
          useCache: false,
        }
      );

    if (!blob) {
      return NextResponse.json(
        {
          error:
            "Arquivo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * O Blob privado fornece o conteúdo
     * através de stream.
     */

    return new Response(
      blob.stream,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="${file}"`,

          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erro ao buscar PDF no Vercel Blob:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar o arquivo.",
      },
      {
        status: 500,
      }
    );
  }
}