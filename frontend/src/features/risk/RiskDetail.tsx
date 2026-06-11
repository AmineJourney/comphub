import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { riskApi } from "../../api/risk";
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
import {
  ArrowLeft,
  Edit,
  Trash2,
  Shield,
  TrendingDown,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Target,
} from "lucide-react";
import { getRiskLevelLabel, RISK_LEVELS } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { AssessRiskDialog } from "./AssessRiskDialog";
import { AddTreatmentActionDialog } from "./AddTreatmentActionDialog";
import { useI18n } from "../../hooks/useI18n";

export function RiskDetail() {
  const { language, t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAssessDialog, setShowAssessDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);

  const { data: risk, isLoading } = useQuery({
    queryKey: ["risk", id],
    queryFn: () => riskApi.getRisk(id!),
    enabled: !!id,
  });

  const { data: assessments } = useQuery({
    queryKey: ["risk-assessments", id],
    queryFn: () => riskApi.getRiskAssessments(id!),
    enabled: !!id,
  });

  const { data: treatmentActions } = useQuery({
    queryKey: ["treatment-actions", id],
    queryFn: () => riskApi.getTreatmentActions({ risk: id }),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => riskApi.deleteRisk(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      navigate("/risks");
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!risk) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("risk.detail.notFound")}</p>
      </div>
    );
  }

  const riskReduction = risk.residual_risk_data.risk_reduction || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/risks")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{risk.title}</h1>
              <Badge className={RISK_LEVELS[risk.inherent_risk_level].color}>
                {getRiskLevelLabel(risk.inherent_risk_level, language)}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              {risk.risk_id ||
                t("risk.detail.riskId", { id: risk.id.substring(0, 8) })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(t("risk.detail.deleteConfirm"))) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("risk.inherentRisk")}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {risk.inherent_risk_score}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  L:{risk.inherent_likelihood} × I:{risk.inherent_impact}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("risk.residualRisk")}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {risk.residual_risk_data.residual_score}
                </p>
                <Badge
                  className={`mt-2 ${
                    RISK_LEVELS[
                      risk.residual_risk_data
                        .residual_level as keyof typeof RISK_LEVELS
                    ]?.color
                  }`}
                >
                  {
                    RISK_LEVELS[
                      risk.residual_risk_data
                        .residual_level as keyof typeof RISK_LEVELS
                    ]
                      ? getRiskLevelLabel(
                          risk.residual_risk_data.residual_level,
                          language,
                        )
                      : risk.residual_risk_data.residual_level
                  }
                </Badge>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("risk.heatMapRiskReduction")}
                </p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {riskReduction.toFixed(0)}%
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("risk.detail.activeControls")}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {risk.residual_risk_data.control_count}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {risk.residual_risk_data.avg_effectiveness.toFixed(0)}% avg
                  {t("risk.detail.avgEffectiveness")}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Risk Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>{t("risk.detail.description")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {risk.description}
              </p>
            </CardContent>
          </Card>

          {/* Causes and Consequences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("risk.dialogs.create.potentialCauses")}</CardTitle>
              </CardHeader>
              <CardContent>
                {risk.potential_causes ? (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {risk.potential_causes}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">{t("risk.detail.noCauses")}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("risk.dialogs.create.potentialConsequences")}</CardTitle>
              </CardHeader>
              <CardContent>
                {risk.potential_consequences ? (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {risk.potential_consequences}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">
                    {t("risk.detail.noConsequences")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Control Assessments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("risk.detail.controlAssessments")}</CardTitle>
                <Button size="sm" onClick={() => setShowAssessDialog(true)}>
                  <Shield className="mr-2 h-4 w-4" />
                  {t("risk.dialogs.assess.submit")}
                </Button>
              </div>
              <CardDescription>
                {t("risk.detail.controlsMitigating", {
                  count: assessments?.length || 0,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assessments && assessments.length > 0 ? (
                <div className="space-y-3">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {assessment.control_code}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {assessment.control_name}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <div>
                              <p className="text-xs text-gray-500">
                                {t("risk.detail.effectiveness")}
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {assessment.effectiveness_rating}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">
                                {t("risk.heatMapRiskReduction")}
                              </p>
                              <p className="text-sm font-medium text-green-600">
                                {assessment.risk_reduction.toFixed(0)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">
                                {t("risk.residualRisk")}
                              </p>
                              <Badge
                                className={
                                  RISK_LEVELS[
                                    assessment.residual_risk_level as keyof typeof RISK_LEVELS
                                  ]?.color
                                }
                              >
                                {assessment.residual_score}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t("risk.detail.noControlsLinked")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowAssessDialog(true)}
                  >
                    {t("risk.detail.linkFirstControl")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Treatment Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("risk.detail.treatmentActions")}</CardTitle>
                <Button size="sm" onClick={() => setShowActionDialog(true)}>
                  <Target className="mr-2 h-4 w-4" />
                  {t("risk.detail.addAction")}
                </Button>
              </div>
              <CardDescription>
                {t("risk.detail.actionsToMitigate", {
                  count: treatmentActions?.count || 0,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {treatmentActions && treatmentActions.results.length > 0 ? (
                <div className="space-y-3">
                  {treatmentActions.results.map((action) => (
                    <div
                      key={action.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {action.action_title}
                            </p>
                            <Badge
                              variant={
                                action.status === "completed"
                                  ? "default"
                                  : action.status === "in_progress"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="capitalize"
                            >
                              {action.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {action.action_description}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              {t("risk.detail.due")}: {formatDate(action.due_date)}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{
                                    width: `${action.progress_percentage}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">
                                {action.progress_percentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t("risk.detail.noTreatmentActions")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowActionDialog(true)}
                  >
                    {t("risk.detail.addFirstAction")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Risk Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("risk.detail.riskInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t("risk.category")}
                </label>
                <p className="text-gray-900 mt-1 capitalize">
                  {t(`risk.categories.${risk.risk_category}`)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t("risk.dialogs.create.source")}
                </label>
                <p className="text-gray-900 mt-1 capitalize">
                  {t(`risk.sources.${risk.risk_source}`)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t("risk.status")}
                </label>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {risk.status.replace("_", " ")}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t("risk.dialogs.create.treatmentStrategy")}
                </label>
                <p className="text-gray-900 mt-1 capitalize">
                  {t(`risk.treatments.${risk.treatment_strategy}`)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t("risk.detail.riskOwner")}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-900">
                    {risk.risk_owner_email || t("risk.detail.notAssigned")}
                  </p>
                </div>
              </div>

              {risk.next_review_date && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t("controls.detail.nextReview")}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">
                      {formatDate(risk.next_review_date)}
                    </p>
                    {risk.is_overdue && (
                      <Badge variant="destructive">{t("controls.detail.overdue")}</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Treatment Plan */}
          {risk.treatment_plan && (
            <Card>
              <CardHeader>
                <CardTitle>{t("risk.detail.treatmentPlan")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {risk.treatment_plan}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AssessRiskDialog
        riskId={risk.id}
        open={showAssessDialog}
        onClose={() => setShowAssessDialog(false)}
        onSuccess={() => {
          setShowAssessDialog(false);
          queryClient.invalidateQueries({ queryKey: ["risk-assessments", id] });
          queryClient.invalidateQueries({ queryKey: ["risk", id] });
        }}
      />

      <AddTreatmentActionDialog
        riskId={risk.id}
        open={showActionDialog}
        onClose={() => setShowActionDialog(false)}
        onSuccess={() => {
          setShowActionDialog(false);
          queryClient.invalidateQueries({
            queryKey: ["treatment-actions", id],
          });
        }}
      />
    </div>
  );
}
