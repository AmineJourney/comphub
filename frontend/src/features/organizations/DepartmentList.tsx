import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronRight, Edit, Plus, Search, Trash2, Users } from "lucide-react";
import { organizationsApi } from "@/api/organizations";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/useI18n";
import { useAuthStore } from "@/stores/authStore";
import type { Department } from "@/types/organizations.types";
import { CreateDepartmentDialog, EditDepartmentDialog } from "./DepartmentDialogs";

export function DepartmentList() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const isOwnerOrAdmin = useAuthStore((state) => state.isOwnerOrAdmin);
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  const { data: departmentsData, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => organizationsApi.getDepartments(),
  });

  const deleteMutation = useMutation({
    mutationFn: organizationsApi.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-tree"] });
    },
  });

  const departments = departmentsData?.results || [];
  const canCreateDepartments = hasPermission("create_any");
  const filteredDepartments = departments.filter(
    (department) =>
      department.name.toLowerCase().includes(search.toLowerCase()) ||
      department.description?.toLowerCase().includes(search.toLowerCase()) ||
      department.full_path.toLowerCase().includes(search.toLowerCase()),
  );

  const canEditDepartment = (department: Department) =>
    isOwnerOrAdmin() || (!!user && department.manager === user.id && hasPermission("update_own"));

  const canDeleteDepartment = (department: Department) =>
    isOwnerOrAdmin() || (!!user && department.manager === user.id && hasPermission("delete_own"));

  const handleDelete = (department: Department) => {
    if (window.confirm(t("departments.deleteConfirm", { name: department.name }))) {
      deleteMutation.mutate(department.id);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("departments.title")}</h1>
          <p className="mt-1 text-gray-600">{t("departments.subtitle")}</p>
        </div>
        {canCreateDepartments && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("departments.addDepartment")}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={t("departments.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatsCard
          title={t("departments.totalDepartments")}
          value={departments.length}
          icon={<Building2 className="h-8 w-8 text-primary" />}
        />
        <StatsCard
          title={t("departments.topLevel")}
          value={departments.filter((department) => !department.parent).length}
          icon={<Building2 className="h-8 w-8 text-blue-600" />}
          valueClassName="text-blue-600"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("departments.allDepartments")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredDepartments.map((department) => (
              <div
                key={department.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900">{department.name}</h3>
                    {department.children_count > 0 && (
                      <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700"
                      >
                        {t("departments.subDepartments", {
                          count: department.children_count,
                        })}
                      </Badge>
                    )}
                  </div>

                  {department.description && (
                    <p className="mt-1 text-sm text-gray-600">{department.description}</p>
                  )}

                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    {department.parent_name && (
                      <div className="flex items-center">
                        <ChevronRight className="mr-1 h-3 w-3" />
                        {t("departments.parent")}: {department.parent_name}
                      </div>
                    )}
                    {department.manager_email && (
                      <div className="flex items-center">
                        <Users className="mr-1 h-3 w-3" />
                        {t("departments.manager")}: {department.manager_email}
                      </div>
                    )}
                  </div>

                  {department.full_path !== department.name && (
                    <p className="mt-1 font-mono text-xs text-gray-400">
                      {department.full_path}
                    </p>
                  )}
                </div>

                {(canEditDepartment(department) || canDeleteDepartment(department)) && (
                  <div className="ml-4 flex items-center space-x-2">
                    {canEditDepartment(department) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDepartment(department)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteDepartment(department) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(department)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredDepartments.length === 0 && (
              <div className="py-12 text-center">
                <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600">
                  {search ? t("departments.noDepartmentsSearch") : t("departments.noDepartments")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showCreateDialog && canCreateDepartments && (
        <CreateDepartmentDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {editingDepartment && canEditDepartment(editingDepartment) && (
        <EditDepartmentDialog
          department={editingDepartment}
          open={!!editingDepartment}
          onClose={() => setEditingDepartment(null)}
        />
      )}
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  valueClassName = "text-gray-900",
}: {
  title: string;
  value: number;
  icon: ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className={`mt-1 text-2xl font-bold ${valueClassName}`}>{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
