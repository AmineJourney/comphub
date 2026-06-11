/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { complianceApi } from "../../api/compliance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { AlertCircle, CheckCircle, Shield } from "lucide-react";
import { useI18n } from "../../hooks/useI18n";

interface GapAnalysisProps {
  frameworkId: string;
}

export function GapAnalysis({ frameworkId }: GapAnalysisProps) {
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>("");

  const { data: gapData, isLoading } = useQuery({
    queryKey: ["gap-analysis", frameworkId],
    queryFn: () => complianceApi.getGapAnalysis(frameworkId),
    enabled: !!frameworkId,
  });

  const { data: gaps } = useQuery({
    queryKey: ["compliance-gaps", frameworkId],
    queryFn: complianceApi.getOpenGaps,
  });

  const resolveGapMutation = useMutation({
    mutationFn: (gapId: string) => complianceApi.resolveGap(gapId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gap-analysis", frameworkId],
      });
      queryClient.invalidateQueries({
        queryKey: ["compliance-gaps", frameworkId],
      });
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const normalizeLabelKey = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  const formatFallbackLabel = (value: unknown) =>
    String(value ?? "")
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const translateWithFallback = (key: string, fallback: unknown) => {
    const translated = t(key);
    return translated === key ? formatFallbackLabel(fallback) : translated;
  };

  const getLocalizedRequirementTitle = (gap: any) => {
    if (language === "fr") {
      return (
        gap.requirement_title_fr ||
        gap.title_fr ||
        gap.requirement_name_fr ||
        gap.name_fr ||
        gap.requirement_title
      );
    }

    return (
      gap.requirement_title_en ||
      gap.title_en ||
      gap.requirement_name_en ||
      gap.name_en ||
      gap.requirement_title
    );
  };

  const severityColors: Record<string, string> = {
    critical: "bg-red-200 text-red-900 border-red-300",
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-blue-100 text-blue-800 border-blue-200",
  };

  const severityIcons: Record<string, any> = {
    critical: <AlertCircle className="h-5 w-5 text-red-700" />,
    high: <AlertCircle className="h-5 w-5 text-red-600" />,
    medium: <AlertCircle className="h-5 w-5 text-yellow-600" />,
    low: <AlertCircle className="h-5 w-5 text-blue-600" />,
  };

  const filteredGaps =
    gapData?.gaps?.filter(
      (g: any) => !severityFilter || g.severity === severityFilter,
    ) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: t("compliance.gaps.highSeverity"),
            key: "high",
            color: "text-red-600",
            bg: "bg-red-100",
          },
          {
            label: t("compliance.gaps.mediumSeverity"),
            key: "medium",
            color: "text-yellow-600",
            bg: "bg-yellow-100",
          },
          {
            label: t("compliance.gaps.lowSeverity"),
            key: "low",
            color: "text-blue-600",
            bg: "bg-blue-100",
          },
        ].map(({ label, key, color, bg }) => (
          <button
            key={key}
            onClick={() => setSeverityFilter(severityFilter === key ? "" : key)}
            className={`text-left p-6 rounded-lg border-2 transition-all ${
              severityFilter === key ? "border-primary" : "border-gray-200"
            } bg-white hover:shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className={`text-3xl font-bold mt-2 ${color}`}>
                  {gapData?.by_severity?.[key] || 0}
                </p>
              </div>
              <div
                className={`h-12 w-12 rounded-lg ${bg} flex items-center justify-center`}
              >
                <AlertCircle className={`h-6 w-6 ${color}`} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Gaps List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("compliance.gaps.title")}</CardTitle>
              <CardDescription>
                {t("compliance.gaps.found", {
                  count: filteredGaps.length,
                })}
                {severityFilter &&
                  ` (${t(`compliance.gaps.${severityFilter}Severity`)})`}
              </CardDescription>
            </div>
            {severityFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSeverityFilter("")}
              >
                {t("compliance.gaps.clearFilter")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredGaps.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {severityFilter
                  ? t("compliance.gaps.noSeverityGaps", {
                      severity: t(`compliance.gaps.${severityFilter}Severity`),
                    })
                  : t("compliance.gaps.noneFound")}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {!severityFilter &&
                  t("compliance.gaps.greatWork")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGaps.map((gap: any, idx: number) => {
                const severity = normalizeLabelKey(gap.severity);
                const status = normalizeLabelKey(gap.status);

                return (
                <div
                  key={idx}
                  className={`p-4 border rounded-lg ${severityColors[severity] || "border-gray-200"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {severityIcons[severity]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">
                            {gap.requirement_code}
                          </p>
                          <Badge className={severityColors[severity]}>
                            {translateWithFallback(
                              `compliance.gaps.severity.${severity}`,
                              gap.severity,
                            )}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {translateWithFallback(
                              `compliance.gaps.statuses.${status}`,
                              gap.status,
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          {getLocalizedRequirementTitle(gap)}
                        </p>

                        {/* Controls */}
                        {gap.controls && gap.controls.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {gap.controls.map((ctrl: any, cIdx: number) => (
                              <span
                                key={cIdx}
                                className="text-xs px-2 py-1 bg-white/60 rounded-full text-gray-700"
                              >
                                <Shield className="inline h-3 w-3 mr-1" />
                                {ctrl.code} -{" "}
                                {translateWithFallback(
                                  `controls.statusLabels.${normalizeLabelKey(ctrl.status)}`,
                                  ctrl.status,
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 mt-2">
                            {t("compliance.gaps.noControls")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{t("compliance.score")}</p>
                        <p className="font-bold text-gray-900">
                          {(gap.score || 0).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
