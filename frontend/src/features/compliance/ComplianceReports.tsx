/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/compliance/ComplianceReports.tsx
/**
 * FIX #6 — Framework dropdown now uses libraryApi.getFrameworks with the
 * shared query key ['frameworks'] instead of the removed
 * complianceApi.getFrameworks, so TanStack Query can deduplicate the request
 * across the whole app.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { complianceApi } from "../../api/compliance";
import { libraryApi } from "../../api/library";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { FileText, Download, Plus, BarChart2 } from "lucide-react";
import { formatDateTime } from "../../lib/utils";
import { getErrorMessage } from "../../api/client";
import { useI18n } from "../../hooks/useI18n";

const REPORT_TYPES = [
  { value: "summary", labelKey: "compliance.reports.types.summary" },
  { value: "detailed", labelKey: "compliance.reports.types.detailed" },
  { value: "gap_analysis", labelKey: "compliance.reports.types.gapAnalysis" },
  { value: "evidence_matrix", labelKey: "compliance.reports.types.evidenceMatrix" },
  { value: "control_matrix", labelKey: "compliance.reports.types.controlMatrix" },
  { value: "audit_report", labelKey: "compliance.reports.types.auditReport" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  generating: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const EMPTY_FORM = {
  title: "",
  framework: "",
  report_type: "summary",
  report_format: "pdf",
  period_start: "",
  period_end: "",
};

export function ComplianceReports() {
  const { t } = useI18n();
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const {
    data: reports,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["compliance-reports"],
    queryFn: complianceApi.getReports,
  });

  // FIX #6: shared query key ['frameworks'] — deduplicated across the app
  const { data: frameworksData } = useQuery({
    queryKey: ["frameworks"],
    queryFn: () =>
      libraryApi.getFrameworks({ is_published: true, page_size: 100 }),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: complianceApi.generateReport,
    onSuccess: () => {
      refetch();
      setShowGenerateForm(false);
      setFormData(EMPTY_FORM);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDownload = async (reportId: string, title: string) => {
    try {
      const blob = await complianceApi.downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleGenerate = () => {
    if (!formData.title.trim()) return;
    generateMutation.mutate({
      ...formData,
      framework: formData.framework || undefined,
      period_start: formData.period_start || undefined,
      period_end: formData.period_end || undefined,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("compliance.reports.title")}</h1>
          <p className="text-gray-600 mt-1">
            {t("compliance.reports.subtitle")}
          </p>
        </div>
        <Button onClick={() => setShowGenerateForm(!showGenerateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("compliance.generateReport")}
        </Button>
      </div>

      {/* Generate form */}
      {showGenerateForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>{t("compliance.reports.generateNew")}</CardTitle>
          </CardHeader>
          <CardContent>
            {generateMutation.error && (
              <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {getErrorMessage(generateMutation.error)}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">{t("compliance.reports.reportTitle")} *</label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("compliance.reports.titlePlaceholder")}
                />
              </div>

              {/* Framework */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("common.framework")}</label>
                <select
                  value={formData.framework}
                  onChange={(e) =>
                    setFormData({ ...formData, framework: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t("compliance.reports.allFrameworks")}</option>
                  {frameworksData?.results?.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.code} – {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Report type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("compliance.reports.reportType")}</label>
                <select
                  value={formData.report_type}
                  onChange={(e) =>
                    setFormData({ ...formData, report_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period start */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("compliance.reports.periodStart")}</label>
                <Input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) =>
                    setFormData({ ...formData, period_start: e.target.value })
                  }
                />
              </div>

              {/* Period end */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("compliance.reports.periodEnd")}</label>
                <Input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) =>
                    setFormData({ ...formData, period_end: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleGenerate}
                disabled={!formData.title.trim() || generateMutation.isPending}
              >
                {generateMutation.isPending
                  ? t("compliance.reports.generating")
                  : t("compliance.generateReport")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowGenerateForm(false)}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("compliance.reports.generatedReports")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!reports?.results?.length ? (
            <div className="text-center py-12">
              <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t("compliance.reports.empty")}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowGenerateForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("compliance.reports.generateFirst")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t("compliance.reports.tableTitle")}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t("common.framework")}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t("evidence.type")}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t("risk.status")}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t("compliance.reports.generated")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">
                      {t("evidence.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.results.map((report: any) => (
                    <tr
                      key={report.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <p className="font-medium text-gray-900">
                            {report.title}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {report.framework_code || t("common.all")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600 capitalize">
                          {t(
                            REPORT_TYPES.find(
                              (type) => type.value === report.report_type,
                            )?.labelKey ?? "common.unknown",
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            STATUS_COLORS[report.status] ||
                            STATUS_COLORS.pending
                          }
                        >
                          {t(`compliance.reports.statuses.${report.status}`)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {formatDateTime(report.created_at)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {report.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownload(report.id, report.title)
                            }
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {t("evidence.viewer.downloadFile")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
