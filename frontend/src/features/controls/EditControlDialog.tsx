/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { controlsApi } from "../../api/controls";
import { organizationsApi } from "../../api/organizations";
import { teamApi } from "../../api/team";
import { getErrorMessage } from "../../api/client";
import { useI18n } from "../../hooks/useI18n";
import { useAuthStore } from "../../stores/authStore";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { getControlStatusLabel } from "../../lib/constants";
import type { AppliedControl } from "../../types/control.types";

interface EditControlDialogProps {
  control: AppliedControl;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditControlDialog({
  control,
  open,
  onClose,
  onSuccess,
}: EditControlDialogProps) {
  const { language, t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [formData, setFormData] = useState({
    status: control.status,
    implementation_notes: control.implementation_notes,
    effectiveness_rating: control.effectiveness_rating ?? 0,
    department: control.department ?? "",
    control_owner: control.control_owner ?? "",
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => organizationsApi.getDepartments(),
    enabled: open,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["company-members"],
    queryFn: () => teamApi.getCompanyMembers(),
    enabled: open,
  });

  const departments = departmentsData?.results ?? [];

  const updateMutation = useMutation({
    mutationFn: (
      data: Partial<AppliedControl> & {
        department?: string | null;
        control_owner?: string | null;
      },
    ) =>
      controlsApi.updateAppliedControl(control.id, data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateMutation.mutate({
      status: formData.status,
      implementation_notes: formData.implementation_notes,
      effectiveness_rating: formData.effectiveness_rating,
      department: formData.department || null,
      control_owner: formData.control_owner || null,
    });
  };

  const statuses = [
    "not_started",
    "in_progress",
    "implemented",
    "testing",
    "operational",
    "needs_improvement",
    "non_compliant",
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("controls.editDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("controls.editDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {updateMutation.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {getErrorMessage(updateMutation.error)}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("controls.status")}
            </label>
            <select
              value={formData.status}
              onChange={(event) =>
                setFormData({ ...formData, status: event.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {getControlStatusLabel(status, language)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("controls.editDialog.effectivenessRating")}
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.effectiveness_rating}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  effectiveness_rating: Number(event.target.value),
                })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("controls.department")}
            </label>
            <select
              value={formData.department}
              onChange={(event) => {
                const departmentId = event.target.value;
                const selectedDepartment = departments.find(
                  (department) => department.id === departmentId,
                );

                setFormData((current) => ({
                  ...current,
                  department: departmentId,
                  control_owner:
                    selectedDepartment?.manager ?? current.control_owner ?? user?.id ?? "",
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("controls.noValue")}</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.full_path}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("controls.detail.controlOwner")}
            </label>
            <select
              value={formData.control_owner}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  control_owner: event.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("controls.noValue")}</option>
              {members.map((member) => (
                <option key={member.id} value={member.user}>
                  {member.user_name || member.user_email || member.user}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("controls.editDialog.implementationNotes")}
            </label>
            <textarea
              value={formData.implementation_notes}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  implementation_notes: event.target.value,
                })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending
                ? t("controls.editDialog.saving")
                : t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
