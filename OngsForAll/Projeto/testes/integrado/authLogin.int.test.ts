import Fastify from 'fastify'
import fastifyView from '@fastify/view'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import * as path from 'path'
import handlebars from 'handlebars'
import { pool } from '../../src/config/ds'
import { loginUser } from '../../src/controllers/authController'
import bcrypt from 'bcryptjs'

let app: any

beforeAll(async () => {
  const hashedPassword = await bcrypt.hash('senha123', 10)

  await pool.query(`
    INSERT INTO usuarios (nome, email, senha, cpf, telefone)
    VALUES (?, ?, ?, ?, ?)
  `, ['Login Teste', 'login@teste.com', hashedPassword, '12345678901', '11999999999'])

  app = Fastify()

  app.register(fastifyCookie)
  app.register(fastifySession, {
    secret: '12345678901234567890123456789012',
    cookie: { secure: false },
  })

  app.register(fastifyView, {
    engine: { handlebars },
    root: path.join(__dirname, '../../src/views/templates'),
    layout: false,
  })

  app.post('/login', loginUser)

  await app.ready()
})

afterAll(async () => {
  await pool.query(`DELETE FROM usuarios WHERE email = 'login@teste.com'`)
  await pool.query(`DELETE FROM login_logs WHERE email = 'login@teste.com'`)
  await app.close()
})

describe('Integração - loginUser', () => {
  it('Deve logar com sucesso e redirecionar para /dashboard', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/login',
      payload: {
        email: 'login@teste.com',
        password: 'senha123'
      }
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/dashboard')
  })

  it('Deve retornar erro com senha incorreta', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/login',
      payload: {
        email: 'login@teste.com',
        password: 'senhaerrada'
      }
    })

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body).error).toBe('E-mail ou senha incorretos')
  })
})

