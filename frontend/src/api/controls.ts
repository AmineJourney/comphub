import apiClient from "./client";
import type {
  AppliedControl,
  ReferenceControl,
  ControlDashboard,
} from "../types/control.types";

type AppliedControlPayload = Partial<AppliedControl> & {
  department?: string | null;
  control_owner?: string | null;
  effectiveness_rating?: number | null;
};

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const controlsApi = {
  // ─── Reference Controls ───────────────────────────────────────────────────

  getReferenceControls: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    control_family?: string;
    control_type?: string;
    priority?: string;
    framework?: string;
    library?: string;
    adopted_only?: boolean;
    exclude_applied?: boolean;
  }) => {
    const response = await apiClient.get<PaginatedResponse<ReferenceControl>>(
      "/controls/reference-controls/",
      { params },
    );
    return response.data;
  },

  getReferenceControl: async (id: string) => {
    const response = await apiClient.get<ReferenceControl>(
      `/controls/reference-controls/${id}/`,
    );
    return response.data;
  },

  // ─── Applied Controls ─────────────────────────────────────────────────────

  getAppliedControls: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    validation_status?: string;
    department?: string;
    control_owner?: string;
    has_deficiencies?: boolean;
  }) => {
    const response = await apiClient.get<PaginatedResponse<AppliedControl>>(
      "/controls/applied-controls/",
      { params },
    );
    return response.data;
  },

  getAppliedControl: async (id: string) => {
    const response = await apiClient.get<AppliedControl>(
      `/controls/applied-controls/${id}/`,
    );
    return response.data;
  },

  createAppliedControl: async (data: AppliedControlPayload) => {
    const response = await apiClient.post<AppliedControl>(
      "/controls/applied-controls/",
      data,
    );
    return response.data;
  },

  updateAppliedControl: async (id: string, data: AppliedControlPayload) => {
    const response = await apiClient.patch<AppliedControl>(
      `/controls/applied-controls/${id}/`,
      data,
    );
    return response.data;
  },

  deleteAppliedControl: async (id: string) => {
    await apiClient.delete(`/controls/applied-controls/${id}/`);
  },

  submitControlValidation: async (id: string, notes?: string) => {
    const response = await apiClient.post<AppliedControl>(
      `/controls/applied-controls/${id}/submit_validation/`,
      { notes },
    );
    return response.data;
  },

  approveControlValidation: async (id: string, notes?: string) => {
    const response = await apiClient.post<AppliedControl>(
      `/controls/applied-controls/${id}/approve_validation/`,
      { notes },
    );
    return response.data;
  },

  rejectControlValidation: async (id: string, notes: string) => {
    const response = await apiClient.post<AppliedControl>(
      `/controls/applied-controls/${id}/reject_validation/`,
      { notes },
    );
    return response.data;
  },

  applyControl: async (data: {
    reference_control: string;
    department?: string | null;
    control_owner?: string | null;
    status?: string;
    implementation_notes?: string;
    custom_procedures?: string;
  }) => {
    const response = await apiClient.post<AppliedControl>(
      "/controls/applied-controls/apply_control/",
      data,
    );
    return response.data;
  },

  applyFrameworkControls: async (data: {
    framework: string;
    department?: string;
  }) => {
    const response = await apiClient.post(
      "/controls/applied-controls/apply_framework_controls/",
      data,
    );
    return response.data;
  },

  getControlDashboard: async () => {
    const response = await apiClient.get<ControlDashboard>(
      "/controls/applied-controls/dashboard/",
    );
    return response.data;
  },

  getOverdueReviews: async () => {
    const response = await apiClient.get<AppliedControl[]>(
      "/controls/applied-controls/overdue_reviews/",
    );
    return response.data;
  },

  getControlsWithDeficiencies: async () => {
    const response = await apiClient.get<AppliedControl[]>(
      "/controls/applied-controls/with_deficiencies/",
    );
    return response.data;
  },

  getEffectivenessMetrics: async () => {
    const response = await apiClient.get(
      "/controls/applied-controls/effectiveness_metrics/",
    );
    return response.data;
  },
};
