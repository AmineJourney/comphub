/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, Filter, Plus, Search, TrendingUp } from "lucide-react";
import { riskApi } from "../../api/risk";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useI18n } from "../../hooks/useI18n";
import { getRiskLevelLabel, RISK_LEVELS } from "../../lib/constants";
import { CreateRiskDialog } from "./CreateRiskDialog";

export function RiskRegister() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["risks", page, search, categoryFilter, levelFilter],
    queryFn: () =>
      riskApi.getRisks({
        page,
        page_size: 20,
        search: search || undefined,
        risk_category: categoryFilter || undefined,
        inherent_risk_level: levelFilter || undefined,
      }),
  });

  const { data: summary } = useQuery({
    queryKey: ["risk-summary"],
    queryFn: riskApi.getRiskSummary,
  });

  const categories = [
    "strategic",
    "operational",
    "financial",
    "compliance",
    "reputational",
    "technology",
    "security",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("risk.title")}</h1>
          <p className="mt-1 text-gray-600">{t("risk.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/risks/heat-map")}>
            <TrendingUp className="mr-2 h-4 w-4" />
            {t("risk.heatMap")}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("risk.addRisk")}
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <MetricCard
            label={t("risk.totalRisks")}
            value={summary.total_risks}
            icon={<AlertTriangle className="h-8 w-8 text-blue-600" />}
          />
          <MetricCard
            label={t("risk.criticalRisks")}
            value={
              summary.by_level?.find((level: any) => level.inherent_risk_level === "critical")
                ?.count || 0
            }
            icon={
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            }
          />
          <MetricCard
            label={t("risk.avgInherentScore")}
            value={summary.avg_inherent_score?.toFixed(1) || 0}
            icon={<TrendingUp className="h-8 w-8 text-orange-600" />}
          />
          <MetricCard
            label={t("risk.avgResidualScore")}
            value={summary.avg_residual_score?.toFixed(1) || 0}
            icon={<TrendingUp className="h-8 w-8 text-green-600" />}
          />
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={t("risk.searchPlaceholder")}
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
              <span className="text-sm text-gray-600">{t("risk.categoryLabel")}</span>
              {categories.slice(0, 5).map((category) => (
                <Button
                  key={category}
                  variant={categoryFilter === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCategoryFilter(categoryFilter === category ? "" : category);
                    setPage(1);
                  }}
                >
                  {t(`risk.categories.${category}`)}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">{t("risk.riskLevelLabel")}</span>
              {(["low", "medium", "high", "critical"] as const).map((level) => (
                <Button
                  key={level}
                  variant={levelFilter === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLevelFilter(levelFilter === level ? "" : level);
                    setPage(1);
                  }}
                >
                  {getRiskLevelLabel(level, language)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("risk.riskItems")}</CardTitle>
          <CardDescription>{t("risk.risksFound", { count: data?.count || 0 })}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : data?.results.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">{t("risk.noRisksFound")}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("risk.addFirstRisk")}
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("risk.risk")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("risk.category")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("risk.inherentRisk")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("risk.residualRisk")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("risk.controls")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("risk.status")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("risk.owner")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">
                        {t("risk.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((risk) => (
                      <tr
                        key={risk.id}
                        className="border-b transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {risk.risk_id || risk.id.substring(0, 8)}
                            </p>
                            <p className="max-w-xs truncate text-sm text-gray-600">
                              {risk.title}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm capitalize text-gray-600">
                          {t(`risk.categories.${risk.risk_category}`)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge className={RISK_LEVELS[risk.inherent_risk_level].color}>
                              {getRiskLevelLabel(risk.inherent_risk_level, language)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              ({risk.inherent_risk_score})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                RISK_LEVELS[
                                  risk.residual_risk_data.residual_level as keyof typeof RISK_LEVELS
                                ]?.color || "bg-gray-100 text-gray-800"
                              }
                            >
                              {getRiskLevelLabel(risk.residual_risk_data.residual_level, language)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              ({risk.residual_risk_data.residual_score})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                risk.residual_risk_data.control_count > 0 ? "bg-green-500" : "bg-gray-300"
                              }`}
                            />
                            <span className="text-sm text-gray-600">
                              {risk.residual_risk_data.control_count}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="capitalize">
                            {risk.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {risk.risk_owner_email || t("risk.noValue")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/risks/${risk.id}`)}
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
                    {t("risk.showingResults", {
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

      <CreateRiskDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false);
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
  value: string | number;
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
