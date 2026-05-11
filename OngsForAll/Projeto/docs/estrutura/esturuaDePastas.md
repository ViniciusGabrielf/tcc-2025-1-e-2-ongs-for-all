# Estrutura de pastas: Documentação MVC

## Arquitetura

Este projeto é estruturado seguindo o padrão de arquitetura MVC (Model-View-Controller), com a seguinte distribuição:

- **Models**: Representa os dados do aplicativo e as regras para alterar esses dados.
- **Views**: Responsável pela apresentação dos dados fornecidos pelos Models.
- **Controllers**: Intermediário entre Models e Views, processando a lógica de negócios e as entradas do usuário.

## Estrutura do Diretório

```plaintext
src/
├── config/
│   └── view.ts
├── controllers/
│   ├── authController.ts
│   └── homeController.ts
├── models/
├── routes/
│   ├── allRoutes.ts
│   ├── authRoutes.ts
│   └── homeRoutes.ts
├── services/
├── views/
│   ├── layouts/
│   │   ├── authLayout.hbs
│   │   └── main.hbs
│   ├── partials/
│   │   └── homenavbar.hbs
│   └── templates/
│       └── auth/
│           ├── index.hbs
│           ├── login.hbs
│           └── register.hbs
├── app.ts
└── .env
```


## Configurações

### View Engine

A configuração do motor de visualização está no arquivo `view.ts`. Ele usa o pointOfView para integrar o handlebars como motor de template.

Configurações principais:

- `engine`: Define o handlebars como o motor de template.
- `viewExt`: Define `.hbs` como a extensão dos arquivos de visualização.
- `root`: Especifica o caminho para o diretório de visualizações.
- `options`: Define partials, como o `homenavbar`.
- `defaultContext`: Define o contexto padrão, como o título do site.

### Rotas

#### authRoutes

Controla as rotas de autenticação, como `/login` e `/register`, e delega a renderização para o `authController`.

#### homeRoutes

Manuseia as rotas relacionadas à página inicial.

## Controllers

### authController

Contém funções como `renderAuthLoginPage` e `renderAuthRegisterPage`, que processam a renderização das páginas de login e registro.

## Models

Modelos são usados para representar e interagir com os dados. No projeto, models serão implementados conforme a necessidade.

## Servidor e Inicialização (`app.ts`)

- Inicializa o servidor fastify.
- Registra `fastifyStatic` para servir arquivos estáticos.
- Chama `initViewEngine` para configurar o motor de visualização.
- Registra todas as rotas usando `registerAllRoutes`.
- Inicia o servidor na porta especificada no `.env`.

## Exemplo de Uso

### Controllers

```typescript
import { FastifyReply, FastifyRequest } from 'fastify';

export async function renderAuthLoginPage(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  return reply.view(
    '/templates/auth/login.hbs',
    {},
    {
      layout: 'layouts/authLayout',
    },
  );
}

export async function renderAuthRegisterPage(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  return reply.view(
    '/templates/auth/register.hbs',
    {},
    {
      layout: 'layouts/authLayout',
    },
  );
}
