import { FastifyRequest, FastifyReply } from "fastify";
import { validateDoacao } from "../validators/doacaoValidator";
import * as doacaoService from "../services/doacaoService";
import * as notificacaoService from "../services/notificacaoService";

const LAYOUT = "layouts/dashboardLayout";

async function getNaoLidas(session: any) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: session.tipo,
    id: Number(session.id),
  });
  return naoLidas;
}

// Exibir o formulário de nova doação
export async function renderNovaDoacaoPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.session.user;

  if (!user) {
    return reply.redirect("/login");
  }

  const { necessidade_id } = request.query as { necessidade_id?: string };

  try {
    const necessidadeIdNumber = necessidade_id
      ? Number(necessidade_id)
      : undefined;

    const { ongs, necessidade } = await doacaoService.getNovaDoacaoPageData(
      Number(user.id),
      necessidadeIdNumber
    );

    if (process.env.NODE_ENV === "test") {
      return reply.send({ user, ongs, necessidade });
    }

    const naoLidas = await getNaoLidas(user);

    return reply.view(
      "/templates/doacao/doar.hbs",
      {
        user,
        naoLidas,
        ongs,
        necessidade,
        formData: {
          ong_id: necessidade?.ong_id ?? "",
          tipo: necessidade?.categoria ?? "",
          necessidade_id: necessidade?.id ?? "",
        },
      },
      { layout: LAYOUT }
    );
  } catch (error: any) {
    console.error("Erro ao carregar página de doação:", error);
    return reply
      .code(500)
      .send(error?.message ?? "Erro ao carregar página de doação.");
  }
}

// Criar nova doação
export async function criarDoacao(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.session.user;

  if (!user) {
    return reply.redirect("/login");
  }

  const { valor, tipo, ong_id, necessidade_id } = request.body as {
    valor: string;
    tipo: string;
    ong_id: number;
    necessidade_id?: string;
  };

  const validation = validateDoacao({
    valor: Number(valor),
    tipo,
    ong_id: Number(ong_id),
  });

  if (!validation.isValid) {
    try {
      const necessidadeIdNumber = necessidade_id
        ? Number(necessidade_id)
        : undefined;

      const { ongs, necessidade } = await doacaoService.getNovaDoacaoPageData(
        Number(user.id),
        necessidadeIdNumber
      );

      if (process.env.NODE_ENV === "test") {
        return reply.code(400).send({ error: validation.errors[0] });
      }

      const naoLidas = await getNaoLidas(user);

      return reply.code(400).view(
        "/templates/doacao/doar.hbs",
        {
          user,
          naoLidas,
          ongs,
          necessidade,
          error: validation.errors[0],
          formData: {
            valor,
            tipo,
            ong_id,
            necessidade_id,
          },
        },
        { layout: LAYOUT }
      );
    } catch (error) {
      console.error("Erro ao recarregar formulário de doação:", error);
      return reply.code(500).send("Erro ao carregar formulário de doação.");
    }
  }

  try {
    const result = await doacaoService.criarDoacao({
      userId: Number(user.id),
      valor,
      tipo,
      ong_id: Number(ong_id),
      necessidade_id: necessidade_id ? Number(necessidade_id) : undefined,
    });

    if (!result.ok) {
      if (process.env.NODE_ENV === "test") {
        return reply.code(403).send({ error: result.error });
      }

      const necessidadeIdNumber = necessidade_id
        ? Number(necessidade_id)
        : undefined;

      const { ongs, necessidade } = await doacaoService.getNovaDoacaoPageData(
        Number(user.id),
        necessidadeIdNumber
      );

      const naoLidas = await getNaoLidas(user);

      return reply.code(403).view(
        "/templates/doacao/doar.hbs",
        {
          user,
          naoLidas,
          ongs,
          necessidade,
          error: result.error,
          formData: {
            valor,
            tipo,
            ong_id,
            necessidade_id,
          },
        },
        { layout: LAYOUT }
      );
    }

    return reply.redirect("/dashboard?sucesso=1");
  } catch (error: any) {
    console.error("Erro ao criar doação:", error);

    if (process.env.NODE_ENV === "test") {
      return reply.code(400).send({
        error: error?.message ?? "Erro ao criar doação.",
      });
    }

    try {
      const necessidadeIdNumber = necessidade_id
        ? Number(necessidade_id)
        : undefined;

      const { ongs, necessidade } = await doacaoService.getNovaDoacaoPageData(
        Number(user.id),
        necessidadeIdNumber
      );

      const naoLidas = await getNaoLidas(user);

      return reply.code(400).view(
        "/templates/doacao/doar.hbs",
        {
          user,
          naoLidas,
          ongs,
          necessidade,
          error: error?.message ?? "Erro ao criar doação.",
          formData: {
            valor,
            tipo,
            ong_id,
            necessidade_id,
          },
        },
        { layout: LAYOUT }
      );
    } catch {
      return reply
        .code(400)
        .send(error?.message ?? "Erro ao criar doação.");
    }
  }
}

// Histórico de doações do usuário
export async function listarHistoricoDoacoes(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.session.user;

  if (!user) {
    return reply.redirect("/login");
  }

  try {
    const { doacoes } = await doacaoService.listarHistorico(Number(user.id));

    if (process.env.NODE_ENV === "test") {
      return reply.send({ user, doacoes });
    }

    const naoLidas = await getNaoLidas(user);

    return reply.view(
      "/templates/doacao/historicoDoacoes.hbs",
      { user, naoLidas, doacoes },
      { layout: LAYOUT }
    );
  } catch (error) {
    console.error("Erro ao listar histórico de doações:", error);
    return reply.code(500).send("Erro ao carregar histórico de doações.");
  }
}
