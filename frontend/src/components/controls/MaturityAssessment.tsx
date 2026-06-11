import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unifiedControlsApi } from "../../api/unified-controls";
import { useI18n } from "../../hooks/useI18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { AppliedControl } from "../../types/control.types";

interface MaturityAssessmentProps {
  appliedControl: AppliedControl;
}

type MaturityLevel = 1 | 2 | 3 | 4 | 5;

export function MaturityAssessment({
  appliedControl,
}: MaturityAssessmentProps) {
  const { t } = useI18n();
  const initialLevel: MaturityLevel = appliedControl.maturity_level ?? 1;
  const targetLevel: MaturityLevel = appliedControl.maturity_target_level ?? 1;

  const maturityLevels: Array<{
    level: MaturityLevel;
    label: string;
    color: string;
  }> = [
    {
      level: 1,
      label: t("controls.maturity.level1"),
      color: "bg-red-100 text-red-800",
    },
    {
      level: 2,
      label: t("controls.maturity.level2"),
      color: "bg-orange-100 text-orange-800",
    },
    {
      level: 3,
      label: t("controls.maturity.level3"),
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      level: 4,
      label: t("controls.maturity.level4"),
      color: "bg-blue-100 text-blue-800",
    },
    {
      level: 5,
      label: t("controls.maturity.level5"),
      color: "bg-green-100 text-green-800",
    },
  ];

  const [selectedLevel, setSelectedLevel] = useState<MaturityLevel>(
    initialLevel,
  );
  const [notes, setNotes] = useState(appliedControl.maturity_notes || "");
  const queryClient = useQueryClient();

  const assessMutation = useMutation({
    mutationFn: (data: {
      maturity_level: MaturityLevel;
      maturity_notes: string;
    }) => unifiedControlsApi.assessMaturity(appliedControl.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appliedControls"] });
      queryClient.invalidateQueries({ queryKey: ["maturitySummary"] });
    },
  });

  const handleAssess = () => {
    assessMutation.mutate({
      maturity_level: selectedLevel,
      maturity_notes: notes,
    });
  };

  const currentLevelInfo = maturityLevels.find(
    (levelInfo) => levelInfo.level === initialLevel,
  );
  const targetLevelInfo = maturityLevels.find(
    (levelInfo) => levelInfo.level === targetLevel,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            {t("controls.maturity.current")}
          </label>
          <Badge className={currentLevelInfo?.color ?? "bg-gray-100 text-gray-700"}>
            {currentLevelInfo?.label ?? t("controls.maturity.level1")}
          </Badge>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            {t("controls.maturity.target")}
          </label>
          <Badge className={targetLevelInfo?.color ?? "bg-gray-100 text-gray-700"}>
            {targetLevelInfo?.label ?? t("controls.maturity.level1")}
          </Badge>
        </div>
      </div>

      {appliedControl.maturity_criteria && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              {t("controls.maturity.currentCriteria")}
            </h4>
            <p className="text-sm text-blue-800">
              {appliedControl.maturity_criteria.current_criteria}
            </p>
          </div>

          {appliedControl.maturity_criteria.next_level <= 5 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">
                {t("controls.maturity.nextCriteria", {
                  level: appliedControl.maturity_criteria.next_level,
                })}
              </h4>
              <p className="text-sm text-green-800">
                {appliedControl.maturity_criteria.next_criteria}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 border-t pt-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            {t("controls.maturity.assessLabel")}
          </label>
          <div className="grid grid-cols-5 gap-2">
            {maturityLevels.map((levelInfo) => (
              <button
                key={levelInfo.level}
                onClick={() => setSelectedLevel(levelInfo.level)}
                className={`
                  p-3 rounded-lg text-center transition-all
                  ${
                    selectedLevel === levelInfo.level
                      ? "ring-2 ring-primary scale-105"
                      : "hover:scale-102"
                  }
                  ${levelInfo.color}
                `}
              >
                <div className="font-bold">L{levelInfo.level}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            {t("controls.maturity.assessmentNotes")}
          </label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t("controls.maturity.notesPlaceholder")}
            rows={4}
          />
        </div>

        <Button
          onClick={handleAssess}
          disabled={assessMutation.isPending}
          className="w-full"
        >
          {assessMutation.isPending
            ? t("controls.maturity.saving")
            : t("controls.maturity.saveAssessment")}
        </Button>
      </div>
    </div>
  );
}
