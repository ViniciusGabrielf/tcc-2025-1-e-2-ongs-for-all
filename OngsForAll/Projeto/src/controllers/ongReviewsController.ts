import { FastifyRequest, FastifyReply } from "fastify";
import * as reviewService from "../services/ongReviewsService";

export async function submitOngReview(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  const { ongId } = request.params as { ongId: string };
  const ongIdNum = Number(ongId);

  if (!session) {
    return reply.redirect(`/login?redirect=${encodeURIComponent(`/ongs/${ongId}`)}`);
  }

  if (isNaN(ongIdNum) || ongIdNum <= 0) {
    return reply.redirect(`/ongs?erro=${encodeURIComponent("ONG não encontrada.")}`);
  }

  const { rating, comment } = request.body as { rating?: string; comment?: string };
  const ratingNum = Number(rating);

  if (!rating || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return reply.redirect(
      `/ongs/${ongId}?erro=${encodeURIComponent("Selecione uma nota de 1 a 5 estrelas.")}`
    );
  }

  try {
    const result = await reviewService.submitReview({
      ongId: ongIdNum,
      userId: Number(session.id),
      userTipo: session.tipo,
      rating: ratingNum,
      comment: comment?.trim() || null,
    });

    if (!result.ok) {
      return reply.redirect(
        `/ongs/${ongId}?erro=${encodeURIComponent(result.error)}`
      );
    }

    return reply.redirect(`/ongs/${ongId}?sucesso=1`);
  } catch (err) {
    console.error("[review] Erro ao salvar avaliação:", err);
    return reply.redirect(
      `/ongs/${ongId}?erro=${encodeURIComponent("Erro ao salvar a avaliação. Tente novamente.")}`
    );
  }
}
