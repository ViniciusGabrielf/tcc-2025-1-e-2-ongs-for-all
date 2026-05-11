import { FastifyRequest, FastifyReply } from "fastify";
import * as evidenciaService from "../services/evidenciaService";
import * as notificacaoService from "../services/notificacaoService";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "public", "uploads", "evidencias");
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 3 * 1024 * 1024; // 3MB

async function getNaoLidas(user: { tipo: string; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo as "usuario" | "ong",
    id: Number(user.id),
  });
  return naoLidas;
}

export async function renderNovaEvidenciaPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "ong") return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const naoLidas = await getNaoLidas(sessionUser as any);

  const success = (request.query as any)?.sucesso === "1";

  return reply.view(
    "/templates/evidencias/nova.hbs",
    { user: sessionUser, naoLidas, interesseId: id, success },
    { layout: "layouts/ongDashboardLayout" }
  );
}

export async function uploadEvidencia(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "ong") return reply.redirect("/login");

  const { id } = request.params as { id: string };

  try {
    const data = await request.file();

    if (!data || !data.filename) {
      return reply.redirect(`/ong/interesses/${id}/evidencia?erro=sem_arquivo`);
    }

    if (!ALLOWED_MIMES.includes(data.mimetype)) {
      return reply.redirect(`/ong/interesses/${id}/evidencia?erro=formato`);
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const legenda = (data.fields as any)?.legenda?.value ?? "";
    const ext = path.extname(data.filename).toLowerCase() || ".jpg";
    const filename = `evidencia_${id}_${Date.now()}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    const writeStream = fs.createWriteStream(filepath);
    await pipeline(data.file, writeStream);

    const stats = fs.statSync(filepath);
    if (stats.size > MAX_SIZE) {
      fs.unlinkSync(filepath);
      return reply.redirect(`/ong/interesses/${id}/evidencia?erro=tamanho`);
    }

    const imagemUrl = `/public/uploads/evidencias/${filename}`;

    const result = await evidenciaService.uploadEvidencia({
      interesseId: Number(id),
      ongId: Number(sessionUser.id),
      imagemUrl,
      legenda: legenda?.trim() || undefined,
    });

    if (!result.ok) {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      return reply.redirect(`/ong/interesses/${id}/evidencia?erro=negocio`);
    }

    return reply.redirect(`/ong/interesses/${id}/evidencia?sucesso=1`);
  } catch (error) {
    console.error("Erro ao fazer upload de evidência:", error);
    return reply.redirect(`/ong/interesses/${id}/evidencia?erro=interno`);
  }
}
