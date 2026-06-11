/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
} from "lucide-react";
import { controlsApi } from "../../api/controls";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { useI18n } from "../../hooks/useI18n";
import { CONTROL_STATUS, getControlStatusLabel } from "../../lib/constants";

export function Dashboard() {
  const { t, language } = useI18n();
  const { data: controlDashboard, isLoading } = useQuery({
    queryKey: ["control-dashboard"],
    queryFn: controlsApi.getControlDashboard,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const stats = [
    {
      name: t("dashboard.totalControls"),
      value: controlDashboard?.total_controls || 0,
      icon: Shield,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: t("dashboard.operational"),
      value:
        controlDashboard?.status_breakdown?.find(
          (status: any) => status.status === "operational",
        )?.count || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      name: t("dashboard.withDeficiencies"),
      value: controlDashboard?.controls_with_deficiencies || 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      name: t("dashboard.overdueReviews"),
      value: controlDashboard?.overdue_reviews || 0,
      icon: Clock,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("dashboard.title")}</h1>
        <p className="mt-1 text-gray-600">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}
                  >
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.averageComplianceScore")}</CardTitle>
            <CardDescription>{t("dashboard.overallEffectiveness")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary">
                  {controlDashboard?.avg_compliance_score?.toFixed(0) || 0}%
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {t("dashboard.complianceScore")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.controlStatus")}</CardTitle>
            <CardDescription>{t("dashboard.distribution")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {controlDashboard?.status_breakdown?.map((item: any) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between"
                >
                  <Badge
                    className={
                      CONTROL_STATUS[item.status as keyof typeof CONTROL_STATUS]?.color
                    }
                  >
                    {getControlStatusLabel(item.status, language)}
                  </Badge>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-32 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${(item.count / (controlDashboard?.total_controls || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium text-gray-900">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.evidenceCoverage")}</CardTitle>
          <CardDescription>{t("dashboard.supportingEvidence")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">{t("dashboard.coverage")}</span>
                <span className="font-medium">
                  {controlDashboard?.evidence_coverage_percentage?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${controlDashboard?.evidence_coverage_percentage || 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
