import * as perfilRepo from "../repositories/perfilRepository";

export async function listOngs(params: {
  search?: string;
  page: number;
  pageSize: number;
  excludeOngId?: number;
}) {
  return await perfilRepo.listAllOngs({
    search: params.search,
    limit: params.pageSize,
    offset: (params.page - 1) * params.pageSize,
    excludeOngId: params.excludeOngId,
  });
}
