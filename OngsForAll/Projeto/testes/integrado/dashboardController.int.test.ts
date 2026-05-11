import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import fastifyView from '@fastify/view'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import * as path from 'path'
import handlebars from 'handlebars'
import { pool } from '../../src/config/ds'
import { renderDashBoardPage } from '../../src/controllers/dashboardController'

let app: any
const testUserId = 9999

beforeAll(async () => {
  app = Fastify()

  app.register(fastifyCookie)
  app.register(fastifySession, {
    secret: '12345678901234567890123456789012',
    cookie: { secure: false },
  })

  app.register(fastifyView, {
    engine: { handlebars },
    root: path.join(__dirname, '../../src/views/templates'),
    layout: false
  })

  // Simula rota de dashboard com usuário já logado na sessão
  app.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    // Simula a sessão do usuário existente no banco para teste
    if (!request.session.user) {
      request.session.user = {
        id: testUserId,
        nome: 'Usuário Teste',
        email: 'teste@exemplo.com'
      }
    }
    return renderDashBoardPage(request, reply)
  })

  // Inserir usuário fictício (somente se não existir)
  const [users] = await pool.query(`SELECT id FROM usuarios WHERE id = ?`, [testUserId])
  if ((users as any).length === 0) {
    await pool.query(`
      INSERT INTO usuarios (id, nome, email, senha, cpf, telefone)
      VALUES (?, 'Usuário Teste', 'teste@exemplo.com', 'fakehash', '12345678900', '11999999999')
    `, [testUserId])
  }

  // Inserir doações (limpar antes)
  await pool.query(`DELETE FROM doacoes WHERE usuario_id = ?`, [testUserId])
  await pool.query(`
    INSERT INTO doacoes (usuario_id, ong_id, tipo, valor, data)
    VALUES 
      (?, 1, 'Pix', 100.00, '2024-01-15'),
      (?, 2, 'Cartão', 75.50, '2024-02-10'),
      (?, 1, 'Pix', 50.25, '2024-01-20')
  `, [testUserId, testUserId, testUserId])

  await app.ready()
})

afterAll(async () => {
  await pool.query(`DELETE FROM doacoes WHERE usuario_id = ?`, [testUserId])
  await pool.query(`DELETE FROM usuarios WHERE id = ?`, [testUserId])
  await app.close()
})

describe('Integração - renderDashBoardPage', () => {
  it('Deve retornar o dashboard com os dados dos gráficos', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/dashboard'
    })

    expect(response.statusCode).toBe(200)

    // Confirma que os dados foram renderizados
    expect(response.body).toContain('"Pix"')
    expect(response.body).toContain('"Cartão"')
    expect(response.body).toContain('"Jan"')
    expect(response.body).toContain('"Fev"')
  })
})
