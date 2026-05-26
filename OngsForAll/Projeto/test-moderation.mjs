/**
 * Teste isolado das APIs de moderação.
 * Uso: node test-moderation.mjs <caminho-da-imagem>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
require("dotenv").config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;

console.log("OPENAI_API_KEY :", OPENAI_API_KEY  ? `definida (${OPENAI_API_KEY.slice(0,12)}...)`  : "NÃO definida");
console.log("GEMINI_API_KEY :", GEMINI_API_KEY  ? `definida (${GEMINI_API_KEY.slice(0,12)}...)`  : "NÃO definida");

const imagePath = process.argv[2];
if (!imagePath || !fs.existsSync(imagePath)) {
  console.error("\nUso: node test-moderation.mjs <caminho-da-imagem>");
  process.exit(1);
}

const ext = path.extname(imagePath).toLowerCase();
const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
const mimeType = mimeMap[ext] || "image/jpeg";

const fileBuffer = fs.readFileSync(imagePath);
const base64 = fileBuffer.toString("base64");
const sizeKb = (fileBuffer.length / 1024).toFixed(0);
console.log(`\nImagem: ${imagePath} (${sizeKb} KB | ${mimeType})`);

const VISION_PROMPT =
  "You are a content moderator for a professional platform used by NGOs and businesses. " +
  "Does this image contain any of the following: blood, open wounds, gore, graphic injuries, " +
  "visible trauma, severe bruising, or any content that would be inappropriate for a " +
  "professional organization's logo or profile picture? Answer only YES or NO.";

// ── 1. OpenAI Moderation API ────────────────────────────────────────────────
if (OPENAI_API_KEY) {
  console.log("\n══════════════════ OpenAI Moderation API ══════════════════");
  const modRes = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }],
    }),
  });
  if (!modRes.ok) {
    console.error("Erro:", modRes.status, (await modRes.text()).slice(0, 300));
  } else {
    const modData = await modRes.json();
    const result = modData.results?.[0];
    console.log("flagged:", result?.flagged);
    Object.entries(result?.category_scores || {})
      .filter(([, v]) => v > 0.001)
      .sort(([, a], [, b]) => b - a)
      .forEach(([k, v]) => console.log(`  ${k.padEnd(32)} ${v.toFixed(6)}`));
  }
}

// ── 2. Gemini Vision (gratuito) ─────────────────────────────────────────────
if (GEMINI_API_KEY) {
  console.log("\n════════════════ Gemini 1.5 Flash Vision (grátis) ════════");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const gemRes = await fetch(url, {
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
  if (!gemRes.ok) {
    console.error("Erro:", gemRes.status, (await gemRes.text()).slice(0, 300));
  } else {
    const gemData = await gemRes.json();
    const blockReason = gemData.promptFeedback?.blockReason;
    const finishReason = gemData.candidates?.[0]?.finishReason;
    const content = gemData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("blockReason:", blockReason ?? "nenhum");
    console.log("finishReason:", finishReason ?? "nenhum");
    console.log("Resposta:", JSON.stringify(content));
    const rejeitado = blockReason || finishReason === "SAFETY" || finishReason === "OTHER" || content.trim().toUpperCase().startsWith("YES");
    console.log("Rejeitar?", rejeitado ? "✓ SIM (imagem seria rejeitada)" : "✗ NÃO (imagem seria aceita)");
  }
}

// ── 3. OpenAI GPT-4o Vision ─────────────────────────────────────────────────
if (OPENAI_API_KEY) {
  console.log("\n═════════════════════ OpenAI GPT-4o Vision ════════════════");
  const visionRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
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
  if (!visionRes.ok) {
    console.error("Erro:", visionRes.status, (await visionRes.text()).slice(0, 300));
  } else {
    const visionData = await visionRes.json();
    const content = visionData.choices?.[0]?.message?.content ?? "";
    console.log("Resposta:", JSON.stringify(content));
    console.log("Rejeitar?", content.trim().toUpperCase().startsWith("YES") ? "✓ SIM" : "✗ NÃO");
  }
}

console.log("\nTeste concluído.\n");
