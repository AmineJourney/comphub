import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileText, Filter, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { processesApi } from "../../api/processes";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useI18n } from "../../hooks/useI18n";
import type { Process } from "../../types/process.types";
import { ProcessFormDialog } from "./ProcessFormDialog";

const statusStyles: Record<Process["status"], string> = {
  draft: "bg-gray-100 text-gray-800",
  in_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  archived: "bg-slate-100 text-slate-700",
};

export function ProcessList() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["processes", page, search, status],
    queryFn: () =>
      processesApi.getProcesses({
        page,
        page_size: 20,
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const statuses: Process["status"][] = [
    "draft",
    "in_review",
    "approved",
    "archived",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("process.title")}
          </h1>
          <p className="mt-1 text-gray-600">{t("process.subtitle")}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("process.addProcess")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={t("process.searchPlaceholder")}
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
              <span className="text-sm text-gray-600">
                {t("process.status.label")}
              </span>
              <Button
                variant={!status ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatus("");
                  setPage(1);
                }}
              >
                {t("common.all")}
              </Button>
              {statuses.map((item) => (
                <Button
                  key={item}
                  variant={status === item ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStatus(status === item ? "" : item);
                    setPage(1);
                  }}
                >
                  {t(`process.status.${item}`)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("process.cards")}</CardTitle>
          <CardDescription>
            {t("process.cardsFound", { count: data?.count ?? 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : data?.results.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">{t("process.noProcessesFound")}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("process.addFirstProcess")}
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("process.process")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("process.type")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("process.department")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("process.responsible")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        {t("process.status.label")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">
                        {t("risk.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.results.map((process) => (
                      <tr
                        key={process.id}
                        className="border-b transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {process.reference}
                          </p>
                          <p className="max-w-sm truncate text-sm text-gray-600">
                            {process.title}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {process.process_type || t("risk.noValue")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {process.department_name || t("risk.noValue")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {process.responsible_email || t("risk.noValue")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusStyles[process.status]}>
                            {t(`process.status.${process.status}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/processes/${process.id}`)}
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

              {(data?.count ?? 0) > 20 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {t("risk.showingResults", {
                      start: (page - 1) * 20 + 1,
                      end: Math.min(page * 20, data?.count ?? 0),
                      total: data?.count ?? 0,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      disabled={!data?.previous}
                    >
                      {t("common.previous")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={!data?.next}
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

      <ProcessFormDialog
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
