/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ReferenceControl {
  id: string;
  code: string;
  name: string;
  description: string;
  control_family: string;
  control_type:
    | "preventive"
    | "detective"
    | "corrective"
    | "deterrent"
    | "compensating";
  implementation_guidance: string;
  automation_level: "manual" | "semi_automated" | "automated";
  priority: "critical" | "high" | "medium" | "low";
  is_published: boolean;
  mapped_requirements_count: number;
  /** Framework codes this control maps to — e.g. ["ISO27001-2022", "TISAX-6.0.2"] */
  frameworks: string[];
  /** StoredLibrary names this control belongs to — e.g. ["ISO Standards", "TISAX"] */
  library_names: string[];
  created_at: string;
}

export interface UnifiedControl {
  id: string;
  control_code: string;
  control_name: string;
  short_name?: string;

  domain: string;
  category?: string;
  control_family?: string;

  description: string;
  control_objective?: string;
  implementation_guidance: string;

  control_type?: "preventive" | "detective" | "corrective" | "directive";
  automation_level?: "manual" | "semi_automated" | "automated";
  implementation_complexity?: "low" | "medium" | "high";
  estimated_effort_hours?: number;

  // Maturity model
  maturity_level_1_criteria?: string;
  maturity_level_2_criteria?: string;
  maturity_level_3_criteria?: string;
  maturity_level_4_criteria?: string;
  maturity_level_5_criteria?: string;

  testing_procedures?: string;
  testing_frequency?: string;

  prerequisites?: string[];
  related_controls?: string[];
  tags?: string[];

  is_active: boolean;
  framework_coverage?: string[];
  implementation_count?: number;

  created_at: string;
  updated_at: string;
}

export interface UnifiedControlMapping {
  id: string;
  reference_control: string;
  reference_control_code: string;
  unified_control: string;
  unified_control_code: string;
  coverage_type: "full" | "partial" | "supplemental";
  coverage_percentage: number;
  mapping_rationale?: string;
  gap_description?: string;
  supplemental_actions?: string;
  confidence_score: number;
  verified_by?: string;
  verified_at?: string;
}

export interface UnifiedControlCoverage {
  frameworks?: Array<{
    framework_id?: string;
    framework_code?: string;
    framework_name?: string;
    coverage_type?: "full" | "partial" | "supplemental";
    coverage_percentage?: number;
  }>;
  summary?: {
    total_frameworks?: number;
    full_coverage_count?: number;
    partial_coverage_count?: number;
  };
}

export interface AppliedControl {
  id: string;

  // Legacy reference-control fields
  reference_control?: string;
  reference_control_code?: string;
  reference_control_name?: string;
  reference_control_description?: string;
  reference_control_family?: string;
  reference_control_type?: string;

  // Unified-control fields
  unified_control?: string;
  unified_control_code?: string;
  unified_control_name?: string;

  status: string;
  validation_status?: "draft" | "submitted" | "approved" | "rejected";
  validation_requested_by?: string | null;
  validation_requested_by_email?: string;
  validation_requested_at?: string | null;
  validated_by?: string | null;
  validated_by_email?: string;
  validated_at?: string | null;
  validation_notes?: string;

  // Shared ownership / organization fields
  control_owner?: string | null;
  control_owner_email?: string;
  department?: string | null;
  department_name?: string;

  // Implementation fields
  implementation_notes?: string;
  custom_procedures?: string;
  custom_frequency?: string;
  has_deficiencies?: boolean;
  evidence_count?: number;
  compliance_score?: number;
  is_overdue?: boolean;
  frameworks?: string[];

  // Maturity tracking
  maturity_level?: 1 | 2 | 3 | 4 | 5;
  maturity_target_level?: 1 | 2 | 3 | 4 | 5;
  maturity_assessment_date?: string;
  maturity_notes?: string;
  maturity_criteria?: {
    current_level: number;
    current_criteria: string;
    next_level: number;
    next_criteria: string;
    target_level: number;
  };

  effectiveness_rating?: number | null;
  last_tested_date?: string;
  next_review_date?: string;

  // Unified-control framework coverage
  frameworks_satisfied?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

export interface ComplianceResult {
  framework_id: string;
  framework_code: string;
  framework_name: string;
  total_unified_controls: number;
  implemented_controls: number;
  in_progress_controls: number;
  not_started_controls: number;
  compliance_percentage: number;
  average_maturity_level: number;
  total_evidence: number;
  calculated_at: string;
  gaps?: Gap[];
}

export interface Gap {
  requirement_code: string;
  requirement_title: string;
  reference_control_code?: string;
  unified_control_code?: string;
  gap_type: string;
  severity: "critical" | "high" | "medium" | "low";
  recommendation: string;
  current_status?: string;
}

export interface ControlDashboard {
  total_controls: number;
  status_breakdown: Array<{ status: string; count: number }>;
  avg_compliance_score: number;
  family_breakdown: Array<{
    reference_control__control_family: string;
    count: number;
  }>;
  overdue_reviews: number;
  controls_with_deficiencies: number;
  evidence_coverage_percentage: number;
}
