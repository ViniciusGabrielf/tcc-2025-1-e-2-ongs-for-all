import { FastifyInstance } from 'fastify'
import { renderPerfilPage, updatePerfil } from '../controllers/perfilController'
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated'

export async function perfilRoutes(fastify: FastifyInstance) {

  fastify.get('/perfil/editar', 
    { preHandler: ensureAuthenticated }, 
    renderPerfilPage
  )

  fastify.post('/perfil/editar', 
    { preHandler: ensureAuthenticated }, 
    updatePerfil
  )

}