<div align="center">

<img src="https://img.shields.io/badge/-%F0%9F%92%9A%20ONGs%20For%20All-1a1a2e?style=for-the-badge&logoColor=white" height="45"/>

### Plataforma digital de conexão entre apoiadores e ONGs

*Transparência · Rastreabilidade · Engajamento Social*

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Jest](https://img.shields.io/badge/Jest-29-C21325?style=flat-square&logo=jest&logoColor=white)](https://jestjs.io)
[![Cypress](https://img.shields.io/badge/Cypress-14-69D3A7?style=flat-square&logo=cypress&logoColor=white)](https://www.cypress.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-8B5CF6?style=flat-square)](LICENSE)

<br/>

> **TCC — Bacharelado em Sistemas de Informação**
> Centro Universitário Senac · São Paulo · 2026

</div>

---

## 📋 Índice

| | |
|---|---|
| [💡 Sobre o projeto](#-sobre-o-projeto) | [⚙️ Instalação](#️-instalação-e-configuração) |
| [✨ Funcionalidades](#-funcionalidades) | [🔑 Variáveis de ambiente](#-variáveis-de-ambiente) |
| [🏗️ Arquitetura](#️-arquitetura) | [🗺️ Rotas da aplicação](#️-rotas-da-aplicação) |
| [🔌 APIs e integrações](#-apis-e-integrações-externas) | [🧪 Testes](#-testes) |
| [📁 Estrutura de pastas](#-estrutura-de-pastas) | [🤝 Contribuindo](#-contribuindo) |
| [🚀 Deploy](#-deploy) | [📄 Licença](#-licença) |

---

## 💡 Sobre o projeto

O **ONGs For All** é uma plataforma web de intermediação informacional entre **ONGs de pequeno e médio porte**, pessoas físicas, voluntários e parceiros institucionais. O objetivo é reduzir as barreiras de visibilidade, transparência e captação de apoio enfrentadas pelas organizações sociais.

```
  Visitante ──── explora ONGs e necessidades ────▶ sem cadastro
  Apoiador  ──── registra interesse em apoio ────▶ acompanha status
  ONG       ──── publica necessidades ────────────▶ confirma recebimentos
  Empresa   ──── apoia necessidades ──────────────▶ vitrine institucional
  Admin     ──── aprova cadastros e modera ───────▶ painel de controle
```

### 🎯 Problema resolvido

| Problema | Solução |
|---|---|
| ONGs com baixa visibilidade digital | Perfil público com necessidades, evidências e relatórios |
| Doadores sem saber onde apoiar | Exploração pública sem cadastro, filtros por categoria |
| Falta de transparência no processo | Máquina de estados com rastreabilidade ponta a ponta |
| Dificuldade de verificar ONGs legítimas | Validação de CNPJ via API oficial + aprovação administrativa |

---

## ✨ Funcionalidades

<details>
<summary><strong>🌐 Área pública (sem login)</strong></summary>

- Exploração de ONGs aprovadas com filtros por categoria e área de atuação
- Visualização de necessidades publicadas (bens, serviços, voluntariado)
- Página de transparência de cada ONG com evidências e relatórios de impacto
- Localização pública de ONGs com mapa integrado
- Listagem de apoiadores institucionais
- Avaliação média de ONGs por estrelas exibida publicamente

</details>

<details>
<summary><strong>👤 Pessoa física / voluntário</strong></summary>

- Cadastro com verificação de e-mail por código e aceite obrigatório dos Termos de Uso
- Registro de interesse em apoiar necessidades (bens, serviços ou voluntariado)
- Acompanhamento de apoios: `pendente → aceito → recebido`
- ⭐ **Avaliação de ONGs por estrelas (1–5) com comentário opcional**
- Lembretes automáticos de entrega por e-mail (D-2 e no dia previsto)
- Mensagens internas com ONGs, notificações e calendário de atividades

</details>

<details>
<summary><strong>🏢 ONG</strong></summary>

- Cadastro com validação de CNPJ via API oficial e verificação de e-mail
- Publicação e gerenciamento de necessidades com catálogo validado de categorias
- Aceite de interesses, controle de quantidade e confirmação de recebimentos
- Upload de evidências com **moderação automática por IA** (OpenAI + Gemini)
- Relatórios de impacto social com anexos
- Dashboard gerencial com exportação CSV

</details>

<details>
<summary><strong>🤝 Empresa / parceiro institucional</strong></summary>

- Apoio direto a necessidades de ONGs
- Vitrine institucional de itens (base preparatória para *marketplace* futuro)
- Mensagens com ONGs e acompanhamento de apoios

</details>

<details>
<summary><strong>🛡️ Administrador</strong></summary>

- Aprovação e rejeição de cadastros de ONGs e documentos enviados
- Moderação de itens da vitrine, evidências e publicidades institucionais
- Gestão de apoiadores institucionais e empresas parceiras

</details>

<details>
<summary><strong>🔒 Segurança e recursos técnicos</strong></summary>

| Recurso | Implementação |
|---|---|
| Hash de senhas | bcrypt (custo 10) |
| Proteção de sessão | Cookies `httpOnly` + `SameSite` + regeneração no *login* |
| Força bruta | Rate limiting — login (10/15 min) e reset (5/15 min) |
| Verificação de conta | Código por e-mail com expiração de 30 min |
| Redefinição de senha | Código por e-mail com expiração de 15 min |
| Aceite de termos | Checkbox obrigatório + registro de data e versão no banco |
| Moderação de imagens | OpenAI Moderation API + Google Gemini Vision |
| Validação de arquivos | *Magic bytes* (tipo real, não só extensão) + limite de 5 MB |
| Validação de CNPJ | API oficial CNPJ.ws em tempo real |
| Logs de autenticação | Registro de e-mail, IP e resultado de cada tentativa |

</details>

---

## 🏗️ Arquitetura

A aplicação segue arquitetura **monolítica em camadas** com renderização no servidor (SSR via Handlebars).

```
┌─────────────────────────────────────────────────────────┐
│                      NAVEGADOR                          │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────┐
│               ROTAS  (17 módulos — Fastify)              │
├─────────────────────────────────────────────────────────┤
│           MIDDLEWARES  (auth · perfil · rate limit)      │
├─────────────────────────────────────────────────────────┤
│              CONTROLLERS  (22 — orquestração)            │
│         ┌───────────────┴───────────────┐               │
│     VALIDATORS                       SERVICES           │
│    (Zod + regras)              (23 — regras negócio)     │
│                          ┌────────────┴────────────┐    │
│                    REPOSITORIES              APIs externas│
│                 (24 — SQL params)     CNPJ.ws · ViaCEP   │
│                        │             Nominatim · OpenAI  │
│                    ┌───▼───┐         Gemini · SMTP       │
│                    │ MySQL │                             │
│                    └───────┘                             │
├─────────────────────────────────────────────────────────┤
│           VIEWS  (Handlebars — HTML renderizado)         │
└─────────────────────────────────────────────────────────┘
```

### 🔄 Fluxo principal de apoio

```
  👤 Pessoa física
       │
       ├─ demonstra interesse ──────────────── status: PENDENTE
       │                                              │
       │                              🏢 ONG recebe notificação
       │                                              │
       │                              ├─ aceita ───── status: ACEITO
       │                              │
       │         📧 Lembrete automático (D-2 e no dia)
       │                              │
       │                              └─ confirma recebimento
       │                                              │
       │                                     status: RECEBIDO
       │
       └─ cancela (de pendente ou aceito) ─── status: CANCELADO

  🎯 Meta atingida → necessidade concluída automaticamente
```

---

## 🔌 APIs e integrações externas

| Serviço | Finalidade | Endpoint |
|---|---|---|
| **CNPJ.ws** | Validação de CNPJ de ONGs e empresas | `https://publica.cnpj.ws/cnpj/{cnpj}` |
| **ViaCEP** | Consulta de endereço por CEP | `https://viacep.com.br/ws/{cep}/json/` |
| **Nominatim** | Geocodificação de endereços para mapa | `https://nominatim.openstreetmap.org/search` |
| **OpenAI Moderation** | Moderação automática de imagens | `POST /v1/moderations` — `omni-moderation-latest` |
| **OpenAI Vision** | Análise visual de imagens | `POST /v1/chat/completions` — `gpt-4o` |
| **Google Gemini** | Moderação visual complementar | `gemini-2.5-flash:generateContent` |
| **Nodemailer / SMTP** | E-mails transacionais | Verificação, reset, notificações, lembretes |

> **Por que dois serviços de moderação?**
> OpenAI e Gemini possuem sensibilidades distintas a categorias de conteúdo. A combinação aumenta a cobertura e reduz falsos negativos antes da publicação de qualquer imagem na plataforma.

---

## 📁 Estrutura de pastas

```
OngsForAll/Projeto/
├── src/
│   ├── app.ts                      # Entrada — plugins, rotas, migrações
│   ├── config/
│   │   ├── ds.ts                   # Pool de conexão MySQL
│   │   └── view.ts                 # Configuração Handlebars
│   ├── constants/
│   │   └── necessidadeCatalogo.ts  # Catálogo validado de categorias
│   ├── controllers/                # 22 controllers
│   ├── database/
│   │   └── runMigrations.ts        # Migrations incrementais automáticas
│   ├── middlewares/                # ensureAuthenticated · ensureOng
│   │                               # ensureEmpresa · ensureAdmin · rateLimit
│   ├── repositories/               # 24 repositories — SQL parametrizado
│   ├── routes/                     # 17 módulos de rotas
│   ├── services/                   # 23 services — regras de negócio
│   ├── types/                      # Extensões TypeScript
│   ├── utils/                      # magicBytes · pagination · passwordValidator
│   ├── validators/                 # authValidator · necessidadeValidator · perfilValidator
│   └── views/                      # Templates Handlebars
│
├── testes/
│   ├── unitario/                   # 10 arquivos — Jest
│   ├── integrado/                  # 6 arquivos — Jest
│   └── e2e/                        # 5 arquivos — Cypress
│
├── cypress/                        # Suporte Cypress
├── public/
│   ├── css/                        # Fonte Tailwind (global.css)
│   ├── dist/                       # CSS compilado (gerado no build)
│   ├── js/                         # Scripts estáticos
│   └── uploads/                    # Logos, evidências, imagens
│
├── .env                            # ⚠️  Não commitar — ver .gitignore
├── docker-compose.yaml             # Serviço MySQL
├── jest.config.js                  # Jest + ts-jest + jest-stare
├── cypress.config.ts               # Cypress (baseUrl: localhost:3000)
├── tsconfig.json                   # strict · ES2022 · Node16
└── package.json
```

---

## ⚙️ Instalação e configuração

### Pré-requisitos

- [Node.js](https://nodejs.org) **v22+**
- [npm](https://www.npmjs.com) **v10+**
- [Docker](https://www.docker.com) + **Docker Compose**
- Chave [OpenAI](https://platform.openai.com) com acesso à Moderation API
- Chave [Google AI Studio](https://aistudio.google.com) — Gemini
- Conta de e-mail SMTP (Gmail com App Password funciona)

### Passo a passo

**1. Clone e instale**

```bash
git clone https://github.com/seu-usuario/ongs-for-all.git
cd ongs-for-all/OngsForAll/Projeto
npm install
```

**2. Configure o `.env`**

```bash
cp .env.example .env   # edite com suas credenciais
```

Veja a seção [Variáveis de ambiente](#-variáveis-de-ambiente) para a referência completa.

**3. Suba o banco de dados**

```bash
docker compose up -d
docker compose ps        # verifique se está rodando
```

> Banco disponível em `localhost:3307`. O schema `obgforall` é criado automaticamente.

**4. Crie as tabelas**

```bash
docker exec -it mysql1 mysql -u root -p obgforall
# execute o script docs/schema.sql
```

As migrations incrementais (novas colunas e tabelas auxiliares) rodam automaticamente ao iniciar a aplicação.

**5. Inicie**

```bash
# Desenvolvimento — hot reload + CSS em watch
npm run dev

# Produção
npm run build && npm start
```

Acesse: **[http://localhost:3000](http://localhost:3000)**

---

## 📜 Scripts disponíveis

```bash
npm run dev              # Servidor + CSS em watch (paralelo)
npm run dev:server       # Apenas servidor com hot reload
npm run build            # Compila CSS + views + TypeScript → dist/
npm run build-css        # Compila Tailwind CSS
npm start                # Inicia a partir do build (dist/app.js)
npm test                 # Testes Jest + relatório HTML (jest-stare/)
npm run test:coverage    # Testes com relatório de cobertura
```

---

## 🔑 Variáveis de ambiente

```env
# ── Servidor ──────────────────────────────────────────
PORT=3000
NODE_ENV=development          # development | production | test
APP_BASE_URL=http://localhost:3000    # usado em links de e-mail
PUBLIC_BASE_URL=http://localhost:3000
NODE_APP_HOST=0.0.0.0

# ── Sessão ────────────────────────────────────────────
# gerar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=sua_string_secreta_longa_aqui

# ── Banco de dados ────────────────────────────────────
MYSQL_PORT=3307
MYSQL_LOCAL_PORT=3307
MYSQL_DOCKER_PORT=3306
MYSQL_DATABASE=obgforall
MYSQL_PASSWORD=sua_senha_mysql

# ── E-mail (SMTP) ─────────────────────────────────────
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua_app_password_gmail

# ── Moderação de imagens ──────────────────────────────
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
MODERATION_SCORE_AUTO_REJECT=0.5   # 0.0 a 1.0

# ── CNPJ.ws ───────────────────────────────────────────
CNPJ_WS_BASE_URL=https://publica.cnpj.ws/cnpj
CNPJ_WS_DISABLE_LOOKUP=false       # true em ambiente de testes
CNPJ_WS_TIMEOUT_MS=8000

# ── Administrador ─────────────────────────────────────
ADMIN_SECRET=segredo_do_painel_admin
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SESSION_SECRET` | ✅ | Assina os cookies de sessão — use string longa e aleatória |
| `OPENAI_API_KEY` | ⚠️* | Moderação de imagens — obrigatória para uploads |
| `GEMINI_API_KEY` | ⚠️* | Moderação visual — obrigatória para uploads |
| `ADMIN_SECRET` | ✅ | Protege o painel `/admin` |
| `CNPJ_WS_DISABLE_LOOKUP` | — | `true` desativa validação de CNPJ em testes |

> \* A aplicação sobe sem as chaves de IA, mas uploads de imagem falharão.

---

## 🗺️ Rotas da aplicação

<details>
<summary><strong>🌐 Rotas públicas</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/` | Página inicial |
| `GET` | `/sobre` | Sobre a plataforma |
| `GET/POST` | `/contato` | Página e envio de contato |
| `GET` | `/apoiadores` | Apoiadores institucionais |
| `GET` | `/necessidades` | Listagem pública de necessidades |
| `GET` | `/necessidades/:id` | Detalhes de uma necessidade |
| `GET` | `/ongs` | Listagem pública de ONGs |
| `GET` | `/ongs/:id` | Detalhes de uma ONG |
| `GET` | `/ongs/:id/transparencia` | Transparência da ONG |
| `GET` | `/ongs/:id/localizacao` | Localização no mapa |
| `GET` | `/termos-de-uso` | Termos de Uso e Política de Privacidade |
| `GET` | `/api/cep/:cep` | Consulta de CEP (ViaCEP) |
| `GET` | `/api/apoiadores/publico` | Apoiadores para o rodapé |

</details>

<details>
<summary><strong>🔐 Autenticação</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `GET/POST` | `/login` | Tela e processamento de login |
| `POST` | `/logout` | Encerrar sessão |
| `GET` | `/register` | Seleção de tipo de cadastro |
| `POST` | `/register-user` | Cadastrar pessoa física |
| `POST` | `/register-ong` | Cadastrar ONG (valida CNPJ) |
| `GET/POST` | `/register-empresa` | Cadastrar empresa |
| `GET/POST` | `/verificar-email` | Verificação de e-mail por código |
| `GET/POST` | `/esqueci-minha-senha` | Solicitar reset (rate limit: 5/15 min) |
| `POST` | `/redefinir-senha` | Redefinir senha com código |

</details>

<details>
<summary><strong>👤 Pessoa física / voluntário</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/dashboard` | Painel principal |
| `GET/POST` | `/perfil/editar` | Edição de perfil e foto |
| `GET` | `/interesses` | Meus apoios |
| `POST` | `/interesses` | Registrar interesse em apoio |
| `POST` | `/interesses/:id/cancelar` | Cancelar interesse |
| `POST` | `/ongs/:ongId/avaliar` | Avaliar ONG (1–5 ⭐) |
| `GET` | `/notificacoes` | Notificações internas |
| `POST` | `/notificacoes/marcar-lida` | Marcar como lida |
| `GET/POST` | `/mensagens` | Conversas e nova mensagem |
| `GET/POST` | `/mensagens/:id` | Conversa específica |
| `GET` | `/calendario` | Calendário de atividades |

</details>

<details>
<summary><strong>🏢 ONG</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/ong/dashboard` | Painel da ONG |
| `GET` | `/ong/necessidades` | Gestão de necessidades |
| `GET/POST` | `/necessidades/nova` | Criar necessidade |
| `GET/POST` | `/necessidades/:id/editar` | Editar necessidade |
| `POST` | `/necessidades/:id/status` | Alterar status |
| `GET` | `/ong/interesses` | Interesses recebidos |
| `POST` | `/ong/interesses/:id/aceitar` | Aceitar interesse |
| `POST` | `/ong/interesses/:id/receber` | Confirmar recebimento |
| `GET/POST` | `/ong/evidencias` | Evidências de apoio |
| `GET/POST` | `/ong/relatorios` | Relatórios de impacto |
| `GET` | `/ong/relatorios/gerenciais` | Dashboard gerencial |
| `GET` | `/ong/relatorios/gerenciais/exportar.csv` | Exportar CSV |
| `GET/POST` | `/ong/documentos` | Documentos institucionais |

</details>

<details>
<summary><strong>🤝 Empresa</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/empresa/dashboard` | Painel da empresa |
| `GET` | `/empresa/necessidades` | Necessidades para apoiar |
| `POST` | `/empresa/necessidades/:id/apoiar` | Apoiar necessidade |
| `GET` | `/empresa/apoios` | Apoios registrados |
| `GET/POST` | `/empresa/vitrine` | Vitrine institucional |
| `GET/POST` | `/empresa/vitrine/novo` | Adicionar item |
| `GET/POST` | `/empresa/vitrine/:id/editar` | Editar item |
| `GET` | `/marketplace` | Listagem pública da vitrine |

</details>

<details>
<summary><strong>🛡️ Administrador</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `GET/POST` | `/admin/login` | Login admin (`ADMIN_SECRET`) |
| `GET` | `/admin/ongs` | ONGs pendentes de aprovação |
| `POST` | `/admin/ongs/:id/aprovar` | Aprovar ONG |
| `POST` | `/admin/ongs/:id/rejeitar` | Rejeitar ONG |
| `GET` | `/admin/documentos` | Documentos pendentes |
| `POST` | `/admin/documentos/:tipo/:id/aprovar` | Aprovar documento |
| `GET` | `/admin/apoiadores` | Apoiadores institucionais |
| `POST` | `/admin/apoiadores` | Adicionar apoiador |
| `GET` | `/admin/marketplace` | Moderação da vitrine |
| `POST` | `/admin/marketplace/itens/:id/aprovar` | Aprovar item |
| `POST` | `/admin/empresas/:id/ativar` | Ativar empresa |
| `POST` | `/admin/empresas/:id/bloquear` | Bloquear empresa |
| `POST` | `/admin/empresas/:id/cnpj/aprovar` | Aprovar CNPJ |

</details>

---

## 🧪 Testes

O projeto possui cobertura em **três camadas**.

```bash
npm test                 # unitários + integração + relatório HTML
npm run test:coverage    # + relatório de cobertura
npx cypress open         # E2E — interface interativa
npx cypress run          # E2E — headless (CI/CD)
```

Após rodar `npm test`, abra **`jest-stare/index.html`** para o relatório visual completo.

### Cobertura

| Camada | Arquivos | Módulos cobertos |
|---|---|---|
| **Unitário** | 10 | authController · authLogin · dashboardController · doacaoController · ds · empresaService · homeController · necessidadeValidator · perfilController · perfilService |
| **Integração** | 6 | authController · authLogin · dashboardController · doacaoController · homeController · perfilController |
| **E2E (Cypress)** | 5 | auth · dashboard · doacao · home · perfil |

---

## 🚀 Deploy

A aplicação está hospedada em um servidor **AWS EC2** com domínio próprio e HTTPS. O fluxo de deploy é o seguinte:

```
GitHub
  ↓  push para a branch main
Servidor AWS EC2
  ↓  pull das alterações via SSH
Aplicação Node.js / TypeScript
  ↓  build (npm run build)
PM2 mantém a aplicação rodando
  ↓  reinicia automaticamente em caso de falha ou reinicialização do servidor
Nginx recebe as requisições do domínio
  ↓  proxy reverso para a porta 3000
Nginx encaminha para a aplicação na porta 3000
  ↓  HTTPS (certificado SSL via Let's Encrypt)
Usuário acessa pelo domínio com HTTPS
```

### Componentes de infraestrutura

| Componente | Função |
|---|---|
| **AWS EC2** | Servidor virtual onde a aplicação roda |
| **PM2** | Gerenciador de processos — mantém a app ativa e reinicia automaticamente |
| **Nginx** | Proxy reverso — recebe requisições HTTPS e repassa para a porta 3000 |
| **Let's Encrypt** | Certificado SSL/TLS gratuito para HTTPS |

---

## 🤝 Contribuindo

```bash
# 1. Fork e clone
git clone https://github.com/seu-usuario/ongs-for-all.git

# 2. Crie uma branch
git checkout -b feature/minha-feature

# 3. Desenvolva e teste
npm run dev
npm test

# 4. Commit e push
git commit -m "feat: adiciona minha feature"
git push origin feature/minha-feature

# 5. Abra um Pull Request
```

---

---

## 📄 Licença

Este projeto está licenciado sob a **Licença MIT**.

Isso permite que o código seja utilizado, estudado, copiado, modificado e distribuído, desde que o aviso de copyright e a licença sejam mantidos.

```
MIT License

Copyright (c) 2026 Gustavo Da Cruz Nunes, Matheus Silva Agustinho, Vinicius Gabriel Fernandes da Silva.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

Consulte o arquivo [LICENSE](LICENSE) para o texto completo.

---

<div align="center">

Desenvolvido por

**[Gustavo Da Cruz Nunes](https://github.com/GustavoCruzNunes)** · **[Matheus Silva Agustinho](https://github.com/TheusSilva1910)** · **[Vinicius Gabriel Fernandes da Silva](https://github.com/ViniciusGabrielf)**

<br/>

*Centro Universitário Senac — Bacharelado em Sistemas de Informação — 2026*

<br/>

[![Made with TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Powered by Fastify](https://img.shields.io/badge/Powered%20by-Fastify-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev)
[![Database MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com)

</div>
