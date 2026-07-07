import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "../../api/client";
import { organizationsApi } from "../../api/organizations";
import { processesApi } from "../../api/processes";
import { teamApi } from "../../api/team";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useI18n } from "../../hooks/useI18n";
import type {
  Process,
  ProcessActivity,
  ProcessAssociatedDocument,
  ProcessInputOutput,
} from "../../types/process.types";

interface ProcessFormDialogProps {
  open: boolean;
  process?: Process | null;
  onClose: () => void;
  onSuccess: (process: Process) => void;
}

interface ProcessFormState {
  reference: string;
  title: string;
  process_type: string;
  version: string;
  effective_date: string;
  finality: string;
  status: Process["status"];
  department: string;
  responsible: string;
  replacement: string;
  indicators: string;
  inputs: string;
  outputs: string;
  activities: string;
  risks: string;
  opportunities: string;
  required_knowledge: string;
  critical_resources: string;
  work_environment: string;
  associated_documents: string;
  drafted_by: string;
  drafted_date: string;
  verified_by: string;
  verified_date: string;
  approved_by: string;
  approved_date: string;
}

const emptyForm: ProcessFormState = {
  reference: "",
  title: "",
  process_type: "",
  version: "1.0",
  effective_date: "",
  finality: "",
  status: "draft",
  department: "",
  responsible: "",
  replacement: "",
  indicators: "",
  inputs: "",
  outputs: "",
  activities: "",
  risks: "",
  opportunities: "",
  required_knowledge: "",
  critical_resources: "",
  work_environment: "",
  associated_documents: "",
  drafted_by: "",
  drafted_date: "",
  verified_by: "",
  verified_date: "",
  approved_by: "",
  approved_date: "",
};

const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const joinLines = (items?: string[]) => (items ?? []).join("\n");

const parsePairLines = (value: string): ProcessInputOutput[] =>
  lines(value).map((line) => {
    const [name = "", party = ""] = line.split("|").map((part) => part.trim());
    return { name, party };
  });

const joinPairLines = (items?: ProcessInputOutput[]) =>
  (items ?? [])
    .map((item) => [item.name, item.party].filter(Boolean).join(" | "))
    .join("\n");

const parseActivities = (value: string): ProcessActivity[] =>
  lines(value).map((line) => {
    const [
      activity = "",
      decides_approves = "",
      executes = "",
      participates_verifies = "",
      informed = "",
    ] = line.split("|").map((part) => part.trim());
    return {
      activity,
      decides_approves,
      executes,
      participates_verifies,
      informed,
    };
  });

