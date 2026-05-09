import { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import * as empresaService from "../services/empresaService";
import * as empresaRepo from "../repositories/empresaRepository";
import * as marketplaceRepo from "../repositories/marketplaceRepository";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "public", "uploads", "empresa_logos");
const MARKETPLACE_UPLOADS_DIR = path.join(__dirname, "..", "..", "public", "uploads", "marketplace_itens");
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 3 * 1024 * 1024;

async function getNaoLidas(empresaId: number): Promise<number> {
  return marketplaceRepo.contarItensRevisados(empresaId);
}

// ----------------------------------------------------------
// Auth: cadastro
// ----------------------------------------------------------
export async function renderCadastroEmpresaPage(request: FastifyRequest, reply: FastifyReply) {
  return reply.view("/templates/empresa/cadastro.hbs", {}, { layout: "layouts/authLayout" });
}

export async function cadastrarEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Record<string, string>;

  const result = await empresaService.cadastrarEmpresa({
    nome_fantasia: body.nome_fantasia,
    razao_social: body.razao_social,
    email: body.email,
    cnpj: body.cnpj,
    telefone: body.telefone,
    descricao: body.descricao,
    setor: body.setor,
    senha: body.senha,
  });

  if (!result.ok) {
    return reply.view(
      "/templates/empresa/cadastro.hbs",
      { error: result.error, form: body },
      { layout: "layouts/authLayout" }
    );
  }

  return reply.redirect("/login?cadastro=empresa");
}

