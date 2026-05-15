import { FastifyReply, FastifyRequest } from "fastify";

export async function ensureAdmin(request: FastifyRequest, reply: FastifyReply) {
  if ((request.session as any).adminAutenticado !== true) {
    return reply.redirect("/admin/login");
  }
}
