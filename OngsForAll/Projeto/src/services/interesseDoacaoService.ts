import * as interesseRepo from "../repositories/interesseDoacaoRepository";
import * as doacaoRepo from "../repositories/doacaoRepository";
import * as notificacaoService from "../services/notificacaoService";

function isTodayOrFutureDate(value?: string): boolean {
    if (!value) return true;

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;

    const [, year, month, day] = match;
    const inputDate = new Date(Number(year), Number(month) - 1, Number(day));

    if (
        inputDate.getFullYear() !== Number(year) ||
        inputDate.getMonth() !== Number(month) - 1 ||
        inputDate.getDate() !== Number(day)
    ) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return inputDate >= today;
}

export async function getNovaPaginaInteresse(
    userId: number,
    necessidadeId: number
) {
    const necessidade = await interesseRepo.buscarNecessidadePorId(necessidadeId);

    if (!necessidade) {
        throw new Error("Necessidade nao encontrada.");
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
            error: "Apenas usuarios podem demonstrar interesse em ajudar.",
        };
    }

    const necessidade = await interesseRepo.buscarNecessidadePorId(
        params.necessidadeId
    );

    if (!necessidade) {
        return {
            ok: false as const,
            error: "Necessidade nao encontrada.",
        };
    }

    if (necessidade.status === "concluida" || necessidade.status === "cancelada") {
        return {
            ok: false as const,
            error: "Essa necessidade nao esta mais disponivel para recebimento.",
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

    if (!isTodayOrFutureDate(params.dataPrevista)) {
        return {
            ok: false as const,
            error: "A data prevista para entrega não pode ser anterior a hoje.",
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
    const nomeUsuario = usuario?.nome ?? "Um usuario";

    await notificacaoService.criarNotificacaoParaOng({
        ongId: Number(necessidade.ong_id),
        titulo: "Novo interesse recebido",
        mensagem: `${nomeUsuario} demonstrou interesse em ajudar a necessidade "${necessidade.titulo}".`,
        tipo: "novo_interesse",
    });

    return { ok: true as const };
}

const STATUS_FILTRO_VALIDOS = ["pendente", "aceito", "recebido", "cancelado", "todos"];

export async function listarInteressesDaOng(
    ongId: number,
    status?: string,
    busca?: string
) {
    const filtro = STATUS_FILTRO_VALIDOS.includes(status || "")
        ? status
        : "pendente";

    const buscaNormalizada = busca?.trim() ?? "";
    const interesses = await interesseRepo.listarInteressesPorOng(ongId, filtro, buscaNormalizada);

    return {
        ok: true as const,
        interesses,
        filtroAtual: filtro,
        buscaAtual: buscaNormalizada,
    };
}

export async function aceitarInteresse(params: {
    interesseId: number;
    ongId: number;
}) {
    const interesse = await interesseRepo.buscarInteressePorId(params.interesseId);

    if (!interesse) {
        return { ok: false as const, error: "Interesse nao encontrado." };
    }

    if (Number(interesse.ong_id) !== Number(params.ongId)) {
        return { ok: false as const, error: "Voce nao pode alterar este interesse." };
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
        mensagem: `${interesse.nome_ong} aceitou seu interesse em ajudar a necessidade "${interesse.titulo_necessidade}". ID da solicitacao: #${interesse.id}. Aguardando a entrega!`,
        tipo: "interesse_aceito",
    });

    return { ok: true as const };
}

export async function receberInteresse(params: {
    interesseId: number;
    ongId: number;
    quantidadeRecebida?: string | number;
    observacaoRecebimento?: string;
}) {
    const interesse = await interesseRepo.buscarInteressePorId(params.interesseId);

    if (!interesse) {
        return { ok: false as const, error: "Interesse nao encontrado." };
    }

    if (Number(interesse.ong_id) !== Number(params.ongId)) {
        return { ok: false as const, error: "Voce nao pode alterar este interesse." };
    }

    if (interesse.status !== "aceito") {
        return {
            ok: false as const,
            error: "Somente interesses aceitos podem ser marcados como recebidos.",
        };
    }

    const quantidadeRecebidaInformada = Number(params.quantidadeRecebida);

    if (
        Number.isNaN(quantidadeRecebidaInformada) ||
        !Number.isFinite(quantidadeRecebidaInformada) ||
        quantidadeRecebidaInformada <= 0
    ) {
        return {
            ok: false as const,
            error: "Informe uma quantidade recebida maior que zero.",
        };
    }

    const quantidadeRecebida = Math.trunc(quantidadeRecebidaInformada);
    const quantidadeOferecida = Number(interesse.quantidade ?? 0);

    if (quantidadeOferecida > 0 && quantidadeRecebida > quantidadeOferecida) {
        return {
            ok: false as const,
            error: "A quantidade recebida nao pode ser maior que a quantidade oferecida.",
        };
    }

    await interesseRepo.atualizarStatusInteresse(interesse.id, "recebido");

    const observacaoRecebimento = params.observacaoRecebimento?.trim();
    const detalhesRecebimento = [
        `Quantidade recebida: ${quantidadeRecebida}.`,
        observacaoRecebimento ? `Observacao da ONG: ${observacaoRecebimento}` : null,
    ].filter(Boolean).join(" ");

    await notificacaoService.criarNotificacaoParaUsuario({
        usuarioId: Number(interesse.usuario_id),
        titulo: "Doacao recebida",
        mensagem: `${interesse.nome_ong} confirmou o recebimento da sua doacao para "${interesse.titulo_necessidade}". ${detalhesRecebimento} Obrigado pela ajuda!`,
        tipo: "interesse_recebido",
    });

    if (quantidadeRecebida > 0) {
        await interesseRepo.atualizarQuantidadeRecebidaNecessidade({
            necessidadeId: Number(interesse.necessidade_id),
            quantidade: quantidadeRecebida,
        });

        const metaAtingida = await interesseRepo.concluirNecessidadeSeMetaAtingida(
            Number(interesse.necessidade_id)
        );

        if (metaAtingida) {
            await notificacaoService.criarNotificacaoParaOng({
                ongId: Number(interesse.ong_id),
                titulo: "Meta atingida!",
                mensagem: `A necessidade "${interesse.titulo_necessidade}" atingiu a meta de doacoes e foi concluida automaticamente!`,
                tipo: "meta_atingida",
            });
        }
    }

    return { ok: true as const };
}

export async function cancelarInteresse(params: {
    interesseId: number;
    ongId: number;
    motivo?: string;
}) {
    const interesse = await interesseRepo.buscarInteressePorId(params.interesseId);

    if (!interesse) {
        return { ok: false as const, error: "Interesse nao encontrado." };
    }

    if (Number(interesse.ong_id) !== Number(params.ongId)) {
        return { ok: false as const, error: "Voce nao pode alterar este interesse." };
    }

    if (interesse.status !== "pendente" && interesse.status !== "aceito") {
        return {
            ok: false as const,
            error: "Somente interesses pendentes ou aceitos podem ser cancelados.",
        };
    }

    await interesseRepo.atualizarStatusInteresse(interesse.id, "cancelado");

    const motivoCancelamento = params.motivo?.trim();
    const mensagemMotivo = motivoCancelamento
        ? ` Motivo informado pela ONG: ${motivoCancelamento}`
        : "";

    await notificacaoService.criarNotificacaoParaUsuario({
        usuarioId: Number(interesse.usuario_id),
        titulo: "Interesse cancelado",
        mensagem: `${interesse.nome_ong} cancelou o interesse relacionado a necessidade "${interesse.titulo_necessidade}".${mensagemMotivo}`,
        tipo: "interesse_cancelado",
    });

    return { ok: true as const };
}
