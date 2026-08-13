import fs from "fs";
import path from "path";

import type { DynamicDocument } from "@/services/ai/processDocument";

export interface TranscriptionData {
  id: string;
  file: string;
  tipo: string;
  dados: DynamicDocument;
}

const dataDir =
  path.join(
    process.cwd(),
    "data"
  );

const dataFile =
  path.join(
    dataDir,
    "transcriptions.json"
  );

/* =========================================================
   GARANTIR ARQUIVO
   ========================================================= */

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, {
      recursive: true,
    });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
      dataFile,
      JSON.stringify(
        {},
        null,
        2
      ),
      "utf-8"
    );
  }
}

/* =========================================================
   LER BANCO LOCAL
   ========================================================= */

function readStore(): Record<
  string,
  TranscriptionData
> {
  ensureStorage();

  try {
    const content =
      fs.readFileSync(
        dataFile,
        "utf-8"
      );

    if (!content.trim()) {
      return {};
    }

    return JSON.parse(content);
  } catch (error) {
    console.error(
      "Erro ao ler transcriptions.json:",
      error
    );

    return {};
  }
}

/* =========================================================
   SALVAR BANCO LOCAL
   ========================================================= */

function writeStore(
  store: Record<
    string,
    TranscriptionData
  >
) {
  ensureStorage();

  fs.writeFileSync(
    dataFile,
    JSON.stringify(
      store,
      null,
      2
    ),
    "utf-8"
  );
}

/* =========================================================
   SALVAR NOVA TRANSCRIÇÃO
   ========================================================= */

export function saveTranscription(
  data: TranscriptionData
) {
  const store =
    readStore();

  store[data.id] = data;

  writeStore(store);

  console.log(
    "Transcrição salva no armazenamento:",
    data.id
  );

  return data;
}

/* =========================================================
   BUSCAR TRANSCRIÇÃO
   ========================================================= */

export function getTranscription(
  id: string
) {
  const store =
    readStore();

  return (
    store[id] ??
    null
  );
}

/* =========================================================
   ATUALIZAR TRANSCRIÇÃO
   ========================================================= */

export function updateTranscription(
  id: string,
  dados: DynamicDocument
) {
  const store =
    readStore();

  const transcription =
    store[id];

  if (!transcription) {
    console.error(
      "Transcrição não encontrada para atualização:",
      id
    );

    return null;
  }

  const updated: TranscriptionData =
    {
      ...transcription,
      dados,
    };

  store[id] =
    updated;

  writeStore(store);

  console.log(
    "Transcrição atualizada:",
    id
  );

  return updated;
}

/* =========================================================
   TODAS AS TRANSCRIÇÕES
   ========================================================= */

export function getAllTranscriptions() {
  const store =
    readStore();

  return Object.values(
    store
  );
}