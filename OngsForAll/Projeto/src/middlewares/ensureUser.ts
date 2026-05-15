import { FastifyReply, FastifyRequest } from "fastify";

export async function ensureUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.session.user;

  if (!user) {
    const redirectTo = encodeURIComponent(request.raw.url || "/dashboard");
    return reply.redirect(`/login?redirect=${redirectTo}`);
  }

  if (user.tipo === "ong") return reply.redirect("/dashboard/ong");
  if (user.tipo === "empresa") return reply.redirect("/empresa/dashboard");
}
