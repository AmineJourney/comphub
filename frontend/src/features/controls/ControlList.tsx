import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Eye, Filter, Plus, Search } from "lucide-react";
import { controlsApi } from "../../api/controls";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useI18n } from "../../hooks/useI18n";
import { cn } from "../../lib/utils";
import { CONTROL_STATUS, getControlStatusLabel } from "../../lib/constants";
import { useAuthStore } from "../../stores/authStore";
import type { AppliedControl } from "../../types/control.types";
import { ApplyControlDialog } from "./ApplyControlDialog";

export function ControlList() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const canApplyControls = useAuthStore((state) => state.hasPermission("create_any"));
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["applied-controls", page, search, statusFilter],
    queryFn: () =>
      controlsApi.getAppliedControls({
        page,
        page_size: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const statuses = [
    "not_started",
    "in_progress",
    "implemented",
    "testing",
    "operational",
    "needs_improvement",
    "non_compliant",
  ];

  const handleViewControl = (control: AppliedControl) => {
    navigate(`/controls/${control.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("controls.title")}</h1>
          <p className="mt-1 text-gray-600">{t("controls.subtitle")}</p>
        </div>
        {canApplyControls && (
          <Button onClick={() => setShowApplyDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("controls.applyControl")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={t("controls.searchPlaceholder")}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              {statuses.slice(0, 4).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(statusFilter === status ? "" : status);
                    setPage(1);
                  }}
                >
                  {getControlStatusLabel(status, language)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("controls.appliedControls")}</CardTitle>
          <CardDescription>
            {t("controls.controlsFound", { count: data?.count || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : data?.results.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">{t("controls.noControlsFound")}</p>
              {canApplyControls && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowApplyDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("controls.applyFirstControl")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("controls.control")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("controls.department")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("controls.status")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("controls.score")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("controls.evidence")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("controls.owner")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">
                        {t("controls.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((control) => (
                      <tr
                        key={control.id}
                        className="border-b transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {control.reference_control_code}
                            </p>
                            <p className="max-w-xs truncate text-sm text-gray-500">
                              {control.reference_control_name}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {control.department_name || t("controls.noValue")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              CONTROL_STATUS[control.status as keyof typeof CONTROL_STATUS]
                                ?.color
                            }
                          >
                            {getControlStatusLabel(control.status, language)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-gray-200">
                              <div
                                className={cn(
                                  "h-2 rounded-full",
                                  control.compliance_score >= 85
                                    ? "bg-green-500"
                                    : control.compliance_score >= 70
                                      ? "bg-yellow-500"
                                      : "bg-red-500",
                                )}
                                style={{ width: `${control.compliance_score}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {control.compliance_score}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                control.evidence_count > 0 ? "bg-green-500" : "bg-gray-300",
                              )}
                            />
                            <span className="text-sm text-gray-600">
                              {control.evidence_count}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {control.control_owner_email || t("controls.noValue")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewControl(control)}
                            >
                              <Eye className="h-4 w-4" />
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
                    {t("controls.showingResults", {
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

      {canApplyControls && (
        <ApplyControlDialog
          open={showApplyDialog}
          onClose={() => setShowApplyDialog(false)}
          onSuccess={() => {
            setShowApplyDialog(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