const joinActivities = (items?: ProcessActivity[]) =>
  (items ?? [])
    .map((item) =>
      [
        item.activity,
        item.decides_approves,
        item.executes,
        item.participates_verifies,
        item.informed,
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");

const parseDocuments = (value: string): ProcessAssociatedDocument[] =>
  lines(value).map((line) => {
    const [title = "", reference = ""] = line
      .split("|")
      .map((part) => part.trim());
    return { title, reference };
  });

const joinDocuments = (items?: ProcessAssociatedDocument[]) =>
  (items ?? [])
    .map((item) => [item.title, item.reference].filter(Boolean).join(" | "))
    .join("\n");

function processToForm(process?: Process | null): ProcessFormState {
  if (!process) return emptyForm;

  return {
    reference: process.reference,
    title: process.title,
    process_type: process.process_type ?? "",
    version: process.version,
    effective_date: process.effective_date ?? "",
    finality: process.finality,
    status: process.status,
    department: process.department ?? "",
    responsible: process.responsible ?? "",
    replacement: process.replacement ?? "",
    indicators: joinLines(process.indicators),
    inputs: joinPairLines(process.inputs),
    outputs: joinPairLines(process.outputs),
    activities: joinActivities(process.activities),
    risks: joinLines(process.risks),
    opportunities: joinLines(process.opportunities),
    required_knowledge: process.required_knowledge ?? "",
    critical_resources: process.critical_resources ?? "",
    work_environment: process.work_environment ?? "",
    associated_documents: joinDocuments(process.associated_documents),
    drafted_by: process.approval?.drafted_by ?? "",
    drafted_date: process.approval?.drafted_date ?? "",
    verified_by: process.approval?.verified_by ?? "",
    verified_date: process.approval?.verified_date ?? "",
    approved_by: process.approval?.approved_by ?? "",
    approved_date: process.approval?.approved_date ?? "",
  };
}

export function ProcessFormDialog({
  open,
  process,
  onClose,
  onSuccess,
}: ProcessFormDialogProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<ProcessFormState>(emptyForm);

  useEffect(() => {
    if (open) setFormData(processToForm(process));
  }, [open, process]);

  const { data: members = [] } = useQuery({
    queryKey: ["company-members"],
    queryFn: teamApi.getCompanyMembers,
    enabled: open,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", "process-form"],
    queryFn: () => organizationsApi.getDepartments({ page_size: 100 }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<Process>) =>
      process
        ? processesApi.updateProcess(process.id, payload)
        : processesApi.createProcess(payload),
    onSuccess,
  });

  const setField = <K extends keyof ProcessFormState>(
    key: K,
    value: ProcessFormState[K],
  ) => setFormData((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      reference: formData.reference,
      title: formData.title,
      process_type: formData.process_type,
      version: formData.version,
      effective_date: formData.effective_date || null,
      finality: formData.finality,
      status: formData.status,
      department: formData.department || null,
      responsible: formData.responsible || null,
      replacement: formData.replacement || null,
      indicators: lines(formData.indicators),
      inputs: parsePairLines(formData.inputs),
      outputs: parsePairLines(formData.outputs),
      activities: parseActivities(formData.activities),
      risks: lines(formData.risks),
      opportunities: lines(formData.opportunities),
      required_knowledge: formData.required_knowledge,
      critical_resources: formData.critical_resources,
      work_environment: formData.work_environment,
      associated_documents: parseDocuments(formData.associated_documents),
      approval: {
        drafted_by: formData.drafted_by,
        drafted_date: formData.drafted_date,
        verified_by: formData.verified_by,
        verified_date: formData.verified_date,
        approved_by: formData.approved_by,
        approved_date: formData.approved_date,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {process ? t("process.dialog.editTitle") : t("process.dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("process.dialog.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mutation.error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {getErrorMessage(mutation.error)}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label={t("process.reference")} required>
              <Input
                value={formData.reference}
                onChange={(event) => setField("reference", event.target.value)}
                placeholder="MS-PS-01"
                required
              />
            </Field>
            <Field label={t("process.version")} required>
              <Input
                value={formData.version}
                onChange={(event) => setField("version", event.target.value)}
                required
              />
            </Field>
            <Field label={t("process.effectiveDate")}>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(event) =>
                  setField("effective_date", event.target.value)
                }
              />
            </Field>
            <Field label={t("process.status.label")}>
              <select
                value={formData.status}
                onChange={(event) =>
                  setField("status", event.target.value as Process["status"])
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {["draft", "in_review", "approved", "archived"].map((status) => (
                  <option key={status} value={status}>
                    {t(`process.status.${status}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("process.titleField")} required>
              <Input
                value={formData.title}
                onChange={(event) => setField("title", event.target.value)}
                required
              />
            </Field>
            <Field label={t("process.type")}>
              <Input
                value={formData.process_type}
                onChange={(event) => setField("process_type", event.target.value)}
                placeholder={t("process.typePlaceholder")}
              />
            </Field>
            <Field label={t("process.department")}>
              <select
                value={formData.department}
                onChange={(event) => setField("department", event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t("process.unassigned")}</option>
                {(departments?.results ?? []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.full_path || department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("process.responsible")}>
              <UserSelect
                value={formData.responsible}
                onChange={(value) => setField("responsible", value)}
                members={members}
                emptyLabel={t("process.unassigned")}
              />
            </Field>
            <Field label={t("process.replacement")}>
              <UserSelect
                value={formData.replacement}
                onChange={(value) => setField("replacement", value)}
                members={members}
                emptyLabel={t("process.unassigned")}
              />
            </Field>
          </div>

          <Field label={t("process.finality")} required>
            <Textarea
              rows={3}
              value={formData.finality}
              onChange={(event) => setField("finality", event.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("process.indicators")} hint={t("process.hints.onePerLine")}>
              <Textarea
                rows={4}
                value={formData.indicators}
                onChange={(event) => setField("indicators", event.target.value)}
              />
            </Field>
            <Field label={t("process.inputs")} hint={t("process.hints.pair")}>
              <Textarea
                rows={4}
                value={formData.inputs}
                onChange={(event) => setField("inputs", event.target.value)}
              />
            </Field>
            <Field label={t("process.outputs")} hint={t("process.hints.outputPair")}>
              <Textarea
                rows={4}
                value={formData.outputs}
                onChange={(event) => setField("outputs", event.target.value)}
              />
            </Field>
            <Field label={t("process.activities")} hint={t("process.hints.activities")}>
              <Textarea
                rows={4}
                value={formData.activities}
                onChange={(event) => setField("activities", event.target.value)}
              />
            </Field>
            <Field label={t("process.risks")} hint={t("process.hints.onePerLine")}>
              <Textarea
                rows={4}
                value={formData.risks}
                onChange={(event) => setField("risks", event.target.value)}
              />
            </Field>
            <Field label={t("process.opportunities")} hint={t("process.hints.onePerLine")}>
              <Textarea
                rows={4}
                value={formData.opportunities}
                onChange={(event) => setField("opportunities", event.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label={t("process.requiredKnowledge")}>
              <Textarea
                rows={3}
                value={formData.required_knowledge}
                onChange={(event) =>
                  setField("required_knowledge", event.target.value)
                }
              />
            </Field>
            <Field label={t("process.criticalResources")}>
              <Textarea
                rows={3}
                value={formData.critical_resources}
                onChange={(event) =>
                  setField("critical_resources", event.target.value)
                }
              />
            </Field>
            <Field label={t("process.workEnvironment")}>
              <Textarea
                rows={3}
                value={formData.work_environment}
                onChange={(event) =>
                  setField("work_environment", event.target.value)
                }
              />
            </Field>
          </div>

          <Field label={t("process.associatedDocuments")} hint={t("process.hints.documents")}>
            <Textarea
              rows={3}
              value={formData.associated_documents}
              onChange={(event) =>
                setField("associated_documents", event.target.value)
              }
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label={t("process.approval.draftedBy")}>
              <Input
                value={formData.drafted_by}
                onChange={(event) => setField("drafted_by", event.target.value)}
              />
            </Field>
            <Field label={t("process.approval.verifiedBy")}>
              <Input
                value={formData.verified_by}
                onChange={(event) => setField("verified_by", event.target.value)}
              />
            </Field>
            <Field label={t("process.approval.approvedBy")}>
              <Input
                value={formData.approved_by}
                onChange={(event) => setField("approved_by", event.target.value)}
              />
            </Field>
            <Field label={t("process.approval.draftedDate")}>
              <Input
                type="date"
                value={formData.drafted_date}
                onChange={(event) => setField("drafted_date", event.target.value)}
              />
            </Field>
            <Field label={t("process.approval.verifiedDate")}>
              <Input
                type="date"
                value={formData.verified_date}
                onChange={(event) => setField("verified_date", event.target.value)}
              />
            </Field>
            <Field label={t("process.approval.approvedDate")}>
              <Input
                type="date"
                value={formData.approved_date}
                onChange={(event) => setField("approved_date", event.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("process.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function UserSelect({
  value,
  onChange,
  members,
  emptyLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  members: Awaited<ReturnType<typeof teamApi.getCompanyMembers>>;
  emptyLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">{emptyLabel}</option>
      {members.map((member) => (
        <option key={member.user} value={member.user}>
          {member.user_name || member.user_email || member.user}
        </option>
      ))}
    </select>
  );
}
