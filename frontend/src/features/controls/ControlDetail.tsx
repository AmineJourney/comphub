import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  Layers,
  Link as LinkIcon,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Unlink,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react";
import { controlsApi } from "../../api/controls";
import { evidenceApi } from "../../api/evidence";
import { getErrorMessage } from "../../api/client";
import { useI18n } from "../../hooks/useI18n";
import { useAuthStore } from "../../stores/authStore";
import { getControlStatusLabel, CONTROL_STATUS } from "../../lib/constants";
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
import { EditControlDialog } from "./EditControlDialog";
import { UploadEvidenceDialog } from "../evidence/UploadEvidenceDialog";
import type { AppliedControlEvidence } from "../../types/evidence.types";

const FRAMEWORK_COLOURS: Record<string, string> = {
  "ISO-27001": "bg-blue-100 text-blue-800 border-blue-200",
  "ISO 27001": "bg-blue-100 text-blue-800 border-blue-200",
  TISAX: "bg-purple-100 text-purple-800 border-purple-200",
  "SOC 2": "bg-emerald-100 text-emerald-800 border-emerald-200",
  GDPR: "bg-orange-100 text-orange-800 border-orange-200",
  NIST: "bg-cyan-100 text-cyan-800 border-cyan-200",
};

const VALIDATION_STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function FrameworkBadge({ code }: { code: string }) {
  const className =
    FRAMEWORK_COLOURS[code] ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
    >
      {code}
    </span>
  );
}

