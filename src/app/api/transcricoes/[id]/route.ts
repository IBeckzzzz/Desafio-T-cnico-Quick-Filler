import { NextResponse } from "next/server";

import {
  getTranscription,
  updateTranscription,
} from "@/lib/transcriptions";

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

    return NextResponse.json(
      {
        id: transcription.id,
        file: transcription.file,
        tipo: transcription.tipo,
        status: "concluido",
        value: transcription.dados,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao buscar transcrição:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar transcrição.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
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

    const body =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "Dados inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    const dados =
      body?.value ??
      body?.dados;

    if (
      dados === undefined ||
      dados === null ||
      typeof dados !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "O campo 'value' é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const updated =
      await updateTranscription(
        id,
        dados
      );

    if (!updated) {
      return NextResponse.json(
        {
          error:
            "Não foi possível atualizar a transcrição.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Transcrição atualizada com sucesso.",
        id: updated.id,
        value: updated.dados,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao atualizar transcrição:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar transcrição.",
      },
      {
        status: 500,
      }
    );
  }
}