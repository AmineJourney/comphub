import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { unifiedControlsApi } from "../../api/unified-controls";
import { getErrorMessage } from "../../api/client";
import { useI18n } from "../../hooks/useI18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";

export function UnifiedControlBrowser() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string | undefined>();

  const {
    data: controls,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["unifiedControls", search, selectedDomain],
    queryFn: () =>
      unifiedControlsApi.getUnifiedControls({
        search,
        domain: selectedDomain,
        page_size: 50,
      }),
  });

  const domains = React.useMemo(() => {
    const domainSet = new Set<string>();
    controls?.results.forEach((control) => domainSet.add(control.domain));
    return Array.from(domainSet);
  }, [controls]);

  const items = controls?.results ?? [];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("controls.unified.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-600">{getErrorMessage(error)}</p>
          <p className="text-sm text-gray-500">
            {t("controls.unified.apiUnavailable")}
          </p>
          <Button onClick={() => refetch()}>{t("common.retry")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("controls.unified.title")}</h2>
        <p className="text-gray-600">{t("controls.unified.subtitle")}</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder={t("controls.unified.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={!selectedDomain ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedDomain(undefined)}
        >
          {t("controls.unified.allDomains")}
        </Badge>
        {domains.map((domain) => (
          <Badge
            key={domain}
            variant={selectedDomain === domain ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedDomain(domain)}
          >
            {domain}
          </Badge>
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500">
            {t("controls.unified.noControlsFound")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((control) => (
            <Card key={control.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">
                      {control.control_code}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {control.control_name}
                    </p>
                  </div>
                  <Badge variant="outline">{control.domain}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                  {control.description}
                </p>

                {control.framework_coverage &&
                  control.framework_coverage.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        {t("controls.unified.satisfies")}
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {control.framework_coverage.map((framework) => (
                          <Badge
                            key={framework}
                            variant="secondary"
                            className="text-xs"
                          >
                            {framework}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {t("controls.unified.complexity", {
                      value: control.implementation_complexity ?? t("common.unknown"),
                    })}
                  </span>
                  <span>
                    {t("controls.unified.companies", {
                      count: control.implementation_count ?? 0,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
