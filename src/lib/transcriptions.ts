import { get, put } from "@vercel/blob";

import type { DynamicDocument } from "@/services/ai/processDocument";

export interface TranscriptionData {
  id: string;
  file: string;
  tipo: string;

  /*
   * Caminho do PDF dentro do Vercel Blob.
   */
  pdfPath: string;

  dados: DynamicDocument;
}

/* =========================================================
   CAMINHO DA TRANSCRIÇÃO
   ========================================================= */

function transcriptionPath(
  id: string
) {
  return `transcriptions/${id}.json`;
}

/* =========================================================
   SALVAR TRANSCRIÇÃO
   ========================================================= */

export async function saveTranscription(
  data: TranscriptionData
) {
  await put(
    transcriptionPath(data.id),
    JSON.stringify(data),
    {
      access: "private",
      allowOverwrite: true,
    }
  );

  console.log(
    "Transcrição salva no Vercel Blob:",
    data.id
  );

  return data;
}

/* =========================================================
   BUSCAR TRANSCRIÇÃO
   ========================================================= */

export async function getTranscription(
  id: string
) {
  const result =
    await get(
      transcriptionPath(id),
      {
        access: "private",
        useCache: false,
      }
    );

  if (!result) {
    return null;
  }

  const text =
    await new Response(
      result.stream
    ).text();

  return JSON.parse(
    text
  ) as TranscriptionData;
}

/* =========================================================
   ATUALIZAR TRANSCRIÇÃO
   ========================================================= */

export async function updateTranscription(
  id: string,
  dados: DynamicDocument
) {
  const transcription =
    await getTranscription(id);

  if (!transcription) {
    return null;
  }

  const updated: TranscriptionData =
    {
      ...transcription,
      dados,
    };

  await saveTranscription(
    updated
  );

  return updated;
}