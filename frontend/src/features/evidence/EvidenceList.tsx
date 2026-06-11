/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { evidenceApi } from "../../api/evidence";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useI18n } from "../../hooks/useI18n";
import { EVIDENCE_STATUS, getEvidenceStatusLabel } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import type { Evidence } from "../../types/evidence.types";
import { UploadEvidenceDialog } from "./UploadEvidenceDialog";

export function EvidenceList() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["evidence-list", page, search, statusFilter, typeFilter],
    queryFn: () =>
      evidenceApi.getEvidenceList({
        page,
        page_size: 20,
        search: search || undefined,
        verification_status: statusFilter || undefined,
        evidence_type: typeFilter || undefined,
      }),
  });

  const { data: analytics } = useQuery({
    queryKey: ["evidence-analytics"],
    queryFn: evidenceApi.getAnalytics,
  });

  const handleDownload = async (evidence: Evidence) => {
    try {
      const blob = await evidenceApi.downloadEvidence(evidence.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = evidence.name;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const evidenceTypes = [
    "policy",
    "procedure",
    "screenshot",
    "report",
    "log",
    "certificate",
    "configuration",
    "scan_result",
    "audit_report",
    "training_record",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("evidence.title")}</h1>
          <p className="mt-1 text-gray-600">{t("evidence.subtitle")}</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("evidence.uploadEvidence")}
        </Button>
      </div>

      {analytics && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t("evidence.storageUsed")}</span>
                  <span className="font-medium">
                    {analytics.storage.used_mb.toFixed(2)} MB / {analytics.storage.quota_mb} MB
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      analytics.storage.is_over_quota
                        ? "bg-red-500"
                        : analytics.storage.usage_percentage > 80
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(analytics.storage.usage_percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
              {analytics.storage.is_over_quota && (
                <div className="ml-6">
                  <Badge variant="destructive">{t("evidence.overQuota")}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {analytics && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <MetricCard
            label={t("evidence.totalEvidence")}
            value={analytics.total_evidence}
            icon={<FileText className="h-8 w-8 text-blue-600" />}
          />
          <MetricCard
            label={t("evidence.pendingApproval")}
            value={
              analytics.by_status.find((status) => status.verification_status === "pending")
                ?.count || 0
            }
            icon={<Clock className="h-8 w-8 text-yellow-600" />}
          />
          <MetricCard
            label={t("evidence.expired")}
            value={analytics.expired_count}
            icon={<AlertTriangle className="h-8 w-8 text-red-600" />}
          />
          <MetricCard
            label={t("evidence.unlinked")}
            value={analytics.unlinked_count}
            icon={<XCircle className="h-8 w-8 text-orange-600" />}
          />
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={t("evidence.searchPlaceholder")}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{t("evidence.typeLabel")}</span>
              {evidenceTypes.slice(0, 5).map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setTypeFilter(typeFilter === type ? "" : type);
                    setPage(1);
                  }}
                >
                  {type.replace("_", " ")}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">{t("evidence.statusLabel")}</span>
              {(["pending", "approved", "rejected"] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(statusFilter === status ? "" : status);
                    setPage(1);
                  }}
                >
                  {getEvidenceStatusLabel(status, language)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("evidence.evidenceFiles")}</CardTitle>
          <CardDescription>
            {t("evidence.filesFound", { count: data?.count || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : data?.results.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">{t("evidence.noEvidenceFound")}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowUploadDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("evidence.uploadFirstEvidence")}
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("evidence.name")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("evidence.type")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("evidence.size")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("evidence.statusLabel").replace(":", "")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("evidence.controls")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("evidence.uploaded")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">
                        {t("evidence.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((evidence) => (
                      <tr
                        key={evidence.id}
                        className="border-b transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900">
                                {evidence.name}
                              </p>
                              <p className="truncate text-sm text-gray-500">
                                {evidence.file_extension.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm capitalize text-gray-600">
                          {evidence.evidence_type.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {evidence.file_size_display}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              EVIDENCE_STATUS[evidence.verification_status as keyof typeof EVIDENCE_STATUS]
                                ?.color
                            }
                          >
                            {getEvidenceStatusLabel(evidence.verification_status, language)}
                          </Badge>
                          {evidence.is_expired && (
                            <Badge variant="destructive" className="ml-2">
                              {t("evidence.expired")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                evidence.linked_controls_count > 0 ? "bg-green-500" : "bg-gray-300"
                              }`}
                            />
                            <span className="text-sm text-gray-600">
                              {evidence.linked_controls_count}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">
                            {formatDate(evidence.created_at)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {evidence.uploaded_by_email}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/evidence/${evidence.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(evidence)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.count > 20 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {t("evidence.showingResults", {
                      start: (page - 1) * 20 + 1,
                      end: Math.min(page * 20, data.count),
                      total: data.count,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      disabled={!data.previous}
                    >
                      {t("common.previous")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={!data.next}
                    >
                      {t("common.next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <UploadEvidenceDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onSuccess={() => {
          setShowUploadDialog(false);
          refetch();
        }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
