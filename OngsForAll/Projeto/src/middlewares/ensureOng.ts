import { FastifyReply, FastifyRequest } from "fastify";

export async function ensureOng(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.session.user;

  if (!user) {
    return reply.redirect("/login");
  }

  if (user.tipo !== "ong") {
    return reply.redirect("/dashboard");
  }
}