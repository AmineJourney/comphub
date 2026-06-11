// src/types/organization.types.ts
export interface Department {
  id: string;
  company: string;
  name: string;
  description: string;
  parent?: string;
  parent_name?: string;
  manager?: string;
  manager_email?: string;
  full_path: string;
  children_count: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentTree {
  id: string;
  name: string;
  description: string;
  parent?: string;
  manager_email?: string;
  children: DepartmentTree[];
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
  parent?: string;
  manager?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  parent?: string;
  manager?: string;
}
