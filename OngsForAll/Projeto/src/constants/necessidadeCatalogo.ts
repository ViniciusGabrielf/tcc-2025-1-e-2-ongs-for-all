export type NeedType = "bem" | "servico" | "voluntariado";

type NeedCatalogItem = {
  nome: string;
};

type NeedCatalogCategory = {
  codigo: string;
  nome: string;
  itens: NeedCatalogItem[];
};

export const NEED_CATALOG: Record<NeedType, NeedCatalogCategory[]> = {
  bem: [
    {
      codigo: "alimentacao",
      nome: "Alimentacao",
      itens: [
        { nome: "Cesta basica" },
        { nome: "Alimentos nao pereciveis" },
        { nome: "Leite" },
        { nome: "Formula infantil" },
        { nome: "Agua mineral" },
      ],
    },
    {
      codigo: "higiene_limpeza",
      nome: "Higiene e limpeza",
      itens: [
        { nome: "Kit de higiene" },
        { nome: "Fraldas infantis" },
        { nome: "Fraldas geriatrica" },
        { nome: "Absorventes" },
        { nome: "Produtos de limpeza" },
      ],
    },
    {
      codigo: "vestuario",
      nome: "Vestuario",
      itens: [
        { nome: "Roupas infantis" },
        { nome: "Roupas adultas" },
        { nome: "Agasalhos" },
        { nome: "Calcados" },
        { nome: "Cobertores" },
      ],
    },
    {
      codigo: "moveis",
      nome: "Moveis",
      itens: [
        { nome: "Cadeira" },
        { nome: "Mesa" },
        { nome: "Armario" },
        { nome: "Cama" },
        { nome: "Colchao" },
      ],
    },
    {
      codigo: "tecnologia",
      nome: "Tecnologia",
      itens: [
        { nome: "Computador" },
        { nome: "Notebook" },
        { nome: "Monitor" },
        { nome: "Impressora" },
        { nome: "Projetor" },
      ],
    },
    {
      codigo: "construcao",
      nome: "Construcao",
      itens: [
        { nome: "Porta" },
        { nome: "Janela" },
        { nome: "Tinta" },
        { nome: "Cimento" },
        { nome: "Ferramentas" },
      ],
    },
    {
      codigo: "educacao",
      nome: "Educacao",
      itens: [
        { nome: "Material escolar" },
        { nome: "Livros" },
        { nome: "Mochilas" },
        { nome: "Brinquedos educativos" },
      ],
    },
    {
      codigo: "saude",
      nome: "Saude",
      itens: [
        { nome: "Cadeira de rodas" },
        { nome: "Muletas" },
        { nome: "Andador" },
        { nome: "Equipamento medico" },
      ],
    },
  ],
  servico: [
    {
      codigo: "manutencao",
      nome: "Manutencao",
      itens: [
        { nome: "Pedreiro" },
        { nome: "Eletricista" },
        { nome: "Encanador" },
        { nome: "Pintura" },
        { nome: "Marcenaria" },
      ],
    },
    {
      codigo: "tecnologia",
      nome: "Tecnologia",
      itens: [
        { nome: "Suporte de TI" },
        { nome: "Desenvolvimento de site" },
        { nome: "Manutencao de computadores" },
        { nome: "Rede e internet" },
      ],
    },
    {
      codigo: "saude",
      nome: "Saude",
      itens: [
        { nome: "Atendimento medico" },
        { nome: "Atendimento odontologico" },
        { nome: "Atendimento psicologico" },
        { nome: "Fisioterapia" },
      ],
    },
    {
      codigo: "educacao",
      nome: "Educacao",
      itens: [
        { nome: "Reforco escolar" },
        { nome: "Oficina educativa" },
        { nome: "Curso profissionalizante" },
        { nome: "Mentoria" },
      ],
    },
    {
      codigo: "juridico_administrativo",
      nome: "Juridico e administrativo",
      itens: [
        { nome: "Assessoria juridica" },
        { nome: "Contabilidade" },
        { nome: "Consultoria administrativa" },
        { nome: "Recursos humanos" },
      ],
    },
    {
      codigo: "comunicacao",
      nome: "Comunicacao",
      itens: [
        { nome: "Design grafico" },
        { nome: "Fotografia" },
        { nome: "Gestao de redes sociais" },
        { nome: "Producao de video" },
      ],
    },
  ],
  voluntariado: [
    {
      codigo: "educacao",
      nome: "Educacao",
      itens: [
        { nome: "Professor voluntario" },
        { nome: "Reforco escolar" },
        { nome: "Contacao de historias" },
        { nome: "Monitor de oficinas" },
      ],
    },
    {
      codigo: "eventos_logistica",
      nome: "Eventos e logistica",
      itens: [
        { nome: "Apoio em eventos" },
        { nome: "Recepcao" },
        { nome: "Organizacao de doacoes" },
        { nome: "Logistica de entregas" },
      ],
    },
    {
      codigo: "saude_bem_estar",
      nome: "Saude e bem-estar",
      itens: [
        { nome: "Psicologo voluntario" },
        { nome: "Fisioterapeuta voluntario" },
        { nome: "Educador fisico" },
        { nome: "Cuidador" },
      ],
    },
    {
      codigo: "tecnologia",
      nome: "Tecnologia",
      itens: [
        { nome: "Instrutor de informatica" },
        { nome: "Suporte tecnico" },
        { nome: "Manutencao de computadores" },
      ],
    },
    {
      codigo: "administrativo",
      nome: "Administrativo",
      itens: [
        { nome: "Apoio administrativo" },
        { nome: "Atendimento ao publico" },
        { nome: "Captacao de recursos" },
      ],
    },
    {
      codigo: "comunicacao",
      nome: "Comunicacao",
      itens: [
        { nome: "Criacao de conteudo" },
        { nome: "Cobertura de eventos" },
        { nome: "Apoio em campanhas" },
      ],
    },
  ],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isNeedType(value: string): value is NeedType {
  return value === "bem" || value === "servico" || value === "voluntariado";
}

export function getNeedCatalog(tipo?: string) {
  if (!tipo || !isNeedType(tipo)) {
    return NEED_CATALOG.bem;
  }

  return NEED_CATALOG[tipo];
}

export function findNeedCategory(tipo: string, categoria: string) {
  const normalized = normalize(categoria);
  const sources = isNeedType(tipo) ? [NEED_CATALOG[tipo]] : Object.values(NEED_CATALOG);

  for (const categories of sources) {
    const found = categories.find(
      (item) => normalize(item.codigo) === normalized || normalize(item.nome) === normalized
    );

    if (found) {
      return found;
    }
  }

  return undefined;
}

export function getNeedCategoryDisplayName(tipo: string, categoria: string) {
  return findNeedCategory(tipo, categoria)?.nome ?? categoria.trim();
}

export function isValidNeedCategory(tipo: string, categoria: string) {
  return !!findNeedCategory(tipo, categoria);
}

export function isValidNeedItem(tipo: string, categoria: string, titulo: string) {
  const category = findNeedCategory(tipo, categoria);
  if (!category) {
    return false;
  }

  const normalizedTitle = normalize(titulo);
  return category.itens.some((item) => normalize(item.nome) === normalizedTitle);
}

export function getNeedFilterCategories(tipo?: string) {
  const map = new Map<string, { codigo: string; nome: string }>();

  const sources = tipo && isNeedType(tipo) ? [NEED_CATALOG[tipo]] : Object.values(NEED_CATALOG);

  for (const categories of sources) {
    for (const category of categories) {
      if (!map.has(category.codigo)) {
        map.set(category.codigo, {
          codigo: category.codigo,
          nome: category.nome,
        });
      }
    }
  }

  return [...map.values()];
}
