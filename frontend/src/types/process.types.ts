export interface ProcessInputOutput {
  name: string;
  party?: string;
}

export interface ProcessActivity {
  activity: string;
  decides_approves?: string;
  executes?: string;
  participates_verifies?: string;
  informed?: string;
}

export interface ProcessAssociatedDocument {
  title: string;
  reference?: string;
}

export interface ProcessApproval {
  drafted_by?: string;
  drafted_date?: string;
  verified_by?: string;
  verified_date?: string;
  approved_by?: string;
  approved_date?: string;
}

export interface Process {
  id: string;
  company?: string;
  reference: string;
  title: string;
  process_type?: string;
  version: string;
  effective_date?: string | null;
  finality: string;
  status: "draft" | "in_review" | "approved" | "archived";
  department?: string | null;
  department_name?: string;
  responsible?: string | null;
  responsible_email?: string;
  replacement?: string | null;
  replacement_email?: string;
  indicators: string[];
  inputs: ProcessInputOutput[];
  outputs: ProcessInputOutput[];
  activities: ProcessActivity[];
  risks: string[];
  opportunities: string[];
  required_knowledge?: string;
  critical_resources?: string;
  work_environment?: string;
  associated_documents: ProcessAssociatedDocument[];
  approval: ProcessApproval;
  created_at: string;
  updated_at: string;
}
