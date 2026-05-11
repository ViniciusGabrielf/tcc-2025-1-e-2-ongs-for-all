import { FastifyReply, FastifyRequest } from "fastify";

export async function ensureUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.session.user;

  if (!user) {
    return reply.redirect("/login");
  }

  if (user.tipo === "ong") return reply.redirect("/dashboard/ong");
  if (user.tipo === "empresa") return reply.redirect("/empresa/dashboard");
}
