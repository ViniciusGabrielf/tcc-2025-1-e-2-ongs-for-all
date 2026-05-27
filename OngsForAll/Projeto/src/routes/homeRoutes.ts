import { FastifyInstance } from 'fastify'
import { renderHomePage, renderSobrePage } from '../controllers/homeController'
import { enviarContato } from '../controllers/contatoController'
import { renderApoiadoresPage } from '../controllers/apoiadoresPublicController'

export async function homeRoutes(fastify: FastifyInstance) {
  fastify.get('/', renderHomePage)
  fastify.get('/sobre', renderSobrePage)
  fastify.post('/contato', enviarContato)
  fastify.get('/apoiadores', renderApoiadoresPage)
}
