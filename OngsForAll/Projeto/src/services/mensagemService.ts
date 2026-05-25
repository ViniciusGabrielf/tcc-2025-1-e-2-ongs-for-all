import * as mensagemRepo from "../repositories/mensagemRepository";
import * as notificacaoService from "../services/notificacaoService";
import { pool } from "../config/ds";

async function buscarNomeOng(ongId: number): Promise<string> {
  const [rows]: any = await pool.query(`SELECT nome FROM ongs WHERE ong_id = ? LIMIT 1`, [ongId]);
  return rows[0]?.nome ?? "ONG";
}

async function buscarNomeUsuario(usuarioId: number): Promise<string> {
  const [rows]: any = await pool.query(`SELECT nome FROM usuarios WHERE id = ? LIMIT 1`, [usuarioId]);
  return rows[0]?.nome ?? "Usuário";
}

async function buscarNomeEmpresa(empresaId: number): Promise<string> {
  const [rows]: any = await pool.query(`SELECT nome_fantasia FROM empresas WHERE id = ? LIMIT 1`, [empresaId]);
  return rows[0]?.nome_fantasia ?? "Empresa";
}

export async function listarConversasDoUsuario(usuarioId: number) {
  const conversas = await mensagemRepo.listarConversasDoUsuario(usuarioId);
  return conversas.map((c) => ({
    ...c,
    temNaoLidas: Number(c.nao_lidas) > 0,
  }));
}

export async function listarConversasDaOng(ongId: number) {
  const conversas = await mensagemRepo.listarConversasDaOng(ongId);
  return conversas.map((c) => ({
    ...c,
    temNaoLidas: Number(c.nao_lidas) > 0,
  }));
}

export async function listarConversasEmpresa(empresaId: number) {
  const conversas = await mensagemRepo.listarConversasDaEmpresa(empresaId);
  return conversas.map((c) => ({
    ...c,
    temNaoLidas: Number(c.nao_lidas) > 0,
  }));
}

export async function abrirOuCriarConversa(params: {
  usuarioId: number;
  ongId: number;
  necessidadeId?: number;
}): Promise<{ ok: true; conversaId: number } | { ok: false; error: string }> {
  const [ongRows]: any = await pool.query(`SELECT ong_id FROM ongs WHERE ong_id = ? LIMIT 1`, [params.ongId]);
  if (!ongRows.length) return { ok: false, error: "ONG não encontrada." };

  const conversaId = await mensagemRepo.encontrarOuCriarConversa(params);
  return { ok: true, conversaId };
}

export async function visualizarConversa(params: {
  conversaId: number;
  tipoConta: "usuario" | "ong" | "empresa";
  contaId: number;
}) {
  const conversa = await mensagemRepo.buscarConversaPorId(params.conversaId);
  if (!conversa) return { ok: false as const, error: "Conversa não encontrada." };

  const pertence =
    (params.tipoConta === "usuario" && Number(conversa.usuario_id) === params.contaId) ||
    (params.tipoConta === "empresa" && Number(conversa.empresa_id) === params.contaId) ||
    (params.tipoConta === "ong" && Number(conversa.ong_id) === params.contaId);

  if (!pertence) return { ok: false as const, error: "Acesso negado." };

  const outroTipo: "usuario" | "ong" | "empresa" =
    params.tipoConta === "ong"
      ? (conversa.empresa_id ? "empresa" : "usuario")
      : "ong";
  await mensagemRepo.marcarMensagensComoLidas({ conversaId: params.conversaId, remetenteTipo: outroTipo });

  const mensagens = await mensagemRepo.listarMensagensDaConversa(params.conversaId);

  const enriched = mensagens.map((m) => ({
    ...m,
    isOwn: m.remetente_tipo === params.tipoConta,
  }));

  return { ok: true as const, conversa, mensagens: enriched };
}

export async function enviarMensagem(params: {
  conversaId: number;
  tipoConta: "usuario" | "ong" | "empresa";
  contaId: number;
  conteudo: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const conteudo = params.conteudo.trim();
  if (!conteudo || conteudo.length < 1) return { ok: false, error: "Mensagem não pode estar vazia." };
  if (conteudo.length > 2000) return { ok: false, error: "Mensagem muito longa (máximo 2000 caracteres)." };

  const conversa = await mensagemRepo.buscarConversaPorId(params.conversaId);
  if (!conversa) return { ok: false, error: "Conversa não encontrada." };

  const pertence =
    (params.tipoConta === "usuario" && Number(conversa.usuario_id) === params.contaId) ||
    (params.tipoConta === "empresa" && Number(conversa.empresa_id) === params.contaId) ||
    (params.tipoConta === "ong" && Number(conversa.ong_id) === params.contaId);

  if (!pertence) return { ok: false, error: "Acesso negado." };

  await mensagemRepo.criarMensagem({
    conversaId: params.conversaId,
    remetenteTipo: params.tipoConta,
    remetenteId: params.contaId,
    conteudo,
  });

  if (params.tipoConta === "ong") {
    const nomeOng = await buscarNomeOng(params.contaId);
    if (conversa.usuario_id) {
      await notificacaoService.criarNotificacaoParaUsuario({
        usuarioId: Number(conversa.usuario_id),
        titulo: "Nova mensagem recebida",
        mensagem: `${nomeOng} respondeu sua mensagem.`,
        tipo: "nova_mensagem",
      });
    }
  } else {
    const nomeRemetente = params.tipoConta === "empresa"
      ? await buscarNomeEmpresa(params.contaId)
      : await buscarNomeUsuario(params.contaId);
    await notificacaoService.criarNotificacaoParaOng({
      ongId: Number(conversa.ong_id),
      titulo: "Nova mensagem recebida",
      mensagem: `${nomeRemetente} enviou uma mensagem para sua ONG.`,
      tipo: "nova_mensagem",
    });
  }

  return { ok: true };
}

export async function iniciarConversaEmpresa(params: {
  empresaId: number;
  ongId: number;
  necessidadeId?: number;
  mensagemInicial: string;
}): Promise<{ ok: true; conversaId: number; rascunho: string } | { ok: false; error: string }> {
  const conteudo = params.mensagemInicial.trim();
  if (!conteudo) return { ok: false, error: "A mensagem inicial não pode estar vazia." };

  const [ongRows]: any = await pool.query(`SELECT ong_id FROM ongs WHERE ong_id = ? LIMIT 1`, [params.ongId]);
  if (!ongRows.length) return { ok: false, error: "ONG não encontrada." };

  const conversaId = await mensagemRepo.encontrarOuCriarConversaEmpresa({
    empresaId: params.empresaId,
    ongId: params.ongId,
    necessidadeId: params.necessidadeId,
  });

  return { ok: true, conversaId, rascunho: conteudo };
}

export async function iniciarConversaUsuario(params: {
  usuarioId: number;
  ongId: number;
  necessidadeId?: number;
  mensagemInicial: string;
}): Promise<{ ok: true; conversaId: number; rascunho: string } | { ok: false; error: string }> {
  const conteudo = params.mensagemInicial.trim();
  if (!conteudo) return { ok: false, error: "A mensagem inicial não pode estar vazia." };

  const result = await abrirOuCriarConversa({
    usuarioId: params.usuarioId,
    ongId: params.ongId,
    necessidadeId: params.necessidadeId,
  });

  if (!result.ok) return result;

  return { ok: true, conversaId: result.conversaId, rascunho: conteudo };
}
