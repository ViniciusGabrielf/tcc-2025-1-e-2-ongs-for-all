// homeController.test.ts
import { renderHomePage } from '../../src/controllers/homeController'
import { FastifyRequest, FastifyReply } from 'fastify'

describe('renderHomePage', () => {
  it('deve renderizar a página inicial com o título correto', async () => {
    // Mocks
    const request = {} as FastifyRequest

    const viewMock = jest.fn()
    const reply = {
      view: viewMock,
    } as unknown as FastifyReply

    // Chamada da função
    await renderHomePage(request, reply)

    // Expectativa
    expect(viewMock).toHaveBeenCalledWith(
      '/templates/index.hbs',
      { stitle: 'Início' },
      { layout: 'layouts/main' }
    )
  })
})
