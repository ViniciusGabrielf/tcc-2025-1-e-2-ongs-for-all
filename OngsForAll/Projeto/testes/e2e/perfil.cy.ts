describe('Página de Edição de Perfil', () => {
  const email = 'vinicius.teste1@teste.com'
  const senha = '21262728'

  const fazerLogin = () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type(senha)
    cy.get('form').submit()
    cy.url({ timeout: 10000 }).should('include', '/dashboard')
  }

  beforeEach(() => {
    fazerLogin()
    cy.visit('/perfil/editar')
    cy.location('pathname', { timeout: 10000 }).should('include', '/perfil/editar')
    cy.get('input[name="nome"]', { timeout: 5000 }).should('exist')
  })

  it('Deve exibir os campos com valores preenchidos', () => {
    cy.get('input[name="nome"]').should('have.value', 'Vinicius Gabriel 1')
    cy.get('input[name="email"]').should('have.value', email)
  })

  it('Deve exibir erro se a senha for inválida', () => {
    cy.get('input[name="password"]').type('123')
    cy.get('form').submit()
    cy.contains('A senha deve ter no mínimo 6 caracteres.').should('be.visible')
  })

  it('Botão voltar deve redirecionar para o dashboard', () => {
    cy.contains('Voltar').click()
    cy.url().should('include', '/dashboard')
  })
})
