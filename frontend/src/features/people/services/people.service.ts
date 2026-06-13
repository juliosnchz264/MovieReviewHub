import { api } from "@/lib/api";
import type { Person, PersonDetail } from "@/types/person";

export const peopleService = {
  async popular(page = 1): Promise<Person[]> {
    const { data } = await api.get<Person[]>("/people/popular", { params: { page } });
    return data;
  },

  async search(query: string, page = 1): Promise<Person[]> {
    const { data } = await api.get<Person[]>("/people/search", { params: { query, page } });
    return data;
  },

  async findById(key: string | number): Promise<PersonDetail> {
    const { data } = await api.get<PersonDetail>(
      `/people/${encodeURIComponent(String(key))}`
    );
    return data;
  },
};
