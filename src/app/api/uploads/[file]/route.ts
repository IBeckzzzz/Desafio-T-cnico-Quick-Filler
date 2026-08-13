import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  try {
    const filePath = path.join(process.cwd(), "uploads", file);

    const pdf = await readFile(filePath);

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${file}"`,
      },
    });
  } catch (error) {
    console.error(error);

    return new Response("Arquivo não encontrado.", {
      status: 404,
    });
  }
}