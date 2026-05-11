import * as interesseRepo from "../repositories/interesseDoacaoRepository";
import * as doacaoRepo from "../repositories/doacaoRepository";
import * as notificacaoService from "../services/notificacaoService";
import * as gamificacaoService from "../services/gamificacaoService";

export async function getNovaPaginaInteresse(
    userId: number,
    necessidadeId: number
) {
    const necessidade = await interesseRepo.buscarNecessidadePorId(necessidadeId);

    if (!necessidade) {
        throw new Error("Necessidade não encontrada.");
    }

    return { necessidade };
}

export async function criarInteresse(params: {
    userId: number;
    necessidadeId: number;
    quantidade?: number;
    observacao?: string;
    dataPrevista?: string;
}) {
    const userExists = await doacaoRepo.userExists(params.userId);

    if (!userExists) {
        return {
            ok: false as const,
            error: "Apenas usuários podem demonstrar interesse em ajudar.",
        };
    }

    const necessidade = await interesseRepo.buscarNecessidadePorId(
        params.necessidadeId
    );

    if (!necessidade) {
        return {
            ok: false as const,
            error: "Necessidade não encontrada.",
        };
    }

    if (necessidade.status === "concluida" || necessidade.status === "cancelada") {
        return {
            ok: false as const,
            error: "Essa necessidade não está mais disponível para recebimento.",
        };
    }

    if (
        params.quantidade !== undefined &&
        (Number.isNaN(Number(params.quantidade)) || Number(params.quantidade) < 1)
    ) {
        return {
            ok: false as const,
            error: "A quantidade deve ser maior que zero.",
        };
    }

    await interesseRepo.createInteresse({
        usuarioId: params.userId,
        ongId: Number(necessidade.ong_id),
        necessidadeId: params.necessidadeId,
        quantidade: params.quantidade ? Number(params.quantidade) : null,
        observacao: params.observacao?.trim() || null,
        dataPrevista: params.dataPrevista || null,
    });

    const usuario = await doacaoRepo.buscarNomeUsuarioPorId(params.userId);
    const nomeUsuario = usuario?.nome ?? "Um usuário";

    await notificacaoService.criarNotificacaoParaOng({
        ongId: Number(necessidade.ong_id),
        titulo: "Novo interesse recebido",
        mensagem: `${nomeUsuario} demonstrou interesse em ajudar a necessidade "${necessidade.titulo}".`,
        tipo: "novo_interesse",
    });

    // Gamificação (fire-and-forget)
    gamificacaoService.processarAcao({ usuarioId: params.userId, acao: "primeiro_interesse" }).catch(() => {});

    return { ok: true as const };
}

const STATUS_FILTRO_VALIDOS = ["pendente", "aceito", "recebido", "cancelado", "todos"];

export async function listarInteressesDaOng(
    ongId: number,
    status?: string
) {
    const filtro = STATUS_FILTRO_VALIDOS.includes(status || "")
        ? status
        : "pendente";

    const interesses = await interesseRepo.listarInteressesPorOng(ongId, filtro);

    return {
        ok: true as const,
        interesses,
        filtroAtual: filtro,
    };
}

export async function aceitarInteresse(params: {
    interesseId: number;
    ongId: number;
}) {
    const interesse = await interesseRepo.buscarInteressePorId(params.interesseId);

    if (!interesse) {
        return { ok: false as const, error: "Interesse não encontrado." };
    }

    if (Number(interesse.ong_id) !== Number(params.ongId)) {
        return { ok: false as const, error: "Você não pode alterar este interesse." };
    }

    if (interesse.status !== "pendente") {
        return {
            ok: false as const,
            error: "Somente interesses pendentes podem ser aceitos.",
        };
    }

    await interesseRepo.atualizarStatusInteresse(interesse.id, "aceito");

    await notificacaoService.criarNotificacaoParaUsuario({
        usuarioId: Number(interesse.usuario_id),
        titulo: "Interesse aceito",
        mensagem: `${interesse.nome_ong} aceitou seu interesse em ajudar a necessidade "${interesse.titulo_necessidade}". Aguardando a entrega!`,
        tipo: "interesse_aceito",
    });

    return { ok: true as const };
}

export async function receberInteresse(params: {
    interesseId: number;
    ongId: number;
}) {
    const interesse = await interesseRepo.buscarInteressePorId(params.interesseId);

    if (!interesse) {
        return { ok: false as const, error: "Interesse não encontrado." };
    }

    if (Number(interesse.ong_id) !== Number(params.ongId)) {
        return { ok: false as const, error: "Você não pode alterar este interesse." };
    }

    if (interesse.status !== "aceito") {
        return {
            ok: false as const,
            error: "Somente interesses aceitos podem ser marcados como recebidos.",
        };
    }

    const quantidade = Number(interesse.quantidade ?? 0);

    await interesseRepo.atualizarStatusInteresse(interesse.id, "recebido");

    await notificacaoService.criarNotificacaoParaUsuario({
        usuarioId: Number(interesse.usuario_id),
        titulo: "Doação recebida",
        mensagem: `${interesse.nome_ong} confirmou o recebimento da sua doação para "${interesse.titulo_necessidade}". Obrigado pela ajuda!`,
        tipo: "interesse_recebido",
    });

    if (quantidade > 0) {
        await interesseRepo.atualizarQuantidadeRecebidaNecessidade({
            necessidadeId: Number(interesse.necessidade_id),
            quantidade,
        });

        const metaAtingida = await interesseRepo.concluirNecessidadeSeMetaAtingida(
            Number(interesse.necessidade_id)
        );

        if (metaAtingida) {
            await notificacaoService.criarNotificacaoParaOng({
                ongId: Number(interesse.ong_id),
                titulo: "Meta atingida!",
                mensagem: `A necessidade "${interesse.titulo_necessidade}" atingiu a meta de doações e foi concluída automaticamente!`,
                tipo: "meta_atingida",
            });
        }
    }

    // Gamificação (fire-and-forget)
    const acao = interesse.tipo_necessidade === "voluntariado" ? "interesse_voluntariado" : "interesse_confirmado";
    gamificacaoService.processarAcao({ usuarioId: Number(interesse.usuario_id), acao }).catch(() => {});

    return { ok: true as const };
}

export async function cancelarInteresse(params: {
    interesseId: number;
    ongId: number;
}) {
    const interesse = await interesseRepo.buscarInteressePorId(params.interesseId);

    if (!interesse) {
        return { ok: false as const, error: "Interesse não encontrado." };
    }

    if (Number(interesse.ong_id) !== Number(params.ongId)) {
        return { ok: false as const, error: "Você não pode alterar este interesse." };
    }

    if (interesse.status !== "pendente" && interesse.status !== "aceito") {
        return {
            ok: false as const,
            error: "Somente interesses pendentes ou aceitos podem ser cancelados.",
        };
    }

    await interesseRepo.atualizarStatusInteresse(interesse.id, "cancelado");

    await notificacaoService.criarNotificacaoParaUsuario({
        usuarioId: Number(interesse.usuario_id),
        titulo: "Interesse cancelado",
        mensagem: `${interesse.nome_ong} cancelou o interesse relacionado à necessidade "${interesse.titulo_necessidade}".`,
        tipo: "interesse_cancelado",
    });

    return { ok: true as const };
}
