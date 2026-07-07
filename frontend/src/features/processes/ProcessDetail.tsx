import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, FileText, Trash2 } from "lucide-react";
import { getErrorMessage } from "../../api/client";
import { processesApi } from "../../api/processes";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useI18n } from "../../hooks/useI18n";
import type {
  Process,
  ProcessActivity,
  ProcessAssociatedDocument,
  ProcessInputOutput,
} from "../../types/process.types";
import { ProcessFormDialog } from "./ProcessFormDialog";

const statusStyles: Record<Process["status"], string> = {
  draft: "bg-gray-100 text-gray-800",
  in_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  archived: "bg-slate-100 text-slate-700",
};

export function ProcessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const {
    data: process,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["process", id],
    queryFn: () => processesApi.getProcess(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => processesApi.deleteProcess(id!),
    onSuccess: () => navigate("/processes"),
  });

  if (isLoading) return <LoadingSpinner />;

  if (error || !process) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error ? getErrorMessage(error) : t("process.notFound")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/processes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {process.reference}
              </h1>
              <Badge className={statusStyles[process.status]}>
                {t(`process.status.${process.status}`)}
              </Badge>
            </div>
            <p className="mt-1 text-gray-600">{process.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm(t("process.deleteConfirm"))) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </div>

      {deleteMutation.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {getErrorMessage(deleteMutation.error)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Summary label={t("process.version")} value={process.version} />
        <Summary
          label={t("process.effectiveDate")}
          value={process.effective_date || t("risk.noValue")}
        />
        <Summary
          label={t("process.department")}
          value={process.department_name || t("risk.noValue")}
        />
        <Summary
          label={t("process.responsible")}
          value={process.responsible_email || t("risk.noValue")}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("process.finality")}</CardTitle>
          {process.process_type && (
            <CardDescription>{process.process_type}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {process.finality}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ListCard title={t("process.indicators")} items={process.indicators} />
        <PairTable
          title={t("process.inputs")}
          firstHeader={t("process.input")}
          secondHeader={t("process.supplier")}
          items={process.inputs}
        />
        <PairTable
          title={t("process.outputs")}
          firstHeader={t("process.output")}
          secondHeader={t("process.receiver")}
          items={process.outputs}
        />
        <ActivitiesTable items={process.activities} title={t("process.activities")} />
        <ListCard title={t("process.risks")} items={process.risks} />
        <ListCard title={t("process.opportunities")} items={process.opportunities} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TextCard title={t("process.requiredKnowledge")} value={process.required_knowledge} />
        <TextCard title={t("process.criticalResources")} value={process.critical_resources} />
        <TextCard title={t("process.workEnvironment")} value={process.work_environment} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DocumentsTable
          title={t("process.associatedDocuments")}
          items={process.associated_documents}
        />
        <ApprovalCard process={process} />
      </div>

      <ProcessFormDialog
        open={showEditDialog}
        process={process}
        onClose={() => setShowEditDialog(false)}
        onSuccess={() => {
          setShowEditDialog(false);
          refetch();
        }}
      />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function ListCard({ title, items }: { title: string; items?: string[] }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
            {items.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <EmptyState label={t("process.noSectionData")} />
        )}
      </CardContent>
    </Card>
  );
}

function TextCard({ title, value }: { title: string; value?: string }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {value ? (
          <p className="whitespace-pre-wrap text-sm text-gray-700">{value}</p>
        ) : (
          <EmptyState label={t("process.noSectionData")} />
        )}
      </CardContent>
    </Card>
  );
}

function PairTable({
  title,
  firstHeader,
  secondHeader,
  items,
}: {
  title: string;
  firstHeader: string;
  secondHeader: string;
  items?: ProcessInputOutput[];
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2 pr-3">{firstHeader}</th>
                <th className="py-2">{secondHeader}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.name}-${index}`} className="border-b last:border-0">
                  <td className="py-2 pr-3 text-gray-900">{item.name}</td>
                  <td className="py-2 text-gray-600">{item.party}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState label={t("process.noSectionData")} />
        )}
      </CardContent>
    </Card>
  );
}

function ActivitiesTable({
  title,
  items,
}: {
  title: string;
  items?: ProcessActivity[];
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-3">{t("process.activity")}</th>
                  <th className="py-2 pr-3">{t("process.decidesApproves")}</th>
                  <th className="py-2 pr-3">{t("process.executes")}</th>
                  <th className="py-2 pr-3">{t("process.participatesVerifies")}</th>
                  <th className="py-2">{t("process.informed")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.activity}-${index}`} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-gray-900">{item.activity}</td>
                    <td className="py-2 pr-3 text-gray-600">{item.decides_approves}</td>
                    <td className="py-2 pr-3 text-gray-600">{item.executes}</td>
                    <td className="py-2 pr-3 text-gray-600">{item.participates_verifies}</td>
                    <td className="py-2 text-gray-600">{item.informed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState label={t("process.noSectionData")} />
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsTable({
  title,
  items,
}: {
  title: string;
  items?: ProcessAssociatedDocument[];
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2 pr-3">{t("process.document")}</th>
                <th className="py-2">{t("process.reference")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.title}-${index}`} className="border-b last:border-0">
                  <td className="py-2 pr-3 text-gray-900">{item.title}</td>
                  <td className="py-2 text-gray-600">{item.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState label={t("process.noSectionData")} />
        )}
      </CardContent>
    </Card>
  );
}

function ApprovalCard({ process }: { process: Process }) {
  const { t } = useI18n();
  const rows = [
    {
      label: t("process.approval.draftedBy"),
      person: process.approval?.drafted_by,
      date: process.approval?.drafted_date,
    },
    {
      label: t("process.approval.verifiedBy"),
      person: process.approval?.verified_by,
      date: process.approval?.verified_date,
    },
    {
      label: t("process.approval.approvedBy"),
      person: process.approval?.approved_by,
      date: process.approval?.approved_date,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("process.approval.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {row.label}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {row.person || t("risk.noValue")}
            </p>
            <p className="text-xs text-gray-500">
              {row.date || t("risk.noValue")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-gray-400">
      <FileText className="h-4 w-4" />
      {label}
    </div>
  );
}
