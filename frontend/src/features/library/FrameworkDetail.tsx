import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { libraryApi } from "@/api/library";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/hooks/useI18n";
import type { FrameworkRequirementTree } from "@/types/library.types";

export function FrameworkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatDate } = useI18n();

  const { data: framework, isLoading: frameworkLoading } = useQuery({
    queryKey: ["framework", id],
    queryFn: () => libraryApi.getFramework(id!),
    enabled: !!id,
  });

  const { data: requirementsTree, isLoading: treeLoading } = useQuery({
    queryKey: ["framework-requirements-tree", id],
    queryFn: () => libraryApi.getFrameworkRequirementsTree(id!),
    enabled: !!id,
  });

  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ["framework-statistics", id],
    queryFn: () => libraryApi.getFrameworkStatistics(id!),
    enabled: !!id,
  });

  if (frameworkLoading || treeLoading || statsLoading) {
    return <LoadingSpinner />;
  }

  if (!framework) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("library.frameworkNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/library/frameworks")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("library.backToFrameworks")}
          </Button>
        </div>

        {framework.documentation_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(framework.documentation_url, "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("library.officialDocumentation")}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{framework.code}</CardTitle>
              <CardDescription className="mt-2 text-lg">
                {framework.name}
              </CardDescription>
            </div>
            {framework.is_active && (
              <Badge className="bg-green-100 text-green-800">
                {t("library.active")}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {framework.description && (
            <p className="text-gray-700">{framework.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-gray-600">{t("library.version")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {framework.version}
              </p>
            </div>

            {framework.issuing_organization && (
              <div>
                <p className="text-sm text-gray-600">{t("library.issuedBy")}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {framework.issuing_organization}
                </p>
              </div>
            )}

            {framework.effective_date && (
              <div>
                <p className="text-sm text-gray-600">{t("library.effectiveDate")}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatDate(framework.effective_date)}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600">{t("library.totalRequirements")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {framework.requirement_count}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle>{t("library.statistics")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">{t("library.totalRequirements")}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {statistics.total_requirements}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">{t("library.mandatory")}</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {statistics.mandatory_requirements}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">{t("library.optional")}</p>
                <p className="mt-1 text-2xl font-bold text-gray-600">
                  {statistics.optional_requirements}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">{t("library.byPriority")}</p>
                <div className="mt-1 flex items-center space-x-2">
                  {Object.entries(statistics.by_priority).map(([priority, count]) => (
                    <Badge
                      key={priority}
                      variant="outline"
                      className={
                        priority === "critical"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : priority === "high"
                            ? "border-orange-200 bg-orange-50 text-orange-700"
                            : priority === "medium"
                              ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                      }
                    >
                      {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("library.requirements")}</CardTitle>
          <CardDescription>{t("library.hierarchicalView")}</CardDescription>
        </CardHeader>
        <CardContent>
          {requirementsTree && requirementsTree.length > 0 ? (
            <div className="space-y-2">
              {requirementsTree.map((requirement) => (
                <RequirementTreeNode key={requirement.id} requirement={requirement} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">
              {t("library.noRequirementsFound")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequirementTreeNode({
  requirement,
}: {
  requirement: FrameworkRequirementTree;
}) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = requirement.children && requirement.children.length > 0;

  return (
    <div className="space-y-1">
      <div
        className={`flex cursor-pointer items-start space-x-2 rounded-lg p-3 hover:bg-gray-50 ${
          hasChildren ? "" : "ml-6"
        }`}
        onClick={() => hasChildren && setIsExpanded((value) => !value)}
      >
        {hasChildren && (
          <button className="mt-0.5 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-medium text-gray-900">
                  {requirement.requirement_id}
                </span>
                {requirement.section && (
                  <Badge variant="outline" className="text-xs">
                    {requirement.section}
                  </Badge>
                )}
                {requirement.is_mandatory && (
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-xs text-blue-700"
                  >
                    {t("library.mandatory")}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-700">{requirement.title}</p>
            </div>

            <div className="ml-4 flex items-center space-x-2">
              {requirement.mapped_controls_count > 0 && (
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 text-green-700"
                >
                  {t("library.controlsCount", {
                    count: requirement.mapped_controls_count,
                  })}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  requirement.priority === "critical"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : requirement.priority === "high"
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : requirement.priority === "medium"
                        ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                        : "border-gray-200 bg-gray-50 text-gray-700"
                }
              >
                {requirement.priority}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-8 space-y-1 border-l-2 border-gray-200 pl-4">
          {requirement.children.map((child) => (
            <RequirementTreeNode key={child.id} requirement={child} />
          ))}
        </div>
      )}
    </div>
  );
}
