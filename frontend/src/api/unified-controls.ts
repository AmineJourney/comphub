import apiClient from "./client";
import type {
  UnifiedControl,
  AppliedControl,
  ComplianceResult,
  UnifiedControlCoverage,
} from "../types/control.types";

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function toPaginatedResponse<T>(
  data: PaginatedResponse<T> | T[],
): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  }

  return data;
}

export const unifiedControlsApi = {
  // ─── Unified Controls (Library) ────────────────────────────────────────

  getUnifiedControls: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    domain?: string;
    tags?: string[];
  }) => {
    const response = await apiClient.get<PaginatedResponse<UnifiedControl> | UnifiedControl[]>(
      "/controls/unified-controls/",
      { params },
    );
    return toPaginatedResponse(response.data);
  },

  getUnifiedControl: async (id: string) => {
    const response = await apiClient.get<UnifiedControl>(
      `/controls/unified-controls/${id}/`,
    );
    return response.data;
  },

  getUnifiedControlCoverage: async (id: string) => {
    const response = await apiClient.get<UnifiedControlCoverage>(
      `/controls/unified-controls/${id}/framework_coverage/`,
    );
    return response.data;
  },

  // ─── Applied Controls (Enhanced) ───────────────────────────────────────

  assessMaturity: async (
    appliedControlId: string,
    data: {
      maturity_level: 1 | 2 | 3 | 4 | 5;
      maturity_notes?: string;
    },
  ) => {
    const response = await apiClient.post<AppliedControl>(
      `/controls/applied-controls/${appliedControlId}/assess_maturity/`,
      data,
    );
    return response.data;
  },

  getMaturitySummary: async () => {
    const response = await apiClient.get<{
      maturity_distribution: Array<{ maturity_level: number; count: number }>;
      average_maturity: number;
    }>("/controls/applied-controls/maturity_summary/");
    return response.data;
  },

  // ─── Compliance Calculation ────────────────────────────────────────────

  calculateCompliance: async (
    frameworkId: string,
    includeDetails: boolean = false,
  ) => {
    const response = await apiClient.post<ComplianceResult>(
      "/compliance/calculate/",
      {
        framework_id: frameworkId,
        include_details: includeDetails,
      },
    );
    return response.data;
  },
};
