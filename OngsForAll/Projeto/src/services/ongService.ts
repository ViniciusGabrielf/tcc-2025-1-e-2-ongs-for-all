import * as perfilRepo from "../repositories/perfilRepository";

export async function listOngs(search?: string) {
  return await perfilRepo.listAllOngs(search);
}
