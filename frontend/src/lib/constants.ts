import type { AppLanguage } from "../types/i18n.types";

export const RISK_LEVELS = {
  low: { label: "Low", color: "bg-green-100 text-green-800" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  high: { label: "High", color: "bg-orange-100 text-orange-800" },
  critical: { label: "Critical", color: "bg-red-100 text-red-800" },
};

export const COMPLIANCE_STATUS = {
  compliant: { label: "Compliant", color: "bg-green-100 text-green-800" },
  mostly_compliant: {
    label: "Mostly Compliant",
    color: "bg-blue-100 text-blue-800",
  },
  partially_compliant: {
    label: "Partially Compliant",
    color: "bg-yellow-100 text-yellow-800",
  },
  non_compliant: { label: "Non-Compliant", color: "bg-red-100 text-red-800" },
};

export const CONTROL_STATUS = {
  not_started: { label: "Not Started", color: "bg-gray-100 text-gray-800" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800" },
  implemented: { label: "Implemented", color: "bg-purple-100 text-purple-800" },
  testing: { label: "Testing", color: "bg-yellow-100 text-yellow-800" },
  operational: { label: "Operational", color: "bg-green-100 text-green-800" },
  needs_improvement: {
    label: "Needs Improvement",
    color: "bg-orange-100 text-orange-800",
  },
  non_compliant: { label: "Non-Compliant", color: "bg-red-100 text-red-800" },
};

export const EVIDENCE_STATUS = {
  pending: { label: "Pending Review", color: "bg-gray-100 text-gray-800" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  needs_update: {
    label: "Needs Update",
    color: "bg-yellow-100 text-yellow-800",
  },
};

export const ROLES = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Manager",
  analyst: "Analyst",
  auditor: "Auditor",
  viewer: "Viewer",
};

const CONTROL_STATUS_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    not_started: "Not Started",
    in_progress: "In Progress",
    implemented: "Implemented",
    testing: "Testing",
    operational: "Operational",
    needs_improvement: "Needs Improvement",
    non_compliant: "Non-Compliant",
  },
  fr: {
    not_started: "Non commence",
    in_progress: "En cours",
    implemented: "Mis en oeuvre",
    testing: "En test",
    operational: "Operationnel",
    needs_improvement: "A ameliorer",
    non_compliant: "Non conforme",
  },
};

const EVIDENCE_STATUS_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    pending: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
    needs_update: "Needs Update",
  },
  fr: {
    pending: "En attente de revue",
    approved: "Approuvee",
    rejected: "Rejetee",
    needs_update: "Mise a jour requise",
  },
};

const RISK_LEVEL_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  },
  fr: {
    low: "Faible",
    medium: "Moyen",
    high: "Eleve",
    critical: "Critique",
  },
};

const COMPLIANCE_STATUS_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    compliant: "Compliant",
    mostly_compliant: "Mostly Compliant",
    partially_compliant: "Partially Compliant",
    non_compliant: "Non-Compliant",
  },
  fr: {
    compliant: "Conforme",
    mostly_compliant: "Majoritairement conforme",
    partially_compliant: "Partiellement conforme",
    non_compliant: "Non conforme",
  },
};

export function getControlStatusLabel(status: string, language: AppLanguage) {
  return CONTROL_STATUS_LABELS[language]?.[status] ?? CONTROL_STATUS[status as keyof typeof CONTROL_STATUS]?.label ?? status;
}

export function getEvidenceStatusLabel(status: string, language: AppLanguage) {
  return EVIDENCE_STATUS_LABELS[language]?.[status] ?? EVIDENCE_STATUS[status as keyof typeof EVIDENCE_STATUS]?.label ?? status;
}

export function getRiskLevelLabel(level: string, language: AppLanguage) {
  return RISK_LEVEL_LABELS[language]?.[level] ?? RISK_LEVELS[level as keyof typeof RISK_LEVELS]?.label ?? level;
}

export function getComplianceStatusLabel(status: string, language: AppLanguage) {
  return COMPLIANCE_STATUS_LABELS[language]?.[status] ?? COMPLIANCE_STATUS[status as keyof typeof COMPLIANCE_STATUS]?.label ?? status;
}
