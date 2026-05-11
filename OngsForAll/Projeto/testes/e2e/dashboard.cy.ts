// cypress/e2e/dashboard.cy.ts

describe('Dashboard Page E2E Tests', () => {
  const userEmail = 'vinicius.teste1@teste.com';
  const userPassword = '21262728';
  // AJUSTE ESTE NOME CONFORME NECESSÁRIO PARA CORRESPONDER AO QUE APARECE NA INTERFACE
  const userName = 'Vinicius Gabriel 1'; 

  // Em cypress/e2e/dashboard.cy.ts
// ... (constantes userEmail, userPassword, userName) ...

beforeEach(() => {
  cy.visit('/login');
  cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(userEmail);
  cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').type(userPassword);
  cy.contains('button', 'Entrar', { timeout: 10000 }).should('be.visible').click();

  cy.url({ timeout: 15000 }).should('include', '/dashboard');
  cy.log('Redirecionado para /dashboard.');
  cy.screenshot('dashboard-page-after-login-redirect'); // Foto da página

  // Verificação SIMPLIFICADA: O h1 existe e está visível?
  cy.get('h1', { timeout: 15000 }).should('be.visible'); // Aumentando o timeout aqui
  cy.log('Elemento H1 encontrado e está visível no dashboard.'); 

  // APENAS DEPOIS que a verificação acima passar, reintroduza a verificação do CONTEÚDO.
  // Por enquanto, comente as linhas abaixo para focar em encontrar o H1:
  /*
  cy.get('h1') // Não precisa de timeout aqui se o de cima passou
    .then(($h1) => {
      const textoAtualDoH1 = $h1.text();
      cy.log(`---- DEBUG: Conteúdo ATUAL do H1 no dashboard: "${textoAtualDoH1}" ----`);
    })
    .contains(`Bem-vindo, ${userName}!`, { matchCase: false, timeout: 10000 })
    .should('be.visible');
  cy.log('Asserção da mensagem de boas-vindas no beforeEach concluída.');
  */
});
  it('Deve exibir os elementos principais da página do dashboard', () => {
    cy.log('Verificando elementos principais do dashboard');

    // Verifica mensagem de boas-vindas novamente (já verificado no beforeEach, mas pode ser específico do teste)
    cy.get('h1').contains(`Bem-vindo, ${userName}!`, { matchCase: false }).should('be.visible');
    cy.contains('p', 'Veja suas estatísticas e acompanhe seu impacto').should('be.visible');

    // Verifica botões de ação no cabeçalho
    cy.get('button#themeToggle').should('be.visible').and('contain.text', 'Trocar tema');
    cy.get('a[href="/logout"]').should('be.visible').and('contain.text', 'Sair');

    // Verifica títulos das seções de gráficos
    cy.contains('h2', 'ONGs apoiadas (por mês)').should('be.visible');
    cy.contains('h2', 'Interesses por mês').should('be.visible');
    cy.contains('h2', 'Contribuições por tipo').should('be.visible');

    // Verifica título da seção "Seus dados"
    cy.contains('h2', 'Seus dados').should('be.visible');
    cy.get('a[href="/perfil/editar"]').should('be.visible').and('contain.text', 'Editar perfil');

    // Verifica botões de ação principais
    cy.contains('a', 'Explorar necessidades').should('be.visible');
    cy.contains('a', 'Ver Histórico').should('be.visible');
    cy.contains('a', 'Total por ONG').should('be.visible');
  });

  it('Deve exibir os dados do usuário corretamente', () => {
    cy.log('Verificando dados do usuário');
    cy.contains('li', `Nome: ${userName}`).should('be.visible');
    cy.contains('li', `Email: ${userEmail}`).should('be.visible');
  });

  it('Deve renderizar os placeholders (canvas) dos gráficos', () => {
    cy.log('Verificando a presença dos canvas dos gráficos');
    cy.get('canvas#ongsChart').should('be.visible');
    cy.get('canvas#graficoInteressesMes').should('be.visible');
    cy.get('canvas#categoriasChart').should('be.visible');
  });

  it('Deve alternar o tema corretamente', () => {
    cy.log('Testando a funcionalidade de alternância de tema');

    cy.clearLocalStorage('theme'); 
    cy.visit('/dashboard'); // Visita novamente para garantir que o tema seja aplicado do zero
    cy.wait(500); // Pequena espera para o JS do tema inicializar

    const html = () => cy.get('html');
    
    // Assume que o padrão é modo claro se não houver nada no localStorage
    html().should('not.have.class', 'dark');
    
    cy.get('button#themeToggle').should('be.visible').click();
    cy.wait(500); // Espera o reload e aplicação do tema (se houver reload no seu script)
                  // Se não houver reload, esta espera pode ser menor ou desnecessária.
    html().should('have.class', 'dark');
    cy.getAllLocalStorage().then((result) => {
      // A chave do localStorage pode incluir o baseUrl. Ajuste se necessário.
      const themeInLocalStorage = Object.values(result).find(appStorage => appStorage && appStorage.theme)?.theme;
      expect(themeInLocalStorage).to.eq('dark');
    });

    cy.get('button#themeToggle').should('be.visible').click();
    cy.wait(500);
    html().should('not.have.class', 'dark');
     cy.getAllLocalStorage().then((result) => {
      const themeInLocalStorage = Object.values(result).find(appStorage => appStorage && appStorage.theme)?.theme;
      expect(themeInLocalStorage).to.eq('light');
    });
  });

  it('Deve exibir a mensagem de sucesso de interesse se o parâmetro "sucesso=1" estiver na URL', () => {
    cy.log('Testando toast de sucesso de interesse');
    cy.visit('/dashboard?sucesso=1'); // Visita a URL com o parâmetro
    cy.get('#toast', { timeout: 10000 }) // Aumenta o timeout para o toast aparecer
      .should('be.visible')
      .and('contain.text', 'Interesse registrado com sucesso!');
    
    cy.wait(3500); // Espera o setTimeout do script do toast (3000ms + margem)
    cy.get('#toast').should('not.exist');
    cy.url().should('not.include', 'sucesso=1');
  });
  
  it('Deve fazer logout com sucesso', () => {
    cy.log('Testando funcionalidade de logout');
    // Garante que estamos no dashboard e a mensagem de boas-vindas está lá (como um pré-requisito)
    // Esta verificação já acontece no beforeEach, mas podemos ser explícitos se o logout
    // depende de um estado muito específico do dashboard.
    cy.get('h1').contains(`Bem-vindo, ${userName}!`, { matchCase: false, timeout:10000 }).should('be.visible');

    cy.get('a[href="/logout"]').should('be.visible').click();

    cy.url({ timeout: 10000 }).should('include', '/login');
    cy.contains('button', 'Entrar', { timeout: 10000 }).should('be.visible');
  });
});
