import Fastify from 'fastify';
import fastifyView from '@fastify/view';
import handlebars from 'handlebars';
import path from 'path';
import { renderHomePage } from '../../src/controllers/homeController';

describe('Integração - HomeController', () => {
  let app: any;

  beforeAll(async () => {
    app = Fastify();

    const viewsDir = path.join(__dirname, '../../src/views');

    app.register(fastifyView, {
      engine: { handlebars },
      root: viewsDir,
      layout: false,
      options: {
        partials: {
          homenavbar: 'partials/homenavbar.hbs'  // ✅ RELATIVO AO ROOT
        }
      }
    });

    app.get('/', renderHomePage);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Deve renderizar a página inicial com sucesso', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Início');
  });
});
