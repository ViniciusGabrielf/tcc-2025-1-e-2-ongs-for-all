describe('Página Home', () => {
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    cy.visit(baseUrl);
  });

  it('Deve carregar a página inicial com título correto', () => {
    cy.title().should('include', 'Início');
    cy.contains('ONG For All').should('exist');
    cy.contains('Encontre ONGs para doar').should('exist');
  });

  it('Deve redirecionar para /login ao clicar em "Entrar" no menu desktop', () => {
    cy.get('#desktopMenu a').contains('Entrar').click();
    cy.url().should('include', '/login');
    cy.contains('Email').should('exist'); // Confirma elemento da tela de login
  });

  it('Deve redirecionar para /login ao clicar em "Entrar" no menu mobile', () => {
    cy.viewport('iphone-8');
    cy.visit(baseUrl);

    cy.get('#menubutton').click();
    cy.get('#mobileMenu a').contains('Entrar').click();

    cy.url().should('include', '/login');
    cy.contains('Email').should('exist'); // Verifica que está na tela de login
  });

  it('Deve navegar para as seções da página ao clicar nos links do menu', () => {
    cy.get('#desktopMenu a[href="/#sobre"]').click();
    cy.url().should('include', '#sobre');

    cy.get('#desktopMenu a[href="/#precos"]').click();
    cy.url().should('include', '#precos');

    cy.get('#desktopMenu a[href="/#contato"]').click();
    cy.url().should('include', '#contato');
  });
});
