/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  reporters: [
    "default",  // mantém o relatório padrão no console
    ["jest-stare", {
      "resultDir": "jest-stare",       // pasta onde o relatório será salvo
      "reportTitle": "Relatório de Testes", // título do relatório
      "coverageLink": "./coverage/lcov-report/index.html", // link para relatório de cobertura (opcional)
      "additionalResultsProcessors": []
    }]
    ]
};
