import { validateNecessidade } from "../../src/validators/necessidadeValidator";

function dateStringWithOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

describe("validateNecessidade", () => {
  it("deve bloquear data de inicio anterior a data atual para voluntariado", () => {
    const result = validateNecessidade({
      titulo: "Professor voluntario",
      descricao: "Apoio em atividades educacionais.",
      categoria: "educacao",
      quantidade: 2,
      tipo_necessidade: "voluntariado",
      local_atividade: "presencial",
      data_inicio: dateStringWithOffset(-1),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("A data de inicio nao pode ser anterior a data atual.");
  });

  it("deve permitir data de inicio atual para voluntariado", () => {
    const result = validateNecessidade({
      titulo: "Professor voluntario",
      descricao: "Apoio em atividades educacionais.",
      categoria: "educacao",
      quantidade: 2,
      tipo_necessidade: "voluntariado",
      local_atividade: "presencial",
      data_inicio: dateStringWithOffset(0),
    });

    expect(result.isValid).toBe(true);
  });
});
