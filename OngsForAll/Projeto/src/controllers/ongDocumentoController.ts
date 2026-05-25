import { FastifyRequest, FastifyReply } from "fastify";
import * as ongAprovacaoRepo from "../repositories/ongAprovacaoRepository";
import * as notificacaoService from "../services/notificacaoService";
import { processarUploadComModeracao } from "../services/moderacaoImagemService";
import { detectMimeFromFile } from "../utils/magicBytes";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "public", "uploads", "ong_docs");
const TEMP_DIR = path.join(__dirname, "..", "..", "private", "temp");
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function getNaoLidas(user: { tipo: string; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo as "usuario" | "ong",
    id: Number(user.id),
  });
  return naoLidas;
}

export async function renderDocumentosPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "ong") return reply.redirect("/login");

  const naoLidas = await getNaoLidas(sessionUser as any);
  const [status, documentos] = await Promise.all([
    ongAprovacaoRepo.getStatusAprovacao(Number(sessionUser.id)),
    ongAprovacaoRepo.getDocumentos(Number(sessionUser.id)),
  ]);

  return reply.view(
    "/templates/ong/documentos.hbs",
    {
      user: sessionUser,
      naoLidas,
      documentos,
      statusAprovacao: status?.status_aprovacao ?? "pendente",
      observacaoAdmin: status?.observacao_admin ?? null,
      isPendente: status?.status_aprovacao === "pendente",
      isAprovada: status?.status_aprovacao === "aprovada",
      isRejeitada: status?.status_aprovacao === "rejeitada",
      success: (request.query as any)?.sucesso === "1",
      erroModeracao: (request.query as any)?.erro === "moderacao",
    },
    { layout: "layouts/ongDashboardLayout" }
  );
}

export async function uploadDocumento(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "ong") return reply.redirect("/login");

  try {
    const data = await request.file();

    if (!data || !data.filename) {
      return reply.redirect("/ong/documentos?erro=sem_arquivo");
    }

    if (!ALLOWED_MIMES.includes(data.mimetype)) {
      return reply.redirect("/ong/documentos?erro=formato");
    }

    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    const tipo = (data.fields as any)?.tipo?.value ?? "documento";
    const ext = path.extname(data.filename).toLowerCase() || ".pdf";
    const filename = `ong_${sessionUser.id}_${Date.now()}${ext}`;

    // Write to temp first for validation
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    const tempFilePath = path.join(TEMP_DIR, filename);

    const writeStream = fs.createWriteStream(tempFilePath);
    await pipeline(data.file, writeStream);

    const stats = fs.statSync(tempFilePath);
    if (stats.size > MAX_SIZE) {
      fs.unlinkSync(tempFilePath);
      return reply.redirect("/ong/documentos?erro=tamanho");
    }

    const realMime = detectMimeFromFile(tempFilePath);
    if (!realMime || !ALLOWED_MIMES.includes(realMime)) {
      fs.unlinkSync(tempFilePath);
      return reply.redirect("/ong/documentos?erro=formato");
    }

    let arquivoUrl: string;

    if (!IMAGE_MIMES.includes(realMime)) {
      // PDFs skip image moderation — admin reviews document content manually
      const destPath = path.join(UPLOADS_DIR, filename);
      fs.renameSync(tempFilePath, destPath);
      arquivoUrl = `/public/uploads/ong_docs/${filename}`;
    } else {
      // Images go through moderation
      const modResult = await processarUploadComModeracao({
        tempPath: tempFilePath,
        publicDir: UPLOADS_DIR,
        publicUrlBase: "/public/uploads/ong_docs",
        filename,
        mimeType: realMime,
        tipo: "documento_ong",
        referenciaId: Number(sessionUser.id),
      });

      if (!modResult.ok) {
        return reply.redirect(`/ong/documentos?erro=${modResult.rejeitado ? "moderacao" : "interno"}`);
      }

      arquivoUrl = modResult.publicUrl;
    }

    await ongAprovacaoRepo.uploadDocumento({
      ongId: Number(sessionUser.id),
      nomeArquivo: data.filename,
      arquivoUrl,
      tipo,
    });

    return reply.redirect("/ong/documentos?sucesso=1");
  } catch (error) {
    console.error("Erro ao fazer upload de documento:", error);
    return reply.redirect("/ong/documentos?erro=interno");
  }
}
