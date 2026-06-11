import apiClient from "./client";
import type {
  Department,
  DepartmentTree,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from "../types/organizations.types";
import type { PaginatedResponse } from "@/types/auth.types";

interface DepartmentQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  parent?: string;
}

export const organizationsApi = {
  getDepartments: async (params?: DepartmentQueryParams) => {
    const response = await apiClient.get<PaginatedResponse<Department>>(
      "/organizations/departments/",
      { params },
    );
    return response.data;
  },

  getDepartment: async (id: string) => {
    const response = await apiClient.get<Department>(
      `/organizations/departments/${id}/`,
    );
    return response.data;
  },

  createDepartment: async (data: CreateDepartmentRequest) => {
    const response = await apiClient.post<Department>(
      "/organizations/departments/",
      data,
    );
    return response.data;
  },

  updateDepartment: async (id: string, data: UpdateDepartmentRequest) => {
    const response = await apiClient.patch<Department>(
      `/organizations/departments/${id}/`,
      data,
    );
    return response.data;
  },

  deleteDepartment: async (id: string) => {
    await apiClient.delete(`/organizations/departments/${id}/`);
  },

  getDepartmentTree: async () => {
    const response = await apiClient.get<DepartmentTree[]>(
      "/organizations/departments/tree/",
    );
    return response.data;
  },

  getDepartmentChildren: async (departmentId: string) => {
    const response = await apiClient.get<Department[]>(
      `/organizations/departments/${departmentId}/children/`,
    );
    return response.data;
  },
};
