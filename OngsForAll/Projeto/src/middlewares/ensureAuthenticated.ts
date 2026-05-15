import { FastifyReply, FastifyRequest } from 'fastify'

export async function ensureAuthenticated(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session.user) {
    const redirectTo = encodeURIComponent(request.raw.url || "/dashboard");
    return reply.redirect(`/login?redirect=${redirectTo}`)
  }
}
