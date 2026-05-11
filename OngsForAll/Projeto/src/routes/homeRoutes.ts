import { FastifyInstance } from 'fastify'
import { renderHomePage } from '../controllers/homeController'

export async function homeRoutes(fastify: FastifyInstance) {
  fastify.get('/', renderHomePage)
}
