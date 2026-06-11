/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Search, Shield, AlertCircle } from "lucide-react";
import { controlsApi } from "../../api/controls";
import { organizationsApi } from "../../api/organizations";
import { teamApi } from "../../api/team";
import { getErrorMessage } from "../../api/client";
import { useI18n } from "../../hooks/useI18n";
import { useAuthStore } from "../../stores/authStore";
import { Badge } from "../../components/ui/badge";
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
import { VirtualInfiniteList } from "../../components/common/VirtualInfiniteList";
import type { ReferenceControl } from "../../types/control.types";

interface ApplyControlDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

export function ApplyControlDialog({
  open,
  onClose,
  onSuccess,
}: ApplyControlDialogProps) {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [activeFramework, setActiveFramework] = useState<string>("all");
  const [activeSection, setActiveSection] = useState<"all" | "annex" | "core">(
    "all",
  );
  const [selectedControl, setSelectedControl] =
    useState<ReferenceControl | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [controlOwnerId, setControlOwnerId] = useState(user?.id ?? "");

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => organizationsApi.getDepartments(),
    enabled: open,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["company-members"],
    queryFn: () => teamApi.getCompanyMembers(),
    enabled: open,
  });

  const departments = departmentsData?.results ?? [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["reference-controls-adopted", search],
    queryFn: ({ pageParam = 1 }: { pageParam?: number }) =>
      controlsApi.getReferenceControls({
        page: pageParam,
        page_size: 1000,
        search: search || undefined,
        adopted_only: true,
        exclude_applied: true,
      }),
    getNextPageParam: (lastPage: any) => {
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next);
      return parseInt(url.searchParams.get("page") || "1", 10);
    },
    enabled: open,
    initialPageParam: 1,
  });

  const applyMutation = useMutation({
    mutationFn: (controlId: string) =>
      controlsApi.applyControl({
        reference_control: controlId,
        department: departmentId || null,
        control_owner: controlOwnerId || null,
      }),
    onSuccess: () => {
      onSuccess();
      reset();
    },
  });

  const allControls = useMemo(
    () => data?.pages.flatMap((page: any) => page.results) ?? [],
    [data],
  );

  const frameworkTabs = useMemo(() => {
    const counts = new Map<string, number>();
    allControls.forEach((control) => {
      (control.frameworks ?? []).forEach((framework: string) => {
        counts.set(framework, (counts.get(framework) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, count]) => ({ code, count }));
  }, [allControls]);

  const hasAnnexControls = useMemo(
    () => allControls.some((control) => control.code.startsWith("A.")),
    [allControls],
  );

  useEffect(() => {
    if (!open || activeSection !== "all" || !hasAnnexControls) return;

    const timer = window.setTimeout(() => {
      setActiveSection("annex");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, activeSection, hasAnnexControls]);

  const filteredControls = useMemo(() => {
    return allControls.filter((control) => {
      const matchesFramework =
        activeFramework === "all" ||
        (control.frameworks ?? []).includes(activeFramework);

      const matchesSection =
        activeSection === "all" ||
        (activeSection === "annex"
          ? control.code.startsWith("A.")
          : !control.code.startsWith("A."));

      return matchesFramework && matchesSection;
    });
  }, [activeFramework, activeSection, allControls]);

  const sectionTabs = useMemo(() => {
    const annexCount = allControls.filter((control) =>
      control.code.startsWith("A."),
    ).length;

    if (!annexCount) {
      return [
        {
          code: "all" as const,
          label: t("controls.applyDialog.allControls"),
          count: allControls.length,
        },
      ];
    }

    return [
      {
        code: "annex" as const,
        label: t("controls.applyDialog.annexA"),
        count: annexCount,
      },
      {
        code: "core" as const,
        label: t("controls.applyDialog.clauses"),
        count: allControls.length - annexCount,
      },
      {
        code: "all" as const,
        label: t("controls.applyDialog.allControls"),
        count: allControls.length,
      },
    ];
  }, [allControls, t]);

  const filteredPages = useMemo(
    () => [{ results: filteredControls }],
    [filteredControls],
  );

  useEffect(() => {
    if (open && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleApply = () => {
    if (selectedControl) {
      applyMutation.mutate(selectedControl.id);
    }
  };

  const reset = () => {
    setSearch("");
    setActiveFramework("all");
    setActiveSection("all");
    setSelectedControl(null);
    setDepartmentId("");
    setControlOwnerId(user?.id ?? "");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const noControls = !isLoading && allControls.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("controls.applyDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("controls.applyDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {noControls && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">
                  {t("controls.applyDialog.noControlsAvailable")}
                </p>
                <p className="mt-0.5 text-amber-700">
                  {t("controls.applyDialog.adoptFrameworkFirst")}
                </p>
              </div>
            </div>
          )}

          {frameworkTabs.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t("controls.applyDialog.filterByFramework")}
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setActiveFramework("all");
                    setSelectedControl(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeFramework === "all"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t("common.all")}{" "}
                  <span className="ml-1.5 opacity-75">
                    ({allControls.length})
                  </span>
                </button>

                {frameworkTabs.map(({ code, count }) => (
                  <button
                    key={code}
                    onClick={() => {
                      setActiveFramework(code);
                      setSelectedControl(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeFramework === code
                        ? "bg-primary text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {code} <span className="ml-1.5 opacity-75">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {sectionTabs.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t("controls.applyDialog.filterBySection")}
              </label>
              <div className="flex gap-2 flex-wrap">
                {sectionTabs.map(({ code, label, count }) => (
                  <button
                    key={code}
                    onClick={() => {
                      setActiveSection(code);
                      setSelectedControl(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeSection === code
                        ? "bg-primary text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {label} <span className="ml-1.5 opacity-75">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {t("controls.applyDialog.searchLabel")}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("controls.applyDialog.searchPlaceholder")}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelectedControl(null);
                }}
                className="pl-10 h-11"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t("controls.department")}
              </label>
              <select
                value={departmentId}
                onChange={(event) => {
                  const nextDepartmentId = event.target.value;
                  const selectedDepartment = departments.find(
                    (department) => department.id === nextDepartmentId,
                  );

                  setDepartmentId(nextDepartmentId);
                  setControlOwnerId(
                    selectedDepartment?.manager ?? user?.id ?? "",
                  );
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">{t("controls.noValue")}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.full_path}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t("controls.detail.controlOwner")}
              </label>
              <select
                value={controlOwnerId}
                onChange={(event) => setControlOwnerId(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">{t("controls.noValue")}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user}>
                    {member.user_name || member.user_email || member.user}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {applyMutation.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {getErrorMessage(applyMutation.error)}
            </div>
          )}

          <div className="flex-1 border-2 rounded-lg overflow-hidden bg-gray-50">
            <VirtualInfiniteList
              pages={filteredPages}
              fetchNextPage={fetchNextPage}
              hasNextPage={false}
              isFetchingNextPage={isFetchingNextPage}
              estimateSize={110}
              height={450}
              isLoading={isLoading}
              emptyState={
                <div className="text-center py-16 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-lg">
                    {t("controls.applyDialog.noControlsFound")}
                  </p>
                  <p className="text-sm mt-1">
                    {t("controls.applyDialog.adjustSearch")}
                  </p>
                </div>
              }
              renderItem={(control: ReferenceControl) => {
                const isSelected = selectedControl?.id === control.id;
                const frameworks = control.frameworks ?? [];

                return (
                  <button
                    key={control.id}
                    onClick={() => setSelectedControl(control)}
                    className={`w-full p-4 text-left transition-all border-b border-gray-200 ${
                      isSelected
                        ? "bg-blue-50 border-l-4 border-l-primary shadow-sm"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <Shield className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {control.code}
                          </span>
                          <Badge
                            className={`text-xs ${PRIORITY_STYLES[control.priority] ?? ""}`}
                          >
                            {t(`controls.priorityLabels.${control.priority}`)}
                          </Badge>
                        </div>

                        <p className="font-semibold text-gray-900 mb-1">
                          {control.name}
                        </p>

                        {control.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {control.description}
                          </p>
                        )}

                        {activeFramework === "all" && frameworks.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {frameworks.map((framework) => (
                              <span
                                key={framework}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium"
                              >
                                {framework}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }}
            />
          </div>

          {selectedControl && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary text-white flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {t("controls.applyDialog.selectedControl")}
                  </p>
                  <p className="font-semibold text-gray-900">
                    {selectedControl.code} - {selectedControl.name}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedControl || applyMutation.isPending}
            className="flex-1"
          >
            {applyMutation.isPending ? (
              <>
                <Shield className="mr-2 h-4 w-4 animate-pulse" />
                {t("controls.applyDialog.applying")}
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                {t("controls.applyDialog.title")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