function LinkEvidenceDialog({
  controlId,
  onSuccess,
  onClose,
}: {
  controlId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [linkType, setLinkType] = useState("implementation");

  const verificationLabels: Record<string, string> = {
    pending: t("controls.verificationStatus.pending"),
    approved: t("controls.verificationStatus.approved"),
    rejected: t("controls.verificationStatus.rejected"),
    needs_update: t("controls.verificationStatus.needs_update"),
  };

  const linkTypeLabels: Record<string, string> = {
    implementation: t("controls.linkTypeLabels.implementation"),
    testing: t("controls.linkTypeLabels.testing"),
    monitoring: t("controls.linkTypeLabels.monitoring"),
    documentation: t("controls.linkTypeLabels.documentation"),
    audit: t("controls.linkTypeLabels.audit"),
  };

  const badgeMap: Record<
    string,
    { label: string; icon: ReactNode; className: string }
  > = {
    pending: {
      label: verificationLabels.pending,
      icon: <Clock className="h-3 w-3" />,
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    approved: {
      label: verificationLabels.approved,
      icon: <CheckCircle className="h-3 w-3" />,
      className: "bg-green-100 text-green-800 border-green-200",
    },
    rejected: {
      label: verificationLabels.rejected,
      icon: <XCircle className="h-3 w-3" />,
      className: "bg-red-100 text-red-800 border-red-200",
    },
    needs_update: {
      label: verificationLabels.needs_update,
      icon: <RefreshCw className="h-3 w-3" />,
      className: "bg-orange-100 text-orange-800 border-orange-200",
    },
  };

  const { data, isLoading } = useQuery({
    queryKey: ["evidence-picker", search],
    queryFn: () =>
      evidenceApi.getEvidenceList({
        search: search || undefined,
        page_size: 50,
      }),
  });

  const linkMutation = useMutation({
    mutationFn: () =>
      evidenceApi.bulkLinkEvidence({
        evidence_ids: Array.from(selected),
        control_ids: [controlId],
        link_type: linkType,
      }),
    onSuccess,
  });

  const toggle = (id: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {t("controls.detail.evidencePanel.linkDialogTitle")}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("controls.detail.evidencePanel.linkDialogDescription")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="flex flex-wrap gap-2">
            {Object.entries(linkTypeLabels).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setLinkType(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  linkType === value
                    ? "bg-primary text-white border-primary"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("controls.detail.evidencePanel.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : data?.results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {t("controls.detail.evidencePanel.noneFound")}
            </p>
          ) : (
            <div className="space-y-2">
              {data?.results.map((evidence) => {
                const isChecked = selected.has(evidence.id);
                const verificationBadge = badgeMap[evidence.verification_status];

                return (
                  <div
                    key={evidence.id}
                    onClick={() => toggle(evidence.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-primary/5 border-primary"
                        : "hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={isChecked}
                      className="h-4 w-4 text-primary"
                    />
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {evidence.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {evidence.evidence_type} - {evidence.file_size_display}
                      </p>
                    </div>
                    {verificationBadge && (
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${verificationBadge.className}`}
                      >
                        {verificationBadge.icon} {verificationBadge.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {selected.size > 0
              ? t("controls.detail.evidencePanel.selectedCount", {
                  count: selected.size,
                })
              : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || linkMutation.isPending}
              onClick={() => linkMutation.mutate()}
            >
              {linkMutation.isPending
                ? t("controls.detail.evidencePanel.linking")
                : `${t("controls.detail.evidencePanel.linkButton")}${
                    selected.size > 0 ? ` (${selected.size})` : ""
                  }`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceLinkRow({
  link,
  onUnlink,
  unlinking,
}: {
  link: AppliedControlEvidence;
  onUnlink: () => void;
  unlinking: boolean;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const verificationLabels: Record<string, string> = {
    pending: t("controls.verificationStatus.pending"),
    approved: t("controls.verificationStatus.approved"),
    rejected: t("controls.verificationStatus.rejected"),
    needs_update: t("controls.verificationStatus.needs_update"),
  };

  const linkTypeLabels: Record<string, string> = {
    implementation: t("controls.linkTypeLabels.implementation"),
    testing: t("controls.linkTypeLabels.testing"),
    monitoring: t("controls.linkTypeLabels.monitoring"),
    documentation: t("controls.linkTypeLabels.documentation"),
    audit: t("controls.linkTypeLabels.audit"),
  };

  const badgeMap: Record<
    string,
    { label: string; icon: ReactNode; className: string }
  > = {
    pending: {
      label: verificationLabels.pending,
      icon: <Clock className="h-3 w-3" />,
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    approved: {
      label: verificationLabels.approved,
      icon: <CheckCircle className="h-3 w-3" />,
      className: "bg-green-100 text-green-800 border-green-200",
    },
    rejected: {
      label: verificationLabels.rejected,
      icon: <XCircle className="h-3 w-3" />,
      className: "bg-red-100 text-red-800 border-red-200",
    },
    needs_update: {
      label: verificationLabels.needs_update,
      icon: <RefreshCw className="h-3 w-3" />,
      className: "bg-orange-100 text-orange-800 border-orange-200",
    },
  };

  const { data: evidence } = useQuery({
    queryKey: ["evidence-item", link.evidence],
    queryFn: () => evidenceApi.getEvidence(link.evidence),
    staleTime: 60_000,
  });

  const verificationBadge = evidence
    ? badgeMap[evidence.verification_status]
    : null;

  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group transition-colors">
      <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-blue-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-gray-900 truncate">
            {link.evidence_name}
          </p>
          {verificationBadge && (
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${verificationBadge.className}`}
            >
              {verificationBadge.icon} {verificationBadge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
          <span className="capitalize">
            {linkTypeLabels[link.link_type] ?? link.link_type}
          </span>
          {evidence && (
            <>
              <span className="text-gray-300">-</span>
              <span>{evidence.file_size_display}</span>
              {evidence.file_extension && (
                <>
                  <span className="text-gray-300">-</span>
                  <span className="font-mono uppercase">
                    {evidence.file_extension.replace(".", "")}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-primary"
          onClick={() => navigate(`/evidence/${link.evidence}`)}
          title={t("controls.detail.evidencePanel.viewEvidence")}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-red-600"
          onClick={onUnlink}
          disabled={unlinking}
          title={t("controls.detail.evidencePanel.unlink")}
        >
          <Unlink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EvidencePanel({ controlId }: { controlId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [showLinkExisting, setShowLinkExisting] = useState(false);

  const { data: links, isLoading } = useQuery({
    queryKey: ["control-evidence-links", controlId],
    queryFn: () =>
      evidenceApi.getControlEvidenceLinks({ applied_control: controlId }),
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) =>
      evidenceApi.deleteControlEvidenceLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["control-evidence-links", controlId],
      });
      queryClient.invalidateQueries({
        queryKey: ["applied-control", controlId],
      });
    },
  });

  const refetchAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["control-evidence-links", controlId],
    });
    queryClient.invalidateQueries({ queryKey: ["applied-control", controlId] });
  };

  const items: AppliedControlEvidence[] = links?.results ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("controls.detail.evidencePanel.title")}
              </CardTitle>
              <CardDescription>
                {items.length === 0
                  ? t("controls.detail.evidencePanel.noneLinked")
                  : t("controls.detail.evidencePanel.filesDescription", {
                      count: items.length,
                      suffix: items.length === 1 ? "" : "s",
                    })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkExisting(true)}
              >
                <LinkIcon className="mr-1.5 h-4 w-4" />
                {t("controls.detail.evidencePanel.linkExisting")}
              </Button>
              <Button size="sm" onClick={() => setShowUpload(true)}>
                <Upload className="mr-1.5 h-4 w-4" />
                {t("controls.detail.evidencePanel.uploadNew")}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : items.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {t("controls.detail.evidencePanel.noneLinked")}
              </p>
              <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto">
                {t("controls.detail.evidencePanel.sharedScoreText")}
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLinkExisting(true)}
                >
                  <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                  {t("controls.detail.evidencePanel.linkExisting")}
                </Button>
                <Button size="sm" onClick={() => setShowUpload(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {t("controls.detail.evidencePanel.uploadNew")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((link) => (
                <EvidenceLinkRow
                  key={link.id}
                  link={link}
                  onUnlink={() => unlinkMutation.mutate(link.id)}
                  unlinking={unlinkMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showUpload && (
        <UploadEvidenceDialog
          open={showUpload}
          preselectedControlId={controlId}
          onClose={() => setShowUpload(false)}
          onSuccess={refetchAll}
        />
      )}

      {showLinkExisting && (
        <LinkEvidenceDialog
          controlId={controlId}
          onClose={() => setShowLinkExisting(false)}
          onSuccess={() => {
            setShowLinkExisting(false);
            refetchAll();
          }}
        />
      )}
    </>
  );
}

export function ControlDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t, formatDate } = useI18n();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const isOwnerOrAdmin = useAuthStore((state) => state.isOwnerOrAdmin);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: control, isLoading } = useQuery({
    queryKey: ["applied-control", id],
    queryFn: () => controlsApi.getAppliedControl(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => controlsApi.deleteAppliedControl(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applied-controls"] });
      navigate("/controls");
    },
  });

  const validationMutation = useMutation({
    mutationFn: ({
      action,
      notes,
    }: {
      action: "submit" | "approve" | "reject";
      notes?: string;
    }) => {
      if (action === "approve") {
        return controlsApi.approveControlValidation(id!, notes);
      }
      if (action === "reject") {
        return controlsApi.rejectControlValidation(id!, notes || "");
      }
      return controlsApi.submitControlValidation(id!, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applied-control", id] });
      queryClient.invalidateQueries({ queryKey: ["applied-controls"] });
    },
  });

  if (isLoading) return <LoadingSpinner />;

  if (!control) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("controls.detail.controlNotFound")}</p>
      </div>
    );
  }

  const statusInfo =
    CONTROL_STATUS[control.status as keyof typeof CONTROL_STATUS];
  const frameworks: string[] = control.frameworks ?? [];
  const isOwnedControl = !!user && control.control_owner === user.id;
  const canEditControl =
    isOwnerOrAdmin() || (isOwnedControl && hasPermission("update_own"));
  const canDeleteControl =
    isOwnerOrAdmin() || (isOwnedControl && hasPermission("delete_own"));
  const canSubmitValidation =
    canEditControl &&
    control.validation_status !== "submitted" &&
    control.validation_status !== "approved";
  const canReviewValidation =
    isOwnerOrAdmin() && control.validation_status === "submitted";
  const validationStatus = control.validation_status || "draft";
  const validationStatusLabel = t(
    `controls.validationStatus.${validationStatus}`,
  );

  const submitForValidation = () => {
    validationMutation.mutate({ action: "submit" });
  };

  const approveValidation = () => {
    if (confirm(t("controls.detail.confirmApproveValidation"))) {
      validationMutation.mutate({ action: "approve" });
    }
  };

  const rejectValidation = () => {
    const notes = window.prompt(t("controls.detail.rejectValidationPrompt"));
    if (!notes) return;
    validationMutation.mutate({ action: "reject", notes });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/controls")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">
                {control.reference_control_code}
              </h1>
              {frameworks.map((framework) => (
                <FrameworkBadge key={framework} code={framework} />
              ))}
            </div>
            <p className="text-gray-600 mt-1">{control.reference_control_name}</p>
            {frameworks.length > 1 && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {t("controls.detail.sharedEvidence", {
                  count: frameworks.length,
                })}
              </p>
            )}
          </div>
        </div>

        {(canSubmitValidation || canReviewValidation || canEditControl || canDeleteControl) && (
          <div className="flex items-center gap-2">
            {canSubmitValidation && (
              <Button
                variant="outline"
                onClick={submitForValidation}
                disabled={validationMutation.isPending}
              >
                <Clock className="mr-2 h-4 w-4" />
                {t("controls.detail.submitValidation")}
              </Button>
            )}
            {canReviewValidation && (
              <>
                <Button
                  variant="outline"
                  onClick={approveValidation}
                  disabled={validationMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("controls.detail.approveValidation")}
                </Button>
                <Button
                  variant="outline"
                  onClick={rejectValidation}
                  disabled={validationMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("controls.detail.rejectValidation")}
                </Button>
              </>
            )}
            {canEditControl && (
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                {t("common.edit")}
              </Button>
            )}
            {canDeleteControl && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm(t("controls.detail.deleteConfirm"))) {
                    deleteMutation.mutate();
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("common.delete")}
              </Button>
            )}
          </div>
        )}
      </div>

      {validationMutation.error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {getErrorMessage(validationMutation.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t("controls.status")}
            </p>
            <Badge className={statusInfo?.color}>
              {getControlStatusLabel(control.status, language)}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t("controls.detail.validation")}
            </p>
            <Badge className={VALIDATION_STATUS_STYLES[validationStatus]}>
              {validationStatusLabel}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t("controls.detail.complianceScore")}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {control.compliance_score}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t("controls.detail.effectiveness")}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {control.effectiveness_rating != null
                ? `${control.effectiveness_rating}%`
                : t("controls.noValue")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t("controls.detail.evidenceFiles")}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {control.evidence_count}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("controls.detail.controlDetails")}</CardTitle>
            <CardDescription className="whitespace-pre-wrap">
              {control.reference_control_description ||
                t("controls.detail.noDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {control.department_name && (
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">
                    {t("controls.department")}
                  </p>
                  <p className="text-sm font-medium">
                    {control.department_name}
                  </p>
                </div>
              </div>
            )}
            {control.control_owner_email && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">
                    {t("controls.detail.controlOwner")}
                  </p>
                  <p className="text-sm font-medium">
                    {control.control_owner_email}
                  </p>
                </div>
              </div>
            )}
            {control.validation_requested_by_email && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">
                    {t("controls.detail.submittedBy")}
                  </p>
                  <p className="text-sm font-medium">
                    {control.validation_requested_by_email}
                  </p>
                  {control.validation_requested_at && (
                    <p className="text-xs text-gray-500">
                      {formatDate(control.validation_requested_at)}
                    </p>
                  )}
                </div>
              </div>
            )}
            {control.validated_by_email && (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">
                    {t("controls.detail.reviewedBy")}
                  </p>
                  <p className="text-sm font-medium">
                    {control.validated_by_email}
                  </p>
                  {control.validated_at && (
                    <p className="text-xs text-gray-500">
                      {formatDate(control.validated_at)}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">
                  {t("controls.detail.nextReview")}
                </p>
                <p className="text-sm font-medium">
                  {control.next_review_date
                    ? formatDate(control.next_review_date)
                    : t("controls.detail.notScheduled")}
                </p>
                {control.is_overdue && (
                  <Badge variant="destructive" className="mt-1">
                    {t("controls.detail.overdue")}
                  </Badge>
                )}
              </div>
            </div>
            {control.last_tested_date && (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">
                    {t("controls.detail.lastTested")}
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(control.last_tested_date)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("controls.detail.implementationNotes")}</CardTitle>
          </CardHeader>
          <CardContent>
            {control.implementation_notes ? (
              <p className="text-gray-700 whitespace-pre-wrap text-sm">
                {control.implementation_notes}
              </p>
            ) : (
              <p className="text-gray-400 italic text-sm">
                {t("controls.detail.noNotes")}
              </p>
            )}
            {control.validation_notes && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("controls.detail.validationNotes")}
                </p>
                <p className="mt-2 text-gray-700 whitespace-pre-wrap text-sm">
                  {control.validation_notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {control.has_deficiencies && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-900">
                  {t("controls.detail.deficienciesTitle")}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {t("controls.detail.deficienciesBody")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <EvidencePanel controlId={id!} />

      {showEditDialog && canEditControl && (
        <EditControlDialog
          control={control}
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            setShowEditDialog(false);
            queryClient.invalidateQueries({
              queryKey: ["applied-control", id],
            });
          }}
        />
      )}
    </div>
  );
}