// ----------------------------------------------------------
// Dashboard
// ----------------------------------------------------------
export async function renderDashboardEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const [data, naoLidas] = await Promise.all([
    empresaService.getDashboardData(Number(sessionUser.id)),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  return reply.view(
    "/templates/empresa/dashboard.hbs",
    { user: sessionUser, naoLidas, ...data },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

// ----------------------------------------------------------
// Apoios — ver necessidades e apoiar
// ----------------------------------------------------------
export async function renderPlanosEmpresaPage(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const [empresa, totalItensNoLimite, totalItensCadastrados, naoLidas] = await Promise.all([
    empresaRepo.findEmpresaById(Number(sessionUser.id)),
    marketplaceRepo.contarItensNoLimiteDaEmpresa(Number(sessionUser.id)),
    marketplaceRepo.contarItensDaEmpresa(Number(sessionUser.id)),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  const planos = empresaService.listarPlanos(empresa?.plano).map((plano) => ({
    ...plano,
    canSelecionar: totalItensNoLimite <= plano.limite,
    bloqueadoPorLimite: totalItensNoLimite > plano.limite,
  }));

  return reply.view(
    "/templates/empresa/planos.hbs",
    {
      user: sessionUser,
      naoLidas,
      empresa,
      planos,
      totalItens: totalItensNoLimite,
      totalItensCadastrados,
      success: (request.query as any)?.sucesso === "1",
      erro: (request.query as any)?.erro || "",
    },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function alterarPlanoEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { plano } = request.body as { plano?: string };
  const result = await empresaService.alterarPlanoEmpresa({
    empresaId: Number(sessionUser.id),
    plano: plano ?? "",
  });

  if (!result.ok) {
    return reply.redirect(`/empresa/plano?erro=${encodeURIComponent(result.error)}`);
  }

  return reply.redirect("/empresa/plano?sucesso=1");
}

export async function renderNecessidadesParaApoiar(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { tipo } = request.query as { tipo?: string };

  const rows = await empresaRepo.listarNecessidadesAbertas(Number(sessionUser.id), tipo);

  const necessidades = rows.map((n: any) => ({
    ...n,
    ja_apoiou: !!n.ja_apoiou,
    isBem: n.tipo_necessidade === "bem",
    isServico: n.tipo_necessidade === "servico",
    isVoluntariado: n.tipo_necessidade === "voluntariado",
    tipoLabel: n.tipo_necessidade === "bem" ? "Doação" : n.tipo_necessidade === "servico" ? "Serviço" : "Voluntariado",
    progresso: n.quantidade > 0 ? Math.min(100, Math.round((n.quantidade_recebida / n.quantidade) * 100)) : 0,
  }));

  const [empresa, naoLidas] = await Promise.all([
    empresaRepo.findEmpresaById(Number(sessionUser.id)),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  return reply.view(
    "/templates/empresa/necessidades.hbs",
    {
      user: sessionUser,
      naoLidas,
      necessidades,
      filtroTipo: tipo ?? "",
      filtroBem: tipo === "bem",
      filtroServico: tipo === "servico",
      filtroVoluntariado: tipo === "voluntariado",
      statusMarketplace: empresa?.status_marketplace,
    },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function apoiarNecessidade(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const { observacao } = request.body as { observacao?: string };

  const ongId = await empresaRepo.findNecessidadeOngId(Number(id));
  if (!ongId) return reply.status(404).send({ message: "Necessidade não encontrada." });

  const result = await empresaService.apoiarNecessidade({
    empresaId: Number(sessionUser.id),
    necessidadeId: Number(id),
    ongId,
    observacao,
  });

  if (!result.ok) {
    return reply.redirect(`/empresa/necessidades?erro=${encodeURIComponent(result.error)}`);
  }

  return reply.redirect("/empresa/necessidades?apoio=1");
}

// ----------------------------------------------------------
// Vitrine da empresa (gestão de itens)
// ----------------------------------------------------------
export async function renderVitrineEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const [empresa, naoLidas] = await Promise.all([
    empresaRepo.findEmpresaById(Number(sessionUser.id)),
    getNaoLidas(Number(sessionUser.id)),
  ]);
  const isBloqueada = empresa?.status_marketplace === "bloqueada";

  const itens = isBloqueada ? [] : await empresaService.listarItensEmpresa(Number(sessionUser.id));

  return reply.view(
    "/templates/empresa/vitrine.hbs",
    {
      user: sessionUser,
      naoLidas,
      empresa,
      itens,
      isBloqueada,
      isElegivel: empresa?.status_marketplace === "elegivel",
      isAtiva: empresa?.status_marketplace === "ativa",
      success: (request.query as any)?.sucesso === "1",
      successComImagem: (request.query as any)?.comImagem === "1",
      successEditado: (request.query as any)?.editado === "1",
      successDesativado: (request.query as any)?.desativado === "1",
      successReenviado: (request.query as any)?.reenviado === "1",
      erro: (request.query as any)?.erro || "",
    },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function renderNovoItemPage(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const empresa = await empresaRepo.findEmpresaById(Number(sessionUser.id));
  if (empresa?.status_marketplace === "bloqueada") return reply.redirect("/empresa/vitrine");

  const [categorias, naoLidas] = await Promise.all([
    marketplaceRepo.getCategorias(),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  return reply.view(
    "/templates/empresa/novo-item.hbs",
    { user: sessionUser, naoLidas, categorias },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

async function renderNovoItemComErro(
  reply: FastifyReply,
  empresaId: number,
  user: any,
  error: string,
  form: { titulo: string; descricao: string; tipo: string; categoriaId: string; linkExterno: string; modoPreco?: string; preco?: string }
) {
  const [categorias, naoLidas] = await Promise.all([
    marketplaceRepo.getCategorias(),
    getNaoLidas(empresaId),
  ]);

  return reply.view(
    "/templates/empresa/novo-item.hbs",
    { user, naoLidas, categorias, error, form },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function criarItemMarketplace(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  try {
    const data = await request.file();
    let titulo = "", descricao = "", tipo = "produto", categoriaId = "", linkExterno = "";
    let modoPreco = "sob_consulta", preco = "";
    let imagemUrl: string | undefined;

    if (data) {
      const fields = data.fields as Record<string, any>;
      titulo = fields.titulo?.value ?? "";
      descricao = fields.descricao?.value ?? "";
      tipo = fields.tipo?.value ?? "produto";
      categoriaId = fields.categoria_id?.value ?? "";
      linkExterno = fields.link_externo?.value ?? "";
      modoPreco = fields.modo_preco?.value ?? "sob_consulta";
      preco = fields.preco?.value ?? "";

      if (data.filename) {
        if (!ALLOWED_MIMES.includes(data.mimetype)) {
          data.file.resume();
          return renderNovoItemComErro(
            reply,
            Number(sessionUser.id),
            sessionUser,
            "Formato de imagem inválido. Use JPG, PNG ou WebP.",
            { titulo, descricao, tipo, categoriaId, linkExterno, modoPreco, preco }
          );
        }

        if (!fs.existsSync(MARKETPLACE_UPLOADS_DIR)) fs.mkdirSync(MARKETPLACE_UPLOADS_DIR, { recursive: true });
        const ext = path.extname(data.filename).toLowerCase() || ".jpg";
        const filename = `item_${Date.now()}${ext}`;
        const filepath = path.join(MARKETPLACE_UPLOADS_DIR, filename);
        await pipeline(data.file, fs.createWriteStream(filepath));

        const stats = fs.statSync(filepath);
        if (stats.size > MAX_SIZE) {
          fs.unlinkSync(filepath);
          return renderNovoItemComErro(
            reply,
            Number(sessionUser.id),
            sessionUser,
            "A imagem excede o limite de 3MB. Envie um arquivo menor.",
            { titulo, descricao, tipo, categoriaId, linkExterno, modoPreco, preco }
          );
        }

        imagemUrl = `/public/uploads/marketplace_itens/${filename}`;
      }
    } else {
      const body = request.body as any;
      titulo = body.titulo ?? "";
      descricao = body.descricao ?? "";
      tipo = body.tipo ?? "produto";
      categoriaId = body.categoria_id ?? "";
      linkExterno = body.link_externo ?? "";
      modoPreco = body.modo_preco ?? "sob_consulta";
      preco = body.preco ?? "";
    }

    const precoNum = preco ? parseFloat(preco.replace(",", ".")) : undefined;

    const result = await empresaService.criarItemMarketplace({
      empresaId: Number(sessionUser.id),
      titulo,
      descricao,
      tipo,
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
      imagemUrl,
      linkExterno: linkExterno || undefined,
      modoPreco: modoPreco as "gratuito" | "fixo" | "sob_consulta",
      preco: isNaN(precoNum as number) ? undefined : precoNum,
    });

    if (!result.ok) {
      return renderNovoItemComErro(
        reply,
        Number(sessionUser.id),
        sessionUser,
        result.error,
        { titulo, descricao, tipo, categoriaId, linkExterno, modoPreco, preco }
      );
    }

    return reply.redirect(`/empresa/vitrine?sucesso=1${imagemUrl ? "&comImagem=1" : ""}`);
  } catch (err: any) {
    console.error("Erro ao criar item:", err);
    if (err?.code === "FST_REQ_FILE_TOO_LARGE" || err?.statusCode === 413 || err?.name === "RequestFileTooLargeError") {
      return renderNovoItemComErro(
        reply,
        Number(sessionUser.id),
        sessionUser,
        "A imagem excede o limite permitido no upload. Envie um arquivo de até 3MB.",
        { titulo: "", descricao: "", tipo: "produto", categoriaId: "", linkExterno: "", modoPreco: "sob_consulta", preco: "" }
      );
    }

    return renderNovoItemComErro(
      reply,
      Number(sessionUser.id),
      sessionUser,
      "Não foi possível processar o upload da imagem. Tente novamente.",
      { titulo: "", descricao: "", tipo: "produto", categoriaId: "", linkExterno: "", modoPreco: "sob_consulta", preco: "" }
    );
  }
}

// ----------------------------------------------------------
// Perfil da empresa
// ----------------------------------------------------------
export async function renderPerfilEmpresaPage(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const [empresa, naoLidas] = await Promise.all([
    empresaRepo.findEmpresaById(Number(sessionUser.id)),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  return reply.view(
    "/templates/empresa/perfil.hbs",
    { user: sessionUser, naoLidas, empresa, success: (request.query as any)?.sucesso === "1" },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function atualizarPerfilEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  try {
    const data = await request.file();
    let nome_fantasia = "", razao_social = "", telefone = "", descricao = "", setor = "";
    let logoUrl: string | undefined;

    if (data) {
      const fields = data.fields as Record<string, any>;
      nome_fantasia = fields.nome_fantasia?.value ?? "";
      razao_social = fields.razao_social?.value ?? "";
      telefone = fields.telefone?.value ?? "";
      descricao = fields.descricao?.value ?? "";
      setor = fields.setor?.value ?? "";

      if (data.filename && ALLOWED_MIMES.includes(data.mimetype)) {
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const ext = path.extname(data.filename).toLowerCase() || ".jpg";
        const filename = `empresa_${sessionUser.id}_${Date.now()}${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        await pipeline(data.file, fs.createWriteStream(filepath));
        const stats = fs.statSync(filepath);
        if (stats.size <= MAX_SIZE) {
          logoUrl = `/public/uploads/empresa_logos/${filename}`;
          await empresaRepo.updateEmpresaLogo(Number(sessionUser.id), logoUrl);
          (request.session.user as any).logo = logoUrl;
        } else {
          fs.unlinkSync(filepath);
        }
      }
    } else {
      const body = request.body as any;
      nome_fantasia = body.nome_fantasia ?? "";
      razao_social = body.razao_social ?? "";
      telefone = body.telefone ?? "";
      descricao = body.descricao ?? "";
      setor = body.setor ?? "";
    }

    await empresaRepo.updateEmpresaPerfil(Number(sessionUser.id), { nome_fantasia, razao_social, telefone, descricao, setor });
    (request.session.user as any).nome = nome_fantasia;

    return reply.redirect("/empresa/perfil?sucesso=1");
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    return reply.redirect("/empresa/perfil");
  }
}

// ----------------------------------------------------------
// Edição de item da vitrine
// ----------------------------------------------------------
export async function renderEditarItemPage(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { id } = request.params as { id: string };

  const [item, categorias, naoLidas] = await Promise.all([
    marketplaceRepo.findItemByIdDaEmpresa(Number(id), Number(sessionUser.id)),
    marketplaceRepo.getCategorias(),
    getNaoLidas(Number(sessionUser.id)),
  ]);

  if (!item) {
    return reply.status(404).send({ message: "Item não encontrado." });
  }

  return reply.view(
    "/templates/empresa/editar-item.hbs",
    {
      user: sessionUser,
      naoLidas,
      categorias,
      item,
      isRejeitado: item.status_publicacao === "rejeitado",
      isRascunho: item.status_publicacao === "rascunho",
    },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

async function renderEditarComErro(
  reply: FastifyReply,
  user: any,
  itemId: number,
  error: string,
  form: { titulo: string; descricao: string; tipo: string; categoriaId: string; linkExterno: string; modoPreco?: string; preco?: string }
) {
  const [item, categorias, naoLidas] = await Promise.all([
    marketplaceRepo.findItemByIdDaEmpresa(itemId, Number(user.id)),
    marketplaceRepo.getCategorias(),
    getNaoLidas(Number(user.id)),
  ]);

  return reply.view(
    "/templates/empresa/editar-item.hbs",
    {
      user,
      naoLidas,
      categorias,
      error,
      item: item
        ? {
            ...item,
            titulo: form.titulo,
            descricao: form.descricao,
            tipo: form.tipo,
            categoria_id: form.categoriaId ? Number(form.categoriaId) : item.categoria_id,
            link_externo: form.linkExterno,
            modo_preco: form.modoPreco ?? item.modo_preco,
            preco: form.preco !== undefined && form.preco !== "" ? form.preco : item.preco,
          }
        : null,
      isRejeitado: item?.status_publicacao === "rejeitado",
      isRascunho: item?.status_publicacao === "rascunho",
    },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

export async function editarItemMarketplace(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const itemId = Number(id);

  try {
    const data = await request.file();
    let titulo = "", descricao = "", tipo = "produto", categoriaId = "", linkExterno = "";
    let modoPreco = "sob_consulta", preco = "";
    let removerImagem = false;
    let acao: "salvar" | "reenviar" = "salvar";
    let novaImagemUrl: string | undefined;

    if (data) {
      const fields = data.fields as Record<string, any>;
      titulo = fields.titulo?.value ?? "";
      descricao = fields.descricao?.value ?? "";
      tipo = fields.tipo?.value ?? "produto";
      categoriaId = fields.categoria_id?.value ?? "";
      linkExterno = fields.link_externo?.value ?? "";
      modoPreco = fields.modo_preco?.value ?? "sob_consulta";
      preco = fields.preco?.value ?? "";
      removerImagem = fields.remover_imagem?.value === "1";
      acao = fields.acao?.value === "reenviar" ? "reenviar" : "salvar";

      if (data.filename) {
        if (!ALLOWED_MIMES.includes(data.mimetype)) {
          data.file.resume();
          return renderEditarComErro(reply, sessionUser, itemId, "Formato de imagem inválido. Use JPG, PNG ou WebP.", { titulo, descricao, tipo, categoriaId, linkExterno, modoPreco, preco });
        }

        if (!fs.existsSync(MARKETPLACE_UPLOADS_DIR)) fs.mkdirSync(MARKETPLACE_UPLOADS_DIR, { recursive: true });
        const ext = path.extname(data.filename).toLowerCase() || ".jpg";
        const filename = `item_${itemId}_${Date.now()}${ext}`;
        const filepath = path.join(MARKETPLACE_UPLOADS_DIR, filename);
        await pipeline(data.file, fs.createWriteStream(filepath));

        const stats = fs.statSync(filepath);
        if (stats.size > MAX_SIZE) {
          fs.unlinkSync(filepath);
          return renderEditarComErro(reply, sessionUser, itemId, "A imagem excede o limite de 3MB. Envie um arquivo menor.", { titulo, descricao, tipo, categoriaId, linkExterno, modoPreco, preco });
        }

        novaImagemUrl = `/public/uploads/marketplace_itens/${filename}`;
      }
    } else {
      const body = request.body as any;
      titulo = body?.titulo ?? "";
      descricao = body?.descricao ?? "";
      tipo = body?.tipo ?? "produto";
      categoriaId = body?.categoria_id ?? "";
      linkExterno = body?.link_externo ?? "";
      modoPreco = body?.modo_preco ?? "sob_consulta";
      preco = body?.preco ?? "";
      removerImagem = body?.remover_imagem === "1";
      acao = body?.acao === "reenviar" ? "reenviar" : "salvar";
    }

    const itemAtual = await marketplaceRepo.findItemByIdDaEmpresa(itemId, Number(sessionUser.id));
    if (!itemAtual) {
      return reply.status(403).send({ message: "Acesso não autorizado." });
    }

    let imagemUrl: string | null;
    if (novaImagemUrl) {
      if (itemAtual.imagem_url) {
        const oldPath = path.join(__dirname, "..", "..", itemAtual.imagem_url.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      imagemUrl = novaImagemUrl;
    } else if (removerImagem) {
      if (itemAtual.imagem_url) {
        const oldPath = path.join(__dirname, "..", "..", itemAtual.imagem_url.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      imagemUrl = null;
    } else {
      imagemUrl = itemAtual.imagem_url ?? null;
    }

    const result = await empresaService.editarItemMarketplace({
      empresaId: Number(sessionUser.id),
      itemId,
      titulo,
      descricao,
      tipo,
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
      imagemUrl,
      linkExterno: linkExterno || undefined,
      acao,
      modoPreco,
      preco: preco || undefined,
    });

    if (!result.ok) {
      if (novaImagemUrl) {
        const newPath = path.join(__dirname, "..", "..", novaImagemUrl.replace(/^\//, ""));
        if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      }
      const [categorias, naoLidas] = await Promise.all([
        marketplaceRepo.getCategorias(),
        getNaoLidas(Number(sessionUser.id)),
      ]);
      return reply.view(
        "/templates/empresa/editar-item.hbs",
        {
          user: sessionUser,
          naoLidas,
          categorias,
          error: result.error,
          item: {
            ...itemAtual,
            titulo,
            descricao,
            tipo,
            categoria_id: categoriaId ? Number(categoriaId) : itemAtual.categoria_id,
            link_externo: linkExterno,
            imagem_url: itemAtual.imagem_url,
            modo_preco: modoPreco,
            preco: preco || itemAtual.preco,
          },
          isRejeitado: itemAtual.status_publicacao === "rejeitado",
          isRascunho: itemAtual.status_publicacao === "rascunho",
        },
        { layout: "layouts/empresaDashboardLayout" }
      );
    }

    return reply.redirect(`/empresa/vitrine?${acao === "reenviar" ? "reenviado=1" : "editado=1"}`);
  } catch (err: any) {
    console.error("Erro ao editar item:", err);
    const errorMsg =
      err?.code === "FST_REQ_FILE_TOO_LARGE" || err?.statusCode === 413
        ? "A imagem excede o limite permitido. Envie um arquivo de até 3MB."
        : "Não foi possível processar a edição. Tente novamente.";
    return renderEditarComErro(reply, sessionUser, itemId, errorMsg, {
      titulo: "",
      descricao: "",
      tipo: "produto",
      categoriaId: "",
      linkExterno: "",
    });
  }
}

// ----------------------------------------------------------
// Notificações
// ----------------------------------------------------------
export async function desativarItemMarketplace(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const result = await empresaService.desativarItemMarketplace({
    empresaId: Number(sessionUser.id),
    itemId: Number(id),
  });

  if (!result.ok) {
    return reply.redirect(`/empresa/vitrine?erro=${encodeURIComponent(result.error)}`);
  }
  return reply.redirect("/empresa/vitrine?desativado=1");
}

export async function reenviarItemMarketplace(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const result = await empresaService.reenviarItemMarketplace({
    empresaId: Number(sessionUser.id),
    itemId: Number(id),
  });

  if (!result.ok) {
    return reply.redirect(`/empresa/vitrine?erro=${encodeURIComponent(result.error)}`);
  }
  return reply.redirect("/empresa/vitrine?reenviado=1");
}

export async function renderNotificacoesEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const itens = await marketplaceRepo.listarItensComStatus(Number(sessionUser.id));

  // Marca como lidos ao visitar a página (zera o badge)
  await marketplaceRepo.marcarItensComoLidos(Number(sessionUser.id));

  const itensEnrich = itens.map((i: any) => ({
    ...i,
    isAprovado: i.status_publicacao === "aprovado",
    isRejeitado: i.status_publicacao === "rejeitado",
    isPendente: i.status_publicacao === "pendente",
    isRascunho: i.status_publicacao === "rascunho",
    tipoLabel: ({ produto: "Produto", servico: "Serviço", campanha: "Campanha", banner: "Institucional", link: "Link" } as Record<string, string>)[i.tipo] ?? i.tipo,
  }));

  const naoLidas = itensEnrich.filter((i: any) => i.isAprovado || i.isRejeitado).length;

  return reply.view(
    "/templates/empresa/notificacoes.hbs",
    { user: sessionUser, naoLidas, itens: itensEnrich },
    { layout: "layouts/empresaDashboardLayout" }
  );
}
