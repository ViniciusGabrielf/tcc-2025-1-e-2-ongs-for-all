import * as authController from '../../src/controllers/authController'
import bcrypt from 'bcryptjs'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { FastifySessionObject } from '@fastify/session'

jest.mock('../../src/config/ds', () => ({
  pool: {
    query: jest.fn(),
    execute: jest.fn(),
  },
}))

const { pool } = require('../../src/config/ds')
const queryMock = pool.query as jest.Mock
const executeMock = pool.execute as jest.Mock

// Mock válido para FastifySessionObject
function createMockSession(): FastifySessionObject {
  return {
    sessionId: 'sessid',
    encryptedSessionId: 'encryptedSessid',
    touch: jest.fn(),
    regenerate: jest.fn(),
    destroy: jest.fn(),
    save: jest.fn(),
    reload: jest.fn(),
    // options é uma função que recebe um Partial<CookieOptions>
    options: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    isModified: jest.fn(),
    cookie: {
      maxAge: undefined,
      originalMaxAge: null,
      expires: null,
      httpOnly: true,
      path: '/',
      sameSite: false,
      secure: false,
      domain: undefined,
      // REMOVIDO toJSON pois não existe nesse tipo
    },
  }
}

describe('authController', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: {
    redirect: jest.Mock,
    status: jest.Mock,
    send: jest.Mock,
    view: jest.Mock,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    bcrypt.hash = jest.fn().mockResolvedValue('hashed-password')
    bcrypt.compare = jest.fn().mockResolvedValue(true)

    mockReply = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      view: jest.fn(),
    }
  })

  describe('registerUser', () => {
    it('deve registrar usuário com sucesso', async () => {
      mockRequest = {
        body: {
          nome: 'João',
          email: 'joao@example.com',
          password: '123456',
          cpf: '12345678901',
          telefone: '11999999999',
        },
        session: createMockSession(),
      }

      queryMock.mockResolvedValueOnce([[]]).mockResolvedValueOnce(undefined)

      await authController.registerUser(mockRequest as FastifyRequest, mockReply as any)

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10)
      expect(queryMock).toHaveBeenCalled()
      expect(mockReply.redirect).toHaveBeenCalledWith('/login')
    })

    it('deve normalizar cpf, telefone e campos textuais antes de salvar', async () => {
      mockRequest = {
        body: {
          nome: '  João da Silva  ',
          email: '  joao@example.com  ',
          password: '123456',
          cpf: '123.456.789-01',
          telefone: '(11) 99999-9999',
        },
        session: createMockSession(),
      }

      queryMock.mockResolvedValueOnce([[]]).mockResolvedValueOnce(undefined)

      await authController.registerUser(mockRequest as FastifyRequest, mockReply as any)

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO usuarios'),
        ['João da Silva', 'joao@example.com', 'hashed-password', '12345678901', '11999999999']
      )
    })

    it('deve retornar erro de validação', async () => {
      mockRequest = {
        body: {
          nome: '',
          email: 'invalido',
          password: '123',
          cpf: '123',
          telefone: '',
        },
        session: createMockSession(),
      }

      await authController.registerUser(mockRequest as FastifyRequest, mockReply as any)

      expect(mockReply.status).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalled()
      const sendArg = mockReply.send.mock.calls[0][0]
      expect(sendArg).toHaveProperty('errors')
      expect(sendArg.errors.length).toBeGreaterThan(0)
    })

    it('deve retornar erro genérico no banco', async () => {
      mockRequest = {
        body: {
          nome: 'Maria',
          email: 'maria@example.com',
          password: 'senha123',
          cpf: '12345678901',
          telefone: '11988887777',
        },
        session: createMockSession(),
      }

      queryMock.mockRejectedValueOnce(new Error('Erro no banco'))

      await authController.registerUser(mockRequest as FastifyRequest, mockReply as any)

      expect(mockReply.status).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalled()
    })

    it('deve retornar mensagem específica quando cpf já existir', async () => {
      mockRequest = {
        body: {
          nome: 'Maria',
          email: 'maria@example.com',
          password: 'senha123',
          cpf: '123.456.789-01',
          telefone: '(11) 98888-7777',
        },
        session: createMockSession(),
      }

      queryMock.mockRejectedValueOnce({
        code: 'ER_DUP_ENTRY',
        sqlMessage: "Duplicate entry '12345678901' for key 'usuarios.cpf'",
      })

      await authController.registerUser(mockRequest as FastifyRequest, mockReply as any)

      expect(mockReply.status).toHaveBeenCalledWith(400)
      expect(mockReply.view).toHaveBeenCalledWith(
        '/templates/auth/register.hbs',
        expect.objectContaining({ error: 'CPF já cadastrado.', activeTab: '#tab1' }),
        { layout: 'layouts/authLayout' }
      )
    })

    it('deve bloquear cadastro quando cpf ja existir antes do insert', async () => {
      mockRequest = {
        body: {
          nome: 'Maria',
          email: 'maria@example.com',
          password: 'senha123',
          cpf: '123.456.789-01',
          telefone: '(11) 98888-7777',
        },
        session: createMockSession(),
      }

      queryMock.mockResolvedValueOnce([[{ id: 1 }]])

      await authController.registerUser(mockRequest as FastifyRequest, mockReply as any)

      expect(mockReply.status).toHaveBeenCalledWith(400)
      expect(mockReply.view).toHaveBeenCalledWith(
        '/templates/auth/register.hbs',
        expect.objectContaining({ error: 'CPF já cadastrado.', activeTab: '#tab1' }),
        { layout: 'layouts/authLayout' }
      )
      expect(bcrypt.hash).not.toHaveBeenCalled()
      expect(queryMock).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO usuarios'),
        expect.any(Array)
      )
    })
  })

  describe('handleForgotPassword', () => {
    beforeEach(() => {
      mockRequest = {
        body: { nome: 'User', email: 'user@test.com', cpf: '12345678901' },
        session: createMockSession(),
      }
    })

    it('redireciona para redefinir senha se usuário encontrado', async () => {
      queryMock.mockResolvedValue([[{ id: 1 }]])

      await authController.handleForgotPassword(mockRequest as FastifyRequest, mockReply as any)

      expect(mockReply.redirect).toHaveBeenCalledWith('/redefinir-senha/1')
    })

    it('exibe erro se usuário não encontrado', async () => {
      queryMock.mockResolvedValue([[]])

      await authController.handleForgotPassword(mockRequest as FastifyRequest, mockReply as any)

      expect(mockReply.view).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ error: expect.any(String) }),
        expect.any(Object)
      )
    })

    it('deve lidar com erro no banco', async () => {
      queryMock.mockRejectedValueOnce(new Error('Erro de banco'))

      await authController.handleForgotPassword(mockRequest as FastifyRequest, mockReply as any)

      expect(mockReply.status).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalled()
    })
  })

  describe('handleResetPassword', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '1' },
        body: { password: 'senhaSegura123' },
        session: createMockSession(),
      }
    })

    it('retorna erro se senha inválida', async () => {
      mockRequest.body = { password: '123' }

      await authController.handleResetPassword(mockRequest as FastifyRequest, mockReply as any)

      expect(mockReply.status).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalled()
    })

    it('atualiza senha com sucesso', async () => {
      queryMock.mockResolvedValue(undefined)

      await authController.handleResetPassword(mockRequest as FastifyRequest, mockReply as any)

      expect(bcrypt.hash).toHaveBeenCalledWith('senhaSegura123', 10)
      expect(queryMock).toHaveBeenCalledWith(
        'UPDATE usuarios SET senha = ? WHERE id = ?',
        ['hashed-password', '1']
      )
      expect(mockReply.redirect).toHaveBeenCalledWith('/login')
    })

    it('deve lidar com erro no banco ao atualizar senha', async () => {
      queryMock.mockRejectedValueOnce(new Error('Erro ao atualizar senha'))

      await authController.handleResetPassword(mockRequest as FastifyRequest, mockReply as any)

      expect(mockReply.status).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalled()
    })
  })

  describe('loginUser', () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          email: 'user@example.com',
          password: 'senha1234',
        },
        session: createMockSession(),
      }
    })

    it('deve fazer login com sucesso e setar sessão', async () => {
      executeMock.mockResolvedValue([[{
        id: 1,
        nome: 'User',
        email: 'user@example.com',
        senha: 'hashed-password',
      }]])

      bcrypt.compare = jest.fn().mockResolvedValue(true)

      await authController.loginUser(mockRequest as FastifyRequest, mockReply as any)

      expect(executeMock).toHaveBeenCalledWith(
        'SELECT * FROM usuarios WHERE email = ?',
        ['user@example.com']
      )
      expect(mockReply.redirect).toHaveBeenCalledWith('/dashboard')

      if (mockRequest.session && mockRequest.session.user) {
        expect(mockRequest.session.user.email).toBe('user@example.com')
      } else {
        throw new Error('Session or user is undefined')
      }
    })
  })

  describe('logoutUser', () => {
    beforeEach(() => {
      mockRequest = {
        session: createMockSession(),
      }
    })

    it('deve destruir a sessão e redirecionar para login', async () => {
      await authController.logoutUser(mockRequest as FastifyRequest, mockReply as any)

      expect(mockRequest.session!.destroy).toHaveBeenCalled()
      expect(mockReply.redirect).toHaveBeenCalledWith('/login?logout=1')
    })
  })

  // --- Bloco adicional para aumentar cobertura ---
  describe('Cobertura adicional authController', () => {

    describe('registerONG', () => {
      it('deve registrar ONG com sucesso', async () => {
        mockRequest = {
          body: {
            nomeong: 'ONG Teste',
            emailong: 'ong@example.com',
            passwordong: 'senha123',
            cnpj_ong: '12345678000199',
            areadeatuacao: 'Educação',
            telefoneong: '11999999999',
          },
          session: createMockSession(),
        }

        queryMock.mockResolvedValueOnce([[]]).mockResolvedValueOnce(undefined)

        await authController.registerONG(mockRequest as FastifyRequest, mockReply as any)

        expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10)
        expect(queryMock).toHaveBeenCalled()
        expect(mockReply.redirect).toHaveBeenCalledWith('/login')
      })

      it('deve retornar erro de validação ao cadastrar ONG', async () => {
        mockRequest = {
          body: {
            nomeong: '',
            emailong: 'invalido',
            passwordong: '123',
            cnpj_ong: '123',
            areadeatuacao: '',
            telefoneong: '',
          },
          session: createMockSession(),
        }

        await authController.registerONG(mockRequest as FastifyRequest, mockReply as any)

        expect(mockReply.status).toHaveBeenCalledWith(400)
        expect(mockReply.send).toHaveBeenCalled()
        const sendArg = mockReply.send.mock.calls[0][0]
        expect(sendArg).toHaveProperty('errors')
      })

      it('deve retornar erro duplicidade no banco ao cadastrar ONG', async () => {
        mockRequest = {
          body: {
            nomeong: 'ONG Teste',
            emailong: 'ong@example.com',
            passwordong: 'senha123',
            cnpj_ong: '12345678000199',
            areadeatuacao: 'Educação',
            telefoneong: '11999999999',
          },
          session: createMockSession(),
        }

        queryMock.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' })

        await authController.registerONG(mockRequest as FastifyRequest, mockReply as any)

        expect(mockReply.status).toHaveBeenCalledWith(400)
        expect(mockReply.view).toHaveBeenCalledWith(
          '/templates/auth/register.hbs',
          expect.objectContaining({ activeTab: '#tab2' }),
          { layout: 'layouts/authLayout' }
        )
      })

      it('deve bloquear cadastro quando cnpj da ONG ja existir antes do insert', async () => {
        mockRequest = {
          body: {
            nomeong: 'ONG Teste',
            emailong: 'ong@example.com',
            passwordong: 'senha123',
            cnpj_ong: '12.345.678/0001-99',
            areadeatuacao: 'EducaÃ§Ã£o',
            telefoneong: '11999999999',
          },
          session: createMockSession(),
        }

        queryMock.mockResolvedValueOnce([[{ ong_id: 1 }]])

        await authController.registerONG(mockRequest as FastifyRequest, mockReply as any)

        expect(mockReply.status).toHaveBeenCalledWith(400)
        expect(mockReply.view).toHaveBeenCalledWith(
          '/templates/auth/register.hbs',
          expect.objectContaining({ error: 'CNPJ da ONG já cadastrado.', activeTab: '#tab2' }),
          { layout: 'layouts/authLayout' }
        )
        expect(bcrypt.hash).not.toHaveBeenCalled()
        expect(queryMock).not.toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO ongs'),
          expect.any(Array)
        )
      })

      it('deve lidar com erro genérico ao cadastrar ONG', async () => {
        mockRequest = {
          body: {
            nomeong: 'ONG Teste',
            emailong: 'ong@example.com',
            passwordong: 'senha123',
            cnpj_ong: '12345678000199',
            areadeatuacao: 'Educação',
            telefoneong: '11999999999',
          },
          session: createMockSession(),
        }

        queryMock.mockRejectedValueOnce(new Error('Erro genérico'))

        await authController.registerONG(mockRequest as FastifyRequest, mockReply as any)

        expect(mockReply.status).toHaveBeenCalledWith(500)
        expect(mockReply.send).toHaveBeenCalled()
      })
    })

    describe('render pages', () => {
      it('renderAuthLoginPage deve renderizar login com logoutSuccess true', async () => {
        mockRequest = {
          query: { logout: '1' }
        }
        await authController.renderAuthLoginPage(mockRequest as FastifyRequest, mockReply as any)
        expect(mockReply.view).toHaveBeenCalledWith(
          '/templates/auth/login.hbs',
          { logoutSuccess: true },
          { layout: 'layouts/authLayout' }
        )
      })

      it('renderAuthLoginPage deve renderizar login com logoutSuccess false', async () => {
        mockRequest = {
          query: { }
        }
        await authController.renderAuthLoginPage(mockRequest as FastifyRequest, mockReply as any)
        expect(mockReply.view).toHaveBeenCalledWith(
          '/templates/auth/login.hbs',
          { logoutSuccess: false },
          { layout: 'layouts/authLayout' }
        )
      })

      it('renderAuthRegisterPage deve renderizar página de registro', async () => {
        mockRequest = {}
        await authController.renderAuthRegisterPage(mockRequest as FastifyRequest, mockReply as any)
        expect(mockReply.view).toHaveBeenCalledWith(
          '/templates/auth/register.hbs',
          { activeTab: '#tab1' },
          { layout: 'layouts/authLayout' }
        )
      })

      it('renderForgotPasswordPage deve renderizar página de esqueci senha', async () => {
        mockRequest = {}
        await authController.renderForgotPasswordPage(mockRequest as FastifyRequest, mockReply as any)
        expect(mockReply.view).toHaveBeenCalledWith(
          '/templates/auth/forgotPassword.hbs',
          {},
          { layout: 'layouts/authLayout' }
        )
      })

      it('renderResetPasswordPage deve renderizar página de redefinir senha', async () => {
        mockRequest = {
          params: { id: '123' }
        }
        await authController.renderResetPasswordPage(mockRequest as FastifyRequest, mockReply as any)
        expect(mockReply.view).toHaveBeenCalledWith(
          '/templates/auth/resetPassword.hbs',
          { id: '123' },
          { layout: 'layouts/authLayout' }
        )
      })
    })

    describe('handleForgotPassword erros', () => {
      it('deve retornar erro 500 ao falhar na consulta', async () => {
        mockRequest = {
          body: { nome: 'User', email: 'user@test.com', cpf: '12345678901' },
          session: createMockSession()
        }
        queryMock.mockRejectedValueOnce(new Error('Erro de banco'))

        await authController.handleForgotPassword(mockRequest as FastifyRequest, mockReply as any)

        expect(mockReply.status).toHaveBeenCalledWith(500)
        expect(mockReply.send).toHaveBeenCalled()
      })
    })

    describe('handleResetPassword erros', () => {
      it('deve retornar erro 500 ao falhar na atualização', async () => {
        mockRequest = {
          params: { id: '1' },
          body: { password: 'senhaSegura123' },
          session: createMockSession()
        }
        queryMock.mockRejectedValueOnce(new Error('Erro ao atualizar'))

        await authController.handleResetPassword(mockRequest as FastifyRequest, mockReply as any)

        expect(mockReply.status).toHaveBeenCalledWith(500)
        expect(mockReply.send).toHaveBeenCalled()
      })
    })

    describe('logoutUser erros', () => {
    it('deve lidar com erro ao destruir sessão', async () => {
    const mockDestroy = jest.fn(() => Promise.reject(new Error('Erro destruição')))

    mockRequest = {
      session: {
        ...createMockSession(),
        destroy: mockDestroy,
      },
    }

    try {
      await authController.logoutUser(mockRequest as FastifyRequest, mockReply as any)
    } catch {
      // ignora erro para o teste continuar
    }

    expect(mockDestroy).toHaveBeenCalled()
    expect(mockReply.redirect).toHaveBeenCalledWith('/login?logout=1')
    })
    })
  })
})
