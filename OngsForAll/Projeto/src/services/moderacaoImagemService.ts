import fs from "fs";
import path from "path";
import * as imageModeracaoRepo from "../repositories/imageModeracaoRepository";
import { TipoReferencia } from "../repositories/imageModeracaoRepository";

const SCORE_AUTO_REJECT = parseFloat(process.env.MODERATION_SCORE_AUTO_REJECT ?? "0.70");

export type ModeracaoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; rejeitado: true; motivo: string }
  | { ok: false; rejeitado: false; erro: string };

async function callModerationAPI(base64: string, mimeType: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function moverParaPublico(
  moderacaoId: number,
  tempPath: string,
  publicDir: string,
  filename: string,
  publicUrlBase: string
): Promise<ModeracaoResult> {
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  const destPath = path.join(publicDir, filename);
  fs.renameSync(tempPath, destPath);
  const publicUrl = `${publicUrlBase}/${filename}`;
  await imageModeracaoRepo.atualizarAprovado(moderacaoId, publicUrl);
  return { ok: true, publicUrl };
}

export async function processarUploadComModeracao(params: {
  tempPath: string;
  publicDir: string;
  publicUrlBase: string;
  filename: string;
  mimeType: string;
  tipo: TipoReferencia;
  referenciaId?: number;
}): Promise<ModeracaoResult> {
  const { tempPath, publicDir, publicUrlBase, filename, mimeType, tipo, referenciaId } = params;

  const moderacaoId = await imageModeracaoRepo.criar({
    tipo,
    referenciaId,
    nomeArquivo: filename,
    tempPath,
  });

  try {
    if (!process.env.OPENAI_API_KEY) {
      return moverParaPublico(moderacaoId, tempPath, publicDir, filename, publicUrlBase);
    }

    const fileBuffer = fs.readFileSync(tempPath);
    const base64 = fileBuffer.toString("base64");

    let apiResult: any;
    try {
      apiResult = await callModerationAPI(base64, mimeType);
    } catch (err: any) {
      await imageModeracaoRepo.atualizarErro(moderacaoId, err.message ?? "API indisponível");
      // Fail open: approve on API error to not block users
      return moverParaPublico(moderacaoId, tempPath, publicDir, filename, publicUrlBase);
    }

    if (!apiResult) {
      return moverParaPublico(moderacaoId, tempPath, publicDir, filename, publicUrlBase);
    }

    const result = apiResult.results?.[0];
    if (!result) {
      await imageModeracaoRepo.atualizarErro(moderacaoId, "Resposta inesperada da API");
      return moverParaPublico(moderacaoId, tempPath, publicDir, filename, publicUrlBase);
    }

    if (result.flagged) {
      const flaggedCats: string[] = Object.entries(result.categories as Record<string, boolean>)
        .filter(([, v]) => v === true)
        .map(([k]) => k);

      await imageModeracaoRepo.atualizarRejeitado(moderacaoId, flaggedCats);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return {
        ok: false,
        rejeitado: true,
        motivo: "A imagem foi identificada como inapropriada e não pode ser publicada.",
      };
    }

    const scores = result.category_scores as Record<string, number>;
    const maxScore = Math.max(...Object.values(scores));

    if (maxScore >= SCORE_AUTO_REJECT) {
      await imageModeracaoRepo.atualizarRejeitado(moderacaoId, []);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return {
        ok: false,
        rejeitado: true,
        motivo: "A imagem foi identificada como inapropriada e não pode ser publicada.",
      };
    }

    return moverParaPublico(moderacaoId, tempPath, publicDir, filename, publicUrlBase);
  } catch (err: any) {
    await imageModeracaoRepo.atualizarErro(moderacaoId, err.message ?? "Erro desconhecido");
    return { ok: false, rejeitado: false, erro: "Erro ao processar a imagem. Tente novamente." };
  }
}
