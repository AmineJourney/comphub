/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Award,
  BarChart2,
  CheckSquare,
  ChevronRight,
  FileText,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { complianceApi } from "../../api/compliance";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { useI18n } from "../../hooks/useI18n";
import { COMPLIANCE_STATUS, getComplianceStatusLabel } from "../../lib/constants";
import { AdoptFrameworkDialog } from "./AdoptFrameworkDialog";

export function ComplianceDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language, formatDate } = useI18n();
  const [showAdoptDialog, setShowAdoptDialog] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["compliance-overview"],
    queryFn: complianceApi.getOverview,
  });

  const { data: adoptions } = useQuery({
    queryKey: ["framework-adoptions"],
    queryFn: complianceApi.getActiveAdoptions,
  });

  const { data: openGaps } = useQuery({
    queryKey: ["open-gaps"],
    queryFn: complianceApi.getOpenGaps,
  });

  const { data: expiringSoon } = useQuery({
    queryKey: ["expiring-certifications"],
    queryFn: complianceApi.getExpiringSoon,
  });

  const calculateAllMutation = useMutation({
    mutationFn: complianceApi.calculateAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-overview"] });
    },
  });

  if (overviewLoading) {
    return <LoadingSpinner />;
  }

  const radarData =
    overview?.frameworks?.map((framework: any) => ({
      framework: framework.framework_code,
      score: framework.compliance_score,
    })) || [];

  const barData =
    overview?.frameworks?.map((framework: any) => ({
      name: framework.framework_code,
      score: parseFloat(framework.compliance_score.toFixed(1)),
      coverage: parseFloat(framework.coverage_percentage.toFixed(1)),
    })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("compliance.title")}</h1>
          <p className="mt-1 text-gray-600">{t("compliance.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => calculateAllMutation.mutate()}
            disabled={calculateAllMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${calculateAllMutation.isPending ? "animate-spin" : ""}`}
            />
            {t("compliance.recalculateAll")}
          </Button>
          <Button onClick={() => setShowAdoptDialog(true)}>
            <CheckSquare className="mr-2 h-4 w-4" />
            {t("compliance.adoptFramework")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <MetricCard
          label={t("compliance.avgComplianceScore")}
          value={`${overview?.avg_compliance_score?.toFixed(1) || 0}%`}
          icon={
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          }
        />
        <MetricCard
          label={t("compliance.frameworks")}
          value={overview?.total_frameworks || 0}
          icon={
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <CheckSquare className="h-6 w-6 text-purple-600" />
            </div>
          }
        />
        <MetricCard
          label={t("compliance.openGaps")}
          value={openGaps?.count || 0}
          icon={
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          }
        />
        <MetricCard
          label={t("compliance.certifications")}
          value={adoptions?.filter((adoption: any) => adoption.is_certified).length || 0}
          icon={
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <Award className="h-6 w-6 text-green-600" />
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("compliance.byFramework")}</CardTitle>
            <CardDescription>{t("compliance.scoreCoverageComparison")}</CardDescription>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`]}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Bar dataKey="score" name={t("compliance.score")} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="coverage" name={t("compliance.coverage")} fill="#93c5fd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-500">
                {t("compliance.noComplianceData")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("compliance.radar")}</CardTitle>
            <CardDescription>{t("compliance.radarDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="framework" tick={{ fontSize: 12 }} />
                  <Radar
                    name={t("compliance.score")}
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  />
                  <Tooltip formatter={(value: any) => [`${value}%`]} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-500">
                {t("compliance.noComplianceData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("compliance.frameworkStatus")}</CardTitle>
          <CardDescription>{t("compliance.currentStatusPerFramework")}</CardDescription>
        </CardHeader>
        <CardContent>
          {overview?.frameworks && overview.frameworks.length > 0 ? (
            <div className="space-y-3">
              {overview.frameworks.map((framework: any) => (
                <div
                  key={framework.framework_id}
                  className="flex cursor-pointer items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                  onClick={() => navigate(`/compliance/frameworks/${framework.framework_id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-gray-900">{framework.framework_code}</p>
                      <p className="truncate text-sm text-gray-600">
                        {framework.framework_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{t("compliance.coverage")}</p>
                      <p className="font-semibold text-gray-900">
                        {framework.coverage_percentage?.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{t("compliance.score")}</p>
                      <p className="font-semibold text-gray-900">
                        {framework.compliance_score?.toFixed(1)}%
                      </p>
                    </div>
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                        framework.grade?.startsWith("A")
                          ? "bg-green-100 text-green-700"
                          : framework.grade?.startsWith("B")
                            ? "bg-blue-100 text-blue-700"
                            : framework.grade?.startsWith("C")
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                      }`}
                    >
                      {framework.grade}
                    </div>
                    <Badge
                      className={
                        COMPLIANCE_STATUS[framework.status as keyof typeof COMPLIANCE_STATUS]
                          ?.color
                      }
                    >
                      {getComplianceStatusLabel(framework.status, language)}
                    </Badge>
                    {framework.gap_count > 0 && (
                      <Badge variant="destructive">
                        {t("compliance.gapsSuffix", { count: framework.gap_count })}
                      </Badge>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <CheckSquare className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">{t("compliance.noFrameworks")}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowAdoptDialog(true)}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                {t("compliance.adoptFirstFramework")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {expiringSoon && expiringSoon.length > 0 && (
          <Card className="border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Award className="h-5 w-5" />
                {t("compliance.certificationsExpiringSoon")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expiringSoon.map((adoption: any) => (
                  <div
                    key={adoption.id}
                    className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{adoption.framework_code}</p>
                      <p className="text-sm text-gray-600">
                        {t("compliance.expires")}:{" "}
                        {formatDate(adoption.certification_expiry_date)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      {t("compliance.renew")}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("compliance.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <QuickAction
                icon={<AlertCircle className="h-5 w-5 text-red-600" />}
                label={t("compliance.viewOpenGaps")}
                onClick={() => navigate("/compliance/gaps")}
              />
              <QuickAction
                icon={<Target className="h-5 w-5 text-blue-600" />}
                label={t("compliance.frameworkAdoptions")}
                onClick={() => navigate("/compliance/adoptions")}
              />
              <QuickAction
                icon={<FileText className="h-5 w-5 text-green-600" />}
                label={t("compliance.generateReport")}
                onClick={() => navigate("/compliance/reports")}
              />
              <QuickAction
                icon={<BarChart2 className="h-5 w-5 text-purple-600" />}
                label={
                  calculateAllMutation.isPending
                    ? t("compliance.calculating")
                    : t("compliance.recalculateCompliance")
                }
                onClick={() => calculateAllMutation.mutate()}
                disabled={calculateAllMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <AdoptFrameworkDialog
        open={showAdoptDialog}
        onClose={() => setShowAdoptDialog(false)}
        onSuccess={() => {
          setShowAdoptDialog(false);
          queryClient.invalidateQueries({ queryKey: ["compliance-overview"] });
          queryClient.invalidateQueries({ queryKey: ["framework-adoptions"] });
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

function QuickAction({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400" />
    </button>
  );
}
