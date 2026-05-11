describe('Fluxo de Autenticação - E2E', () => {
  const baseUrl = 'http://localhost:3000';

  it('Deve acessar a tela de login e encontrar o formulário', () => {
    cy.visit(`${baseUrl}/login`);
    cy.contains('button', 'Entrar').should('exist');
    cy.get('input[name="email"]').should('exist');
    cy.get('input[name="password"]').should('exist');
  });

  it('Deve acessar a tela de cadastro e encontrar o formulário', () => {
    cy.visit(`${baseUrl}/register`);
    // Ajuste o seletor de acordo com o texto real presente na página de cadastro
    cy.get('input[name="email"]').should('exist');
    cy.get('input[name="password"]').should('exist');
  });

  it('Deve acessar a tela de esqueceu a senha e encontrar o campo de email', () => {
    cy.visit(`${baseUrl}/esqueci-minha-senha`, { failOnStatusCode: false });
    cy.get('input[name="email"]').should('exist');
  });

  it('Deve acessar a tela de redefinir senha', () => {
    cy.visit(`${baseUrl}/redefinir-senha/:id`, { failOnStatusCode: false }); // ID fictício
    cy.get('input[name="password"]').should('exist');
    cy.get('input[name="confirmarSenha"]').should('exist');

  });

  it('Deve registrar um novo usuário (exemplo)', () => {
    cy.visit(`${baseUrl}/register`);
    cy.get('input[name="nome"]').type('Teste Usuário');
    cy.get('input[name="email"]').type('teste@example.com');
    cy.get('input[name="password"]').type('123456');
    cy.get('form').first().submit();
  });

  it('Deve fazer login com usuário existente', () => {
    cy.visit(`${baseUrl}/login`);
    cy.get('input[name="email"]').type('teste@example.com');
    cy.get('input[name="password"]').type('123456');
    cy.get('form').first().submit();
  });

  it('Deve exibir erro com login inválido', () => {
    cy.visit(`${baseUrl}/login`);
    cy.get('input[name="email"]').type('invalido@example.com');
    cy.get('input[name="password"]').type('senhaErrada');
    cy.get('form').first().submit();

    // Verificação do alerta de erro com conteúdo flexível
    cy.get('[role="alert"]')
      .should('exist')
      .and('contain.text', 'E-mail ou senha incorretos');
});
});
