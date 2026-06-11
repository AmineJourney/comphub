/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { riskApi } from "../../api/risk";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { getErrorMessage } from "../../api/client";
import { useI18n } from "../../hooks/useI18n";

interface AddTreatmentActionDialogProps {
  riskId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTreatmentActionDialog({
  riskId,
  open,
  onClose,
  onSuccess,
}: AddTreatmentActionDialogProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    action_title: "",
    action_description: "",
    action_type: "implement_control",
    due_date: "",
    estimated_cost: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      riskApi.createTreatmentAction({ ...data, risk: riskId }),
    onSuccess: () => {
      onSuccess();
      setFormData({
        action_title: "",
        action_description: "",
        action_type: "implement_control",
        due_date: "",
        estimated_cost: "",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      action_title: formData.action_title,
      action_description: formData.action_description,
      action_type: formData.action_type,
      due_date: formData.due_date,
    };

    if (formData.estimated_cost) {
      data.estimated_cost = parseFloat(formData.estimated_cost);
    }

    createMutation.mutate(data);
  };

  const actionTypes = [
    { value: "implement_control", labelKey: "risk.actionTypes.implementControl" },
    { value: "improve_control", labelKey: "risk.actionTypes.improveControl" },
    { value: "transfer_risk", labelKey: "risk.actionTypes.transferRisk" },
    { value: "policy_change", labelKey: "risk.actionTypes.policyChange" },
    { value: "training", labelKey: "risk.actionTypes.training" },
    { value: "technology", labelKey: "risk.actionTypes.technology" },
    { value: "other", labelKey: "risk.actionTypes.other" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("risk.dialogs.treatment.title")}</DialogTitle>
          <DialogDescription>
            {t("risk.dialogs.treatment.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {createMutation.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {getErrorMessage(createMutation.error)}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("risk.dialogs.treatment.actionTitle")} *</label>
            <Input
              value={formData.action_title}
              onChange={(e) =>
                setFormData({ ...formData, action_title: e.target.value })
              }
              placeholder={t("risk.dialogs.treatment.titlePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("evidence.upload.descriptionLabel")} *</label>
            <textarea
              value={formData.action_description}
              onChange={(e) =>
                setFormData({ ...formData, action_description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("risk.dialogs.treatment.descriptionPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("risk.dialogs.treatment.actionType")} *</label>
            <select
              value={formData.action_type}
              onChange={(e) =>
                setFormData({ ...formData, action_type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {actionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {t(type.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("risk.dialogs.treatment.dueDate")} *</label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) =>
                setFormData({ ...formData, due_date: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("risk.dialogs.treatment.estimatedCost")}
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.estimated_cost}
              onChange={(e) =>
                setFormData({ ...formData, estimated_cost: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending
                ? t("risk.dialogs.create.creating")
                : t("risk.dialogs.treatment.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
