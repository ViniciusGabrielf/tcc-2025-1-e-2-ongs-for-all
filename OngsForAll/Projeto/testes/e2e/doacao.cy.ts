describe('Fluxo financeiro legado - E2E', () => {
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    cy.request('POST', `${baseUrl}/login`, {
      email: 'vinicius.teste1@teste.com',
      password: '21262728',
    });
  });

  it('redireciona a antiga página financeira para necessidades', () => {
    cy.visit(`${baseUrl}/doacoes/nova`);
    cy.url().should('include', '/necessidades');
    cy.get('input[name="valor"]').should('not.exist');
  });
});
