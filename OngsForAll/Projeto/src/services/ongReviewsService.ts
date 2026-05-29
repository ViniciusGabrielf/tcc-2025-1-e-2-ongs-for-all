import * as reviewRepo from "../repositories/ongReviewsRepository";
import * as perfilRepo from "../repositories/perfilRepository";

type ReviewResult =
  | { ok: true; media: number; total: number }
  | { ok: false; error: string };

const COMMENT_MAX_LENGTH = 500;

export async function submitReview(params: {
  ongId: number;
  userId: number;
  userTipo: string;
  rating: number;
  comment?: string | null;
}): Promise<ReviewResult> {
  const rating = Number(params.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "A nota deve ser entre 1 e 5 estrelas." };
  }

  if (params.userTipo === "ong") {
    return { ok: false, error: "Contas do tipo ONG não podem avaliar outras ONGs." };
  }

  const rawComment = params.comment?.trim() ?? null;

  if (rawComment && rawComment.length > COMMENT_MAX_LENGTH) {
    return {
      ok: false,
      error: `A observação deve ter no máximo ${COMMENT_MAX_LENGTH} caracteres.`,
    };
  }

  const ong = await perfilRepo.findOngById(params.ongId);
  if (!ong) {
    return { ok: false, error: "ONG não encontrada." };
  }

  await reviewRepo.upsertReview({
    ongId: params.ongId,
    userId: params.userId,
    userTipo: params.userTipo,
    rating,
    comment: rawComment || null,
  });

  const stats = await reviewRepo.getOngStats(params.ongId);
  return { ok: true, media: stats.media, total: stats.total };
}

export async function getReviewData(
  ongId: number,
  userId?: number,
  userTipo?: string
) {
  const stats = await reviewRepo.getOngStats(ongId);
  const userReview =
    userId && userTipo
      ? await reviewRepo.findUserReview(ongId, userId, userTipo)
      : null;

  return {
    media: stats.media,
    total: stats.total,
    mediaFormatada: stats.total > 0
      ? stats.media.toFixed(1).replace(".", ",")
      : null,
    mediaArredondada: Math.round(stats.media),
    userRating: userReview?.rating ?? null,
    userComment: userReview?.comment ?? null,
    userJaAvaliou: !!userReview,
  };
}
