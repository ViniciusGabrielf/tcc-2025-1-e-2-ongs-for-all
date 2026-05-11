import { FastifyReply, FastifyRequest } from 'fastify'

export async function ensureAuthenticated(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session.user) {
    return reply.redirect('/login')
  }
}
