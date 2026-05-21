type PaginationParams = {
  basePath: string;
  currentPage: number;
  totalItems: number;
  pageSize: number;
  extraParams?: Record<string, string | number | undefined>;
};

export function normalizePage(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function buildPageUrl(
  basePath: string,
  page: number,
  extraParams: Record<string, string | number | undefined> = {}
) {
  const params = new URLSearchParams();

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, String(value));
  });

  params.set("pagina", String(page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildPagination(params: PaginationParams) {
  const totalPages = Math.max(1, Math.ceil(params.totalItems / params.pageSize));
  const currentPage = Math.min(Math.max(params.currentPage, 1), totalPages);
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  const pages = [];

  for (let page = startPage; page <= endPage; page += 1) {
    pages.push({
      number: page,
      url: buildPageUrl(params.basePath, page, params.extraParams),
      isCurrent: page === currentPage,
    });
  }

  const startItem = params.totalItems === 0 ? 0 : (currentPage - 1) * params.pageSize + 1;
  const endItem = params.totalItems === 0
    ? 0
    : Math.min(currentPage * params.pageSize, params.totalItems);

  return {
    currentPage,
    totalPages,
    totalItems: params.totalItems,
    pageSize: params.pageSize,
    hasPagination: totalPages > 1,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
    prevPageUrl: currentPage > 1
      ? buildPageUrl(params.basePath, currentPage - 1, params.extraParams)
      : null,
    nextPageUrl: currentPage < totalPages
      ? buildPageUrl(params.basePath, currentPage + 1, params.extraParams)
      : null,
    pages,
    startItem,
    endItem,
  };
}
