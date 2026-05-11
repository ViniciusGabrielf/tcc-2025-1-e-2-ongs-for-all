import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // coloque a URL onde sua aplicação roda localmente
    specPattern: 'testes/e2e/**/*.cy.{js,ts}', // caminho dos seus testes e2e
    supportFile: false // se você não tiver arquivo de suporte, deixe false
  },
})
