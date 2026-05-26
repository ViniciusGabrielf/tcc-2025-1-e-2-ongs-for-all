import { FastifyRequest, FastifyReply } from "fastify";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import * as repo from "../repositories/apoiadoresRepository";
import * as service from "../services/apoiadoresService";
import { detectMimeFromFile } from "../utils/magicBytes";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "public", "uploads", "apoiadores");
const TEMP_DIR    = path.join(__dirname, "..", "..", "private", "temp");
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 1 * 1024 * 1024; // 1 MB

const PLANO_LABELS: Record<string, string> = {
  basico: "Apoiador Básico",
  local: "Apoiador Local",
  destaque: "Apoiador Destaque",
  institucional: "Parceiro Institucional",
};

async function renderLista(reply: FastifyReply, extra: Record<string, any> = {}) {
  const { status = "todos", plano = "todos" } = extra.filtros ?? {};
  const [apoiadores, contagens] = await Promise.all([
    repo.listarTodos({ status, plano }),
    repo.contarPorStatus(),
  ]);
  return reply.view(
    "/templates/admin/apoiadores/index.hbs",
    {
      apoiadores: apoiadores.map(a => ({
        ...a,
        planoLabel: PLANO_LABELS[a.plano] ?? a.plano,
        isAtivo: a.status === "ativo",
        isPausado: a.status === "pausado",
        isEncerrado: a.status === "encerrado",
        valorFormatado: Number(a.valor_mensal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      })),
      contagens,
      filtroStatus: status,
      filtroPlano: plano,
      adminPageApoiadores: true,
      ...extra,
    },
    { layout: "layouts/adminLayout" }
  );
}

export async function listarApoiadores(request: FastifyRequest, reply: FastifyReply) {
  const { status, plano } = request.query as { status?: string; plano?: string };
  return renderLista(reply, {
    filtros: { status: status ?? "todos", plano: plano ?? "todos" },
    sucesso: (request.query as any).sucesso === "1",
  });
}

export async function renderFormNovo(request: FastifyRequest, reply: FastifyReply) {
  return reply.view(
    "/templates/admin/apoiadores/form.hbs",
    {
      modoEdicao: false,
      apoiador: { status: "pausado", plano: "basico", data_inicio: new Date().toISOString().slice(0, 10) },
      adminPageApoiadores: true,
    },
    { layout: "layouts/adminLayout" }
  );
}

export async function renderFormEditar(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const apoiador = await repo.buscarPorId(Number(id));
  if (!apoiador) return reply.redirect("/admin/apoiadores");
  return reply.view(
    "/templates/admin/apoiadores/form.hbs",
    { modoEdicao: true, apoiador, adminPageApoiadores: true },
    { layout: "layouts/adminLayout" }
  );
}

async function processarLogoUpload(request: FastifyRequest): Promise<{
  fields: Record<string, string>;
  logoUrl: string | null;
  erro?: string;
}> {
  const fields: Record<string, string> = {};
  let logoUrl: string | null = null;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (!part.filename || !ALLOWED_MIMES.includes(part.mimetype)) {
        part.file.resume();
        continue;
      }
      if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
      const ext = path.extname(part.filename).toLowerCase() || ".jpg";
      const filename = `apoiador_${Date.now()}${ext}`;
      const tempPath = path.join(TEMP_DIR, filename);
      await pipeline(part.file, fs.createWriteStream(tempPath));

      const stats = fs.statSync(tempPath);
      if (stats.size > MAX_SIZE) {
        fs.unlinkSync(tempPath);
        return { fields, logoUrl: null, erro: "Logo muito grande. Tamanho máximo: 1 MB." };
      }
      const realMime = detectMimeFromFile(tempPath);
      if (!realMime || !ALLOWED_MIMES.includes(realMime)) {
        fs.unlinkSync(tempPath);
        return { fields, logoUrl: null, erro: "Formato de arquivo inválido. Use JPG, PNG ou WebP." };
      }
      if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const destPath = path.join(UPLOADS_DIR, filename);
      fs.renameSync(tempPath, destPath);
      logoUrl = `/public/uploads/apoiadores/${filename}`;
    } else {
      fields[part.fieldname] = part.value as string;
    }
  }

  return { fields, logoUrl };
}

export async function criarApoiador(request: FastifyRequest, reply: FastifyReply) {
  const { fields, logoUrl, erro } = await processarLogoUpload(request);
  if (erro) {
    return reply.view(
      "/templates/admin/apoiadores/form.hbs",
      { modoEdicao: false, apoiador: fields, erro, adminPageApoiadores: true },
      { layout: "layouts/adminLayout" }
    );
  }

  const result = await service.criarApoiador({
    nome: fields.nome,
    logo_url: logoUrl,
    website_url: fields.website_url,
    descricao: fields.descricao,
    plano: fields.plano,
    valor_mensal: fields.valor_mensal,
    data_inicio: fields.data_inicio,
    data_fim: fields.data_fim,
    status: fields.status,
  });
  if (!result.ok) {
    return reply.view(
      "/templates/admin/apoiadores/form.hbs",
      { modoEdicao: false, apoiador: fields, erro: result.error, adminPageApoiadores: true },
      { layout: "layouts/adminLayout" }
    );
  }
  return reply.redirect("/admin/apoiadores?sucesso=1");
}

export async function atualizarApoiador(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const apoiadorAtual = await repo.buscarPorId(Number(id));
  if (!apoiadorAtual) return reply.redirect("/admin/apoiadores");

  const { fields, logoUrl: novaLogo, erro } = await processarLogoUpload(request);
  if (erro) {
    return reply.view(
      "/templates/admin/apoiadores/form.hbs",
      { modoEdicao: true, apoiador: { ...apoiadorAtual, ...fields }, erro, adminPageApoiadores: true },
      { layout: "layouts/adminLayout" }
    );
  }

  // Manter logo existente se nenhuma nova foi enviada
  const logoFinal = novaLogo ?? fields.logo_url_existente ?? apoiadorAtual.logo_url;

  const result = await service.atualizarApoiador(Number(id), {
    nome: fields.nome,
    logo_url: logoFinal,
    website_url: fields.website_url,
    descricao: fields.descricao,
    plano: fields.plano,
    valor_mensal: fields.valor_mensal,
    data_inicio: fields.data_inicio,
    data_fim: fields.data_fim,
  });
  if (!result.ok) {
    return reply.view(
      "/templates/admin/apoiadores/form.hbs",
      { modoEdicao: true, apoiador: { ...apoiadorAtual, ...fields }, erro: result.error, adminPageApoiadores: true },
      { layout: "layouts/adminLayout" }
    );
  }

  // Remover logo antiga se foi substituída
  if (novaLogo && apoiadorAtual.logo_url && apoiadorAtual.logo_url !== novaLogo) {
    const oldPath = path.join(__dirname, "..", "..", "public", apoiadorAtual.logo_url.replace("/public/", ""));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  return reply.redirect("/admin/apoiadores?sucesso=1");
}

export async function ativarApoiador(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await service.ativar(Number(id));
  return reply.redirect("/admin/apoiadores?sucesso=1");
}

export async function pausarApoiador(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await service.pausar(Number(id));
  return reply.redirect("/admin/apoiadores?sucesso=1");
}

export async function encerrarApoiador(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await service.encerrar(Number(id));
  return reply.redirect("/admin/apoiadores?sucesso=1");
}

export async function apiApoiadoresPublico(request: FastifyRequest, reply: FastifyReply) {
  const apoiadores = await repo.listarAtivosParaRodape();
  return reply.send(apoiadores);
}
