import apiClient from "./client";
import type { PaginatedResponse } from "../types/auth.types";
import type { Process } from "../types/process.types";

export const processesApi = {
  getProcesses: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    department?: string;
    responsible?: string;
  }) => {
    const response = await apiClient.get<PaginatedResponse<Process>>(
      "/processes/",
      { params },
    );
    return response.data;
  },

  getProcess: async (id: string) => {
    const response = await apiClient.get<Process>(`/processes/${id}/`);
    return response.data;
  },

  createProcess: async (data: Partial<Process>) => {
    const response = await apiClient.post<Process>(
      "/processes/",
      data,
    );
    return response.data;
  },

  updateProcess: async (id: string, data: Partial<Process>) => {
    const response = await apiClient.patch<Process>(
      `/processes/${id}/`,
      data,
    );
    return response.data;
  },

  deleteProcess: async (id: string) => {
    await apiClient.delete(`/processes/${id}/`);
  },
};
