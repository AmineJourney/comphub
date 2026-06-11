// src/features/organizations/CreateDepartmentDialog.tsx
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { organizationsApi } from "@/api/organizations";
import { teamApi } from "@/api/team";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import type { UpdateDepartmentRequest } from "@/types/organizations.types";
import { useI18n } from "@/hooks/useI18n";

interface CreateDepartmentDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateDepartmentDialog({
  open,
  onClose,
}: CreateDepartmentDialogProps) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parent, setParent] = useState<string | undefined>();
  const [manager, setManager] = useState<string | undefined>(user?.id);
  const [error, setError] = useState<string | null>(null);

  // Fetch departments for parent selection
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

  const createMutation = useMutation({
    mutationFn: organizationsApi.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-tree"] });
      handleClose();
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("departments.dialog.nameRequired"));
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      parent: parent || undefined,
      manager: manager || undefined,
    });
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setParent(undefined);
    setManager(user?.id);
    setError(null);
    onClose();
  };

  const departments = departmentsData?.results || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("departments.dialog.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("departments.dialog.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("departments.dialog.name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("departments.dialog.namePlaceholder")}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("departments.dialog.description")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("departments.dialog.descriptionPlaceholder")}
                rows={3}
              />
            </div>

            {/* Parent Department */}
            <div className="space-y-2">
              <Label htmlFor="parent">{t("departments.dialog.parentDepartment")}</Label>
              <Select
                value={parent || "none"}
                onValueChange={(val) =>
                  setParent(val === "none" ? undefined : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("departments.dialog.noParentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("departments.dialog.noParent")}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.full_path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {t("departments.dialog.parentHelp")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager">{t("departments.dialog.departmentManager")}</Label>
              <Select
                value={manager || "unassigned"}
                onValueChange={(val) =>
                  setManager(val === "unassigned" ? undefined : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("departments.dialog.unassigned")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">{t("departments.dialog.unassigned")}</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.user}>
                      {member.user_name || member.user_email || member.user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("departments.dialog.createSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// src/features/organizations/EditDepartmentDialog.tsx
import type { Department } from "@/types/organizations.types";

interface EditDepartmentDialogProps {
  department: Department;
  open: boolean;
  onClose: () => void;
}

export function EditDepartmentDialog({
  department,
  open,
  onClose,
}: EditDepartmentDialogProps) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [name, setName] = useState(department.name);
  const [description, setDescription] = useState(department.description || "");
  const [parent, setParent] = useState<string | undefined>(department.parent);
  const [manager, setManager] = useState<string | undefined>(department.manager);
  const [error, setError] = useState<string | null>(null);

  // Fetch departments for parent selection
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

  const updateMutation = useMutation({
    mutationFn: (data: UpdateDepartmentRequest) =>
      organizationsApi.updateDepartment(department.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-tree"] });
      queryClient.invalidateQueries({
        queryKey: ["department", department.id],
      });
      handleClose();
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("departments.dialog.nameRequired"));
      return;
    }

    updateMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      parent: parent || undefined,
      manager: manager || undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const departments = (departmentsData?.results || []).filter(
    (dept) => dept.id !== department.id, // Don't allow setting self as parent
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("departments.dialog.editTitle")}</DialogTitle>
            <DialogDescription>{t("departments.dialog.editDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                {t("departments.dialog.name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t("departments.dialog.description")}</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Parent Department */}
            <div className="space-y-2">
              <Label htmlFor="edit-parent">{t("departments.dialog.parentDepartment")}</Label>
              <Select
                value={parent || "none"}
                onValueChange={(val) =>
                  setParent(val === "none" ? undefined : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("departments.dialog.noParentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("departments.dialog.noParent")}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.full_path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-manager">{t("departments.dialog.departmentManager")}</Label>
              <Select
                value={manager || "unassigned"}
                onValueChange={(val) =>
                  setManager(val === "unassigned" ? undefined : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("departments.dialog.unassigned")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">{t("departments.dialog.unassigned")}</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.user}>
                      {member.user_name || member.user_email || member.user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
