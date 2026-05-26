import fs from "fs";
import path from "path";
import * as imageModeracaoRepo from "../repositories/imageModeracaoRepository";
import { TipoReferencia } from "../repositories/imageModeracaoRepository";

// Limiar geral: qualquer categoria com score acima rejeita
const SCORE_AUTO_REJECT = parseFloat(process.env.MODERATION_SCORE_AUTO_REJECT ?? "0.40");

// Categorias sensíveis com limiar mais baixo (ferimentos, sangue, conteúdo adulto)
const SENSITIVE_CATEGORIES: Record<string, number> = {
  "sexual":                    0.10,
  "sexual/minors":             0.05,
  "violence":                  0.05,
  "violence/graphic":          0.05,
  "self-harm":                 0.05,
  "self-harm/intent":          0.05,
  "self-harm/instructions":    0.05,
  "illicit/violent":           0.05,
  "harassment/threatening":    0.10,
  "hate/threatening":          0.10,
};

const MOTIVO_REJEICAO =
  "Imagem recusada pela moderação de conteúdo: a imagem enviada contém conteúdo inapropriado e não pode ser publicada. Por favor, selecione outra imagem.";

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
    const errText = await response.text();
    throw new Error(`OpenAI Moderation ${response.status}: ${errText.slice(0, 200)}`);
  }

  return response.json();
}

const VISION_PROMPT =
  "You are a content moderator for a professional platform used by NGOs and businesses. " +
  "Does this image contain any of the following: blood, open wounds, gore, graphic injuries, " +
  "visible trauma, severe bruising, or any content that would be inappropriate for a " +
  "professional organization's logo or profile picture? Answer only YES or NO.";

// Verificação visual gratuita via Google Gemini
async function callGeminiVision(base64: string, mimeType: string): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não definida");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: VISION_PROMPT },
        ],
      }],
      generationConfig: { maxOutputTokens: 200, temperature: 0 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Vision ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data: any = await response.json();

  // Se o próprio Gemini bloqueou a resposta por conteúdo inapropriado → rejeitar
  if (data.promptFeedback?.blockReason) {
    console.log(`[moderacao][vision][gemini] bloqueado pelo Gemini: ${data.promptFeedback.blockReason}`);
    return true;
  }

  const answer = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim().toUpperCase();
  console.log(`[moderacao][vision][gemini] "${answer}"`);

  // Também rejeitar se o candidato foi bloqueado por safety ratings
  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason === "SAFETY" || finishReason === "OTHER") {
    console.log(`[moderacao][vision][gemini] candidato bloqueado: finishReason=${finishReason}`);
    return true;
  }

  return answer.startsWith("YES");
}

// Verificação visual via OpenAI GPT-4o (requer créditos)
async function callOpenAIVision(base64: string, mimeType: string): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não definida");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 20,
      temperature: 0,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: VISION_PROMPT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" } },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Vision ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data: any = await response.json();
  const answer = (data.choices?.[0]?.message?.content ?? "").trim().toUpperCase();
  console.log(`[moderacao][vision][openai] "${answer}"`);
  return answer.startsWith("YES");
}

// Tenta Gemini (gratuito) → depois OpenAI (requer créditos)
async function callVisionCheck(base64: string, mimeType: string): Promise<boolean> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGeminiVision(base64, mimeType);
    } catch (err: any) {
      console.warn("[moderacao][vision] Gemini falhou, tentando OpenAI:", err.message?.slice(0, 120));
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAIVision(base64, mimeType);
    } catch (err: any) {
      console.warn("[moderacao][vision] OpenAI Vision falhou:", err.message?.slice(0, 120));
    }
  }

  throw new Error("Nenhuma chave de visão disponível (GEMINI_API_KEY ou OPENAI_API_KEY com créditos)");
}

function avaliarScores(scores: Record<string, number>): boolean {
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore >= SCORE_AUTO_REJECT) return true;

  for (const [cat, threshold] of Object.entries(SENSITIVE_CATEGORIES)) {
    if ((scores[cat] ?? 0) >= threshold) return true;
  }

  return false;
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
    const hasAnyKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!hasAnyKey) {
      return moverParaPublico(moderacaoId, tempPath, publicDir, filename, publicUrlBase);
    }

    const fileBuffer = fs.readFileSync(tempPath);
    const base64 = fileBuffer.toString("base64");

    // ── Etapa 1: OpenAI Moderation API (gratuita, se disponível) ───────────
    let moderacaoFlagged = false;
    let scores: Record<string, number> = {};
    let categories: Record<string, boolean> = {};

    if (process.env.OPENAI_API_KEY) {
      try {
        const apiResult = await callModerationAPI(base64, mimeType);
        if (apiResult?.results?.[0]) {
          const result = apiResult.results[0];
          moderacaoFlagged = result.flagged;
          scores = result.category_scores as Record<string, number>;
          categories = result.categories as Record<string, boolean>;

          const relevantes = Object.entries(scores)
            .filter(([, v]) => v > 0.01)
            .sort(([, a], [, b]) => b - a)
            .map(([k, v]) => `${k}=${v.toFixed(4)}`);
          console.log(`[moderacao] flagged=${moderacaoFlagged} | ${relevantes.join(" | ")}`);
        }
      } catch (err: any) {
        console.warn("[moderacao] Moderation API falhou:", err.message?.slice(0, 120));
      }
    }

    // Rejeitar imediatamente se Moderation API detectou problema
    if (moderacaoFlagged || avaliarScores(scores)) {
      const flaggedCats: string[] = Object.entries(categories)
        .filter(([, v]) => v === true)
        .map(([k]) => k);
      for (const [cat, threshold] of Object.entries(SENSITIVE_CATEGORIES)) {
        if ((scores[cat] ?? 0) >= threshold && !flaggedCats.includes(cat)) {
          flaggedCats.push(`${cat}(score:${scores[cat].toFixed(2)})`);
        }
      }
      await imageModeracaoRepo.atualizarRejeitado(moderacaoId, flaggedCats);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return { ok: false, rejeitado: true, motivo: MOTIVO_REJEICAO };
    }

    // ── Etapa 2: Verificação visual semântica ───────────────────────────────
    let rejeitadoPorVision = false;
    try {
      rejeitadoPorVision = await callVisionCheck(base64, mimeType);
      if (rejeitadoPorVision) {
        console.log("[moderacao][vision] imagem rejeitada pelo verificador visual");
      }
    } catch (visionErr: any) {
      console.warn("[moderacao][vision] verificação visual falhou (fail open):", visionErr.message?.slice(0, 120));
    }

    if (rejeitadoPorVision) {
      await imageModeracaoRepo.atualizarRejeitado(moderacaoId, ["vision:graphic-content"]);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return { ok: false, rejeitado: true, motivo: MOTIVO_REJEICAO };
    }

    return moverParaPublico(moderacaoId, tempPath, publicDir, filename, publicUrlBase);
  } catch (err: any) {
    await imageModeracaoRepo.atualizarErro(moderacaoId, err.message ?? "Erro desconhecido");
    return { ok: false, rejeitado: false, erro: "Erro ao processar a imagem. Tente novamente." };
  }
}
