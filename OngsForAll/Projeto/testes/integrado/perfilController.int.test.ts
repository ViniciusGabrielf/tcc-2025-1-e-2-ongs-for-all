import fastify, { FastifyReply, FastifyRequest } from 'fastify'
import path from 'path'
import * as perfilController from '../../src/controllers/perfilController'
import { pool } from '../../src/config/ds'
import bcrypt from 'bcryptjs'

let app: ReturnType<typeof fastify>

beforeAll(async () => {
  app = fastify()

  // Configuração da engine de view SEM layout
  app.register(require('@fastify/view'), {
    engine: { handlebars: require('handlebars') },
    root: path.join(__dirname, '../../src/views'),
    layout: false // Remove dependência de layouts nos testes
  })

  // Rotas mockadas usando os controllers reais
  app.post('/perfil/salvar', async (request: FastifyRequest, reply: FastifyReply) => {
    (request as any).session = {
      user: {
        id: 1,
        nome: 'Usuário Antigo',
        email: 'antigo@email.com'
      }
    }
    return perfilController.salvarPerfil(request, reply)
  })

  app.get('/perfil/editar', async (request: FastifyRequest, reply: FastifyReply) => {
    (request as any).session = {
      user: {
        id: 1,
        nome: 'Usuário Teste',
        email: 'teste@email.com'
      }
    }
    return perfilController.renderEditarPerfil(request, reply)
  })

  await app.ready()
})

afterAll(async () => {
  await app.close()
  await pool.end()
})

describe('Teste integrado - perfilController', () => {
  it('deve atualizar o perfil com sucesso', async () => {
    const novaSenha = 'senhaSegura123'

    const response = await app.inject({
      method: 'POST',
      url: '/perfil/salvar',
      payload: {
        id: '1',
        nome: 'Maria Teste',
        email: 'maria@email.com',
        password: novaSenha
      }
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/dashboard')

    const [result]: any = await pool.query('SELECT * FROM usuarios WHERE id = ?', [1])
    const usuario = result[0]

    expect(usuario.nome).toBe('Maria Teste')
    expect(usuario.email).toBe('maria@email.com')
    const senhaCorreta = await bcrypt.compare(novaSenha, usuario.senha)
    expect(senhaCorreta).toBe(true)
  })

  it('deve exibir mensagem de erro com senha inválida', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/perfil/salvar',
      payload: {
        id: '1',
        nome: 'Nome Qualquer',
        email: 'email@email.com',
        password: '123' // senha inválida (menor que 6)
      }
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatch(/mínimo 6 caracteres/i)
  })

  it('deve renderizar a página de editar perfil com dados da sessão', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/perfil/editar'
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Usuário Teste')
    expect(response.body).toContain('teste@email.com')
  })
})
