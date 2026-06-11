import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle,
  ExternalLink,
  FileText,
  Search,
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
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/useI18n";

export function FrameworkList() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [search, setSearch] = useState("");

  const { data: frameworksData, isLoading } = useQuery({
    queryKey: ["frameworks"],
    queryFn: () => libraryApi.getFrameworks(),
  });

  const frameworks = frameworksData?.results || [];
  const filteredFrameworks = frameworks.filter((framework) =>
    framework.code.toLowerCase().includes(search.toLowerCase()) ||
    framework.name.toLowerCase().includes(search.toLowerCase()) ||
    framework.issuing_organization.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("library.title")}</h1>
        <p className="mt-1 text-gray-600">{t("library.subtitle")}</p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t("library.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("library.totalFrameworks")}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {frameworks.length}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("library.totalRequirements")}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {frameworks.reduce((sum, framework) => sum + framework.requirement_count, 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("library.activeFrameworks")}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {frameworks.filter((framework) => framework.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredFrameworks.map((framework) => (
          <Card
            key={framework.id}
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => navigate(`/library/frameworks/${framework.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{framework.code}</CardTitle>
                  <CardDescription className="mt-1">{framework.name}</CardDescription>
                </div>
                {framework.is_active && (
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-700"
                  >
                    {t("library.active")}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t("library.version")}</span>
                <span className="font-medium text-gray-900">{framework.version}</span>
              </div>

              {framework.issuing_organization && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t("library.issuedBy")}</span>
                  <span className="ml-2 truncate font-medium text-gray-900">
                    {framework.issuing_organization}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t("library.requirements")}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {framework.requirement_count}
                  </span>
                  <span className="text-gray-500">
                    ({framework.mandatory_requirement_count} {t("library.mandatorySuffix")})
                  </span>
                </div>
              </div>

              {framework.documentation_url && (
                <a
                  href={framework.documentation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-primary hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  {t("library.officialDocumentation")}
                </a>
              )}

              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/library/frameworks/${framework.id}`);
                }}
              >
                {t("library.viewDetails")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFrameworks.length === 0 && (
        <div className="py-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">{t("library.noFrameworksFound")}</p>
        </div>
      )}
    </div>
  );
}
