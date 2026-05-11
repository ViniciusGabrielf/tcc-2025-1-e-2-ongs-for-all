import Fastify from 'fastify'
import fastifyView from '@fastify/view'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import * as path from 'path'
import { registerUser } from '../../src/controllers/authController'
import { pool } from '../../src/config/ds'
import handlebars from 'handlebars'

let app: ReturnType<typeof Fastify>

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
    layout: false,
  })

  // Registra rota para o controller
  app.post('/register-user', registerUser)

  await app.ready()
})

afterAll(async () => {
  await pool.end()  // Fecha o pool de conexões do DB
  await app.close() // Fecha servidor Fastify
})

describe('Integração - registerUser', () => {
  const uniqueEmail = `teste+${Date.now()}@exemplo.com`

  // Limpeza antes e depois para garantir consistência do teste
  beforeEach(async () => {
    await pool.query(`DELETE FROM usuarios WHERE email = ?`, [uniqueEmail])
  })

  afterEach(async () => {
    await pool.query(`DELETE FROM usuarios WHERE email = ?`, [uniqueEmail])
  })

  it('Deve cadastrar um novo usuário com sucesso e redirecionar para /login', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/register-user',
      payload: {
        nome: 'Usuário Teste',
        email: uniqueEmail,
        password: '12345678',
        cpf: '12345678901',
        telefone: '11999999999',
      },
    })

    expect(response.statusCode).toBe(302) // Redirecionamento HTTP
    expect(response.headers.location).toBe('/login') // Location header correto
  })

  it('Deve retornar erro 400 para dados inválidos', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/register-user',
      payload: {
        nome: '',           // inválido: vazio
        email: 'invalido',  // inválido: não é email
        password: '123',    // inválido: menor que 6
        cpf: '123',         // inválido: menor que 11
        telefone: '',       // inválido: vazio
      },
    })

    expect(response.statusCode).toBe(400)
    const payload = JSON.parse(response.payload)
    expect(payload).toHaveProperty('errors')
    expect(payload.errors.length).toBeGreaterThan(0)
  })

  it('Deve retornar erro 400 ao tentar cadastrar usuário já existente (simulando erro do banco)', async () => {
    // Primeira inserção deve funcionar
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha, cpf, telefone) VALUES (?, ?, ?, ?, ?)`,
      ['Teste Existente', uniqueEmail, 'hashed-password', '12345678901', '11999999999']
    )

    // Tentar inserir novamente com o mesmo email (provocando erro no banco)
    const response = await app.inject({
      method: 'POST',
      url: '/register-user',
      payload: {
        nome: 'Usuário Teste',
        email: uniqueEmail,
        password: '12345678',
        cpf: '12345678901',
        telefone: '11999999999',
      },
    })

    expect(response.statusCode).toBe(400) // Espera erro, pois email já existe
    const payload = JSON.parse(response.payload)
    expect(payload).toHaveProperty('message')
    expect(payload.message).toMatch(/Email já cadastrado/i)
  })
})
