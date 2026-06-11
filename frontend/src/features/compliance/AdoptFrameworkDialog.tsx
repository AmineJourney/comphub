/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { complianceApi } from "../../api/compliance";
import { libraryApi } from "../../api/library";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Search, CheckSquare } from "lucide-react";
import { getErrorMessage } from "../../api/client";
import { useI18n } from "../../hooks/useI18n";

interface AdoptFrameworkDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdoptFrameworkDialog({
  open,
  onClose,
  onSuccess,
}: AdoptFrameworkDialogProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [selectedFramework, setSelectedFramework] = useState<any>(null);
  const [targetDate, setTargetDate] = useState("");
  const [scope, setScope] = useState("");

  const { data: frameworks, isLoading } = useQuery({
    queryKey: ["frameworks", search],
    queryFn: () => libraryApi.getFrameworks({ is_published: true, page_size: 100 }),
    enabled: open,
  });

  const adoptMutation = useMutation({
    mutationFn: complianceApi.adoptFramework,
    onSuccess: () => {
      onSuccess();
      setSelectedFramework(null);
      setSearch("");
      setTargetDate("");
      setScope("");
    },
  });

  const { data: carryoverPreview, isLoading: isPreviewLoading } = useQuery({
    queryKey: ["framework-carryover-preview", selectedFramework?.id],
    queryFn: () => complianceApi.getCarryoverPreview(selectedFramework.id),
    enabled: open && !!selectedFramework?.id,
  });

  const filteredFrameworks =
    frameworks?.results?.filter(
      (f: any) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.code.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  const handleAdopt = () => {
    if (!selectedFramework) return;

    adoptMutation.mutate({
      framework: selectedFramework.id,
      target_completion_date: targetDate || undefined,
      scope_description: scope || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("compliance.adoptFramework")}</DialogTitle>
          <DialogDescription>
            {t("compliance.adopt.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("library.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {adoptMutation.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {getErrorMessage(adoptMutation.error)}
            </div>
          )}

          {selectedFramework ? (
            /* Configuration for selected framework */
            <div className="space-y-4 border border-primary rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedFramework.code}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedFramework.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFramework(null)}
                >
                  {t("compliance.adopt.change")}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("compliance.adopt.targetDate")}
                </label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("compliance.adopt.scopeDescription")}
                </label>
                <textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder={t("compliance.adopt.scopePlaceholder")}
                />
              </div>

              <div className="rounded-lg border bg-slate-50 p-4 space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  {t("compliance.adopt.carryoverTitle")}
                </p>
                {isPreviewLoading ? (
                  <p className="text-sm text-slate-500">
                    {t("compliance.adopt.checkingCarryover")}
                  </p>
                ) : carryoverPreview ? (
                  <>
                    <p className="text-sm text-slate-700">
                      {t("compliance.adopt.carryoverSummary", {
                        covered: carryoverPreview.already_covered_controls,
                        total: carryoverPreview.total_reference_controls,
                      })}
                    </p>
                    {carryoverPreview.source_frameworks?.length > 0 && (
                      <p className="text-xs text-slate-500">
                        {t("compliance.adopt.coverageFrom")}{" "}
                        {carryoverPreview.source_frameworks.join(", ")}
                      </p>
                    )}
                    {carryoverPreview.covered_examples?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {carryoverPreview.covered_examples.map((control: any) => (
                          <span
                            key={control.code}
                            className="text-xs rounded-full bg-emerald-100 px-2 py-1 text-emerald-800"
                          >
                            {control.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    {t("compliance.adopt.noCarryover")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Framework selection list */
            <div className="flex-1 overflow-y-auto border rounded-lg">
              {isLoading ? (
                <LoadingSpinner />
              ) : filteredFrameworks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {t("compliance.adopt.noFrameworks")}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredFrameworks.map((framework: any) => (
                    <button
                      key={framework.id}
                      onClick={() => setSelectedFramework(framework)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <CheckSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-gray-900">
                              {framework.code}
                            </p>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                              {framework.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {framework.name}
                          </p>
                          {framework.issuing_organization && (
                            <p className="text-xs text-gray-500 mt-1">
                              {framework.issuing_organization}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleAdopt}
            disabled={!selectedFramework || adoptMutation.isPending}
          >
            {adoptMutation.isPending
              ? t("compliance.adopt.adopting")
              : t("compliance.adoptFramework")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
