/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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

interface CreateRiskDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateRiskDialog({
  open,
  onClose,
  onSuccess,
}: CreateRiskDialogProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    risk_category: "operational",
    risk_source: "internal" as "internal" | "external" | "both",
    inherent_likelihood: 3,
    inherent_impact: 3,
    treatment_strategy: "mitigate" as
      | "mitigate"
      | "transfer"
      | "accept"
      | "avoid",
    potential_causes: "",
    potential_consequences: "",
  });

  const { data: matrix } = useQuery({
    queryKey: ["active-risk-matrix"],
    queryFn: riskApi.getActiveMatrix,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: riskApi.createRisk,
    onSuccess: () => {
      onSuccess();
      setFormData({
        title: "",
        description: "",
        risk_category: "operational",
        risk_source: "internal",
        inherent_likelihood: 3,
        inherent_impact: 3,
        treatment_strategy: "mitigate",
        potential_causes: "",
        potential_consequences: "",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const categories = [
    "strategic",
    "operational",
    "financial",
    "compliance",
    "reputational",
    "technology",
    "security",
    "environmental",
    "legal",
  ];

  const maxLikelihood = matrix?.likelihood_levels || 5;
  const maxImpact = matrix?.impact_levels || 5;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("risk.dialogs.create.title")}</DialogTitle>
          <DialogDescription>
            {t("risk.dialogs.create.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {createMutation.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {getErrorMessage(createMutation.error)}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("risk.dialogs.create.riskTitle")} *</label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder={t("risk.dialogs.create.titlePlaceholder")}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("evidence.upload.descriptionLabel")} *</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("risk.dialogs.create.descriptionPlaceholder")}
              required
            />
          </div>

          {/* Category and Source */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("risk.category")} *</label>
              <select
                value={formData.risk_category}
                onChange={(e) =>
                  setFormData({ ...formData, risk_category: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`risk.categories.${cat}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("risk.dialogs.create.source")} *</label>
              <select
                value={formData.risk_source}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    risk_source: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="internal">{t("risk.sources.internal")}</option>
                <option value="external">{t("risk.sources.external")}</option>
                <option value="both">{t("risk.sources.both")}</option>
              </select>
            </div>
          </div>

          {/* Inherent Risk Assessment */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900">
              {t("risk.dialogs.create.inherentAssessment")}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("risk.dialogs.create.likelihood", { max: maxLikelihood })} *
                </label>
                <Input
                  type="number"
                  min="1"
                  max={maxLikelihood}
                  value={formData.inherent_likelihood}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inherent_likelihood: parseInt(e.target.value),
                    })
                  }
                  required
                />
                <p className="text-xs text-gray-500">
                  {t("risk.dialogs.create.likelihoodHelp")}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("risk.dialogs.create.impact", { max: maxImpact })} *
                </label>
                <Input
                  type="number"
                  min="1"
                  max={maxImpact}
                  value={formData.inherent_impact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inherent_impact: parseInt(e.target.value),
                    })
                  }
                  required
                />
                <p className="text-xs text-gray-500">
                  {t("risk.dialogs.create.impactHelp")}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{t("risk.dialogs.create.calculatedScore")}:</span>{" "}
                {formData.inherent_likelihood * formData.inherent_impact}
              </p>
            </div>
          </div>

          {/* Treatment Strategy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("risk.dialogs.create.treatmentStrategy")} *</label>
            <select
              value={formData.treatment_strategy}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  treatment_strategy: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="mitigate">{t("risk.treatments.mitigate")}</option>
              <option value="transfer">{t("risk.treatments.transfer")}</option>
              <option value="accept">{t("risk.treatments.accept")}</option>
              <option value="avoid">{t("risk.treatments.avoid")}</option>
            </select>
          </div>

          {/* Potential Causes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("risk.dialogs.create.potentialCauses")}</label>
            <textarea
              value={formData.potential_causes}
              onChange={(e) =>
                setFormData({ ...formData, potential_causes: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("risk.dialogs.create.causesPlaceholder")}
            />
          </div>

          {/* Potential Consequences */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("risk.dialogs.create.potentialConsequences")}
            </label>
            <textarea
              value={formData.potential_consequences}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  potential_consequences: e.target.value,
                })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("risk.dialogs.create.consequencesPlaceholder")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending
                ? t("risk.dialogs.create.creating")
                : t("risk.dialogs.create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
