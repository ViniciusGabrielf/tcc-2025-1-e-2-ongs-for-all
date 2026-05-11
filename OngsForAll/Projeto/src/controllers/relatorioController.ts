import { FastifyRequest, FastifyReply } from "fastify";
import * as relatorioService from "../services/relatorioService";
import * as notificacaoService from "../services/notificacaoService";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "public", "uploads", "relatorios");
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 3 * 1024 * 1024;

async function getNaoLidas(user: { tipo: string; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo as "usuario" | "ong",
    id: Number(user.id),
  });
  return naoLidas;
}

export async function renderListaRelatoriosPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "ong") return reply.redirect("/login");

  const naoLidas = await getNaoLidas(sessionUser as any);
  const relatorios = await relatorioService.listarRelatoriosDaOng(Number(sessionUser.id));

  return reply.view(
    "/templates/relatorios/lista.hbs",
    {
      user: sessionUser,
      naoLidas,
      relatorios,
      success: (request.query as any)?.sucesso === "1",
    },
    { layout: "layouts/ongDashboardLayout" }
  );
}

export async function renderNovoRelatorioPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "ong") return reply.redirect("/login");

  const naoLidas = await getNaoLidas(sessionUser as any);
  const necessidades = await relatorioService.buscarNecessidadesParaSelect(Number(sessionUser.id));

  return reply.view(
    "/templates/relatorios/novo.hbs",
    { user: sessionUser, naoLidas, necessidades },
    { layout: "layouts/ongDashboardLayout" }
  );
}

export async function criarRelatorio(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "ong") return reply.redirect("/login");

  try {
    const data = await request.file();

    let titulo = "", descricao = "", necessidade_id = "", pessoas_beneficiadas = "", data_publicacao = "", status = "rascunho";
    let anexoUrl: string | undefined;

    if (data) {
      const fields = data.fields as Record<string, any>;
      titulo = fields.titulo?.value ?? "";
      descricao = fields.descricao?.value ?? "";
      necessidade_id = fields.necessidade_id?.value ?? "";
      pessoas_beneficiadas = fields.pessoas_beneficiadas?.value ?? "";
      data_publicacao = fields.data_publicacao?.value ?? "";
      status = fields.status?.value ?? "rascunho";

      if (data.filename && ALLOWED_MIMES.includes(data.mimetype)) {
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        const ext = path.extname(data.filename).toLowerCase() || ".jpg";
        const filename = `relatorio_${Date.now()}${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        const writeStream = fs.createWriteStream(filepath);
        await pipeline(data.file, writeStream);
        const stats = fs.statSync(filepath);
        if (stats.size <= MAX_SIZE) {
          anexoUrl = `/public/uploads/relatorios/${filename}`;
        } else {
          fs.unlinkSync(filepath);
        }
      }
    } else {
      const body = request.body as any;
      titulo = body.titulo ?? "";
      descricao = body.descricao ?? "";
      necessidade_id = body.necessidade_id ?? "";
      pessoas_beneficiadas = body.pessoas_beneficiadas ?? "";
      data_publicacao = body.data_publicacao ?? "";
      status = body.status ?? "rascunho";
    }

    const result = await relatorioService.criarRelatorio({
      ongId: Number(sessionUser.id),
      titulo,
      descricao,
      necessidadeId: necessidade_id ? Number(necessidade_id) : undefined,
      pessoasBeneficiadas: pessoas_beneficiadas ? Number(pessoas_beneficiadas) : undefined,
      dataPublicacao: data_publicacao,
      status: (status === "publicado" ? "publicado" : "rascunho") as "rascunho" | "publicado",
      anexoUrl,
    });

    if (!result.ok) {
      const naoLidas = await getNaoLidas(sessionUser as any);
      const necessidades = await relatorioService.buscarNecessidadesParaSelect(Number(sessionUser.id));
      return reply.view(
        "/templates/relatorios/novo.hbs",
        { user: sessionUser, naoLidas, necessidades, error: result.error, form: { titulo, descricao, necessidade_id, pessoas_beneficiadas, data_publicacao, status } },
        { layout: "layouts/ongDashboardLayout" }
      );
    }

    return reply.redirect("/ong/relatorios?sucesso=1");
  } catch (error) {
    console.error("Erro ao criar relatório:", error);
    return reply.redirect("/ong/relatorios/novo");
  }
}

export async function renderDetalheRelatorioPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const sessionUser = request.session.user;
  const naoLidas = sessionUser ? await getNaoLidas(sessionUser as any) : 0;

  const result = await relatorioService.buscarRelatorioPorId(Number(id));

  if (!result.ok) {
    return reply.status(404).send({ message: result.error });
  }

  const layout = sessionUser?.tipo === "ong"
    ? "layouts/ongDashboardLayout"
    : "layouts/dashboardLayout";

  return reply.view(
    "/templates/relatorios/detalhe.hbs",
    { user: sessionUser, naoLidas, relatorio: result.relatorio },
    { layout }
  );
}
