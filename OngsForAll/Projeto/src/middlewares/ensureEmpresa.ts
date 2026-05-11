import { FastifyReply, FastifyRequest } from "fastify";

export async function ensureEmpresa(request: FastifyRequest, reply: FastifyReply) {
  const user = request.session.user;
  if (!user) return reply.redirect("/login");
  if (user.tipo !== "empresa") return reply.redirect("/dashboard");
}
