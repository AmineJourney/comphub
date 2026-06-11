import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2, Plus } from "lucide-react";
import { authApi } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicLanguageSwitcher } from "@/components/layout/PublicLanguageSwitcher";
import { useI18n } from "@/hooks/useI18n";
import { useAuthStore } from "@/stores/authStore";

export function CompanySelector() {
  const navigate = useNavigate();
  const { setCompany } = useAuthStore();
  const { t } = useI18n();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: authApi.getCompanies,
  });

  const selectCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const [allCompanies, membershipsResponse] = await Promise.all([
        authApi.getCompanies(),
        authApi.getMemberships({ company: companyId }),
      ]);

      const selectedCompany = allCompanies.find((company) => company.id === companyId);
      if (!selectedCompany) {
        throw new Error(t("auth.selectCompany.companyNotFound"));
      }

      const membership = membershipsResponse.results[0];
      if (!membership) {
        throw new Error(t("auth.selectCompany.noMembership"));
      }

      return { company: selectedCompany, membership };
    },
    onSuccess: ({ company, membership }) => {
      setCompany(company, membership);
      navigate("/dashboard");
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const createCompanyMutation = useMutation({
    mutationFn: (name: string) => authApi.createCompany(name),
    onSuccess: ({ company, membership }) => {
      setCompany(company, membership);
      navigate("/dashboard");
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const handleSelectCompany = (companyId: string) => {
    setError(null);
    selectCompanyMutation.mutate(companyId);
  };

  const handleCreateCompany = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const name = newCompanyName.trim();
    if (!name) {
      setError(t("auth.selectCompany.companyNameRequired"));
      return;
    }

    createCompanyMutation.mutate(name);
  };

  const isBusy =
    selectCompanyMutation.isPending || createCompanyMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <PublicLanguageSwitcher />
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("auth.selectCompany.title")}
          </h1>
          <p className="mt-2 text-gray-600">{t("auth.selectCompany.subtitle")}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!showCreateForm && (
          <div className="space-y-4">
            {companies && companies.length > 0 ? (
              <>
                <div className="grid gap-3">
                  {companies.map((company) => (
                    <Card
                      key={company.id}
                      className="cursor-pointer border-2 transition-shadow hover:border-primary/50 hover:shadow-md"
                      onClick={() => handleSelectCompany(company.id)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900">
                            {company.name}
                          </p>
                          <p className="text-sm capitalize text-gray-500">
                            {company.plan} {t("common.planSuffix").toLowerCase()}
                          </p>
                        </div>
                        {selectCompanyMutation.isPending && (
                          <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-primary" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t("auth.selectCompany.createAnotherCompany")}
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t("auth.selectCompany.createFirstCompany")}</CardTitle>
                  <CardDescription>
                    {t("auth.selectCompany.getStartedCompany")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCompany} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">
                        {t("auth.selectCompany.companyName")}
                      </Label>
                      <Input
                        id="company-name"
                        value={newCompanyName}
                        onChange={(event) => setNewCompanyName(event.target.value)}
                        placeholder="Acme Corp"
                        disabled={isBusy}
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isBusy}>
                      {createCompanyMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("auth.selectCompany.creating")}
                        </>
                      ) : (
                        t("auth.selectCompany.createCompany")
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>{t("auth.selectCompany.createNewCompany")}</CardTitle>
              <CardDescription>{t("auth.selectCompany.ownerHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-company-name">
                    {t("auth.selectCompany.companyName")}
                  </Label>
                  <Input
                    id="new-company-name"
                    value={newCompanyName}
                    onChange={(event) => setNewCompanyName(event.target.value)}
                    placeholder="Acme Corp"
                    disabled={isBusy}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewCompanyName("");
                      setError(null);
                    }}
                    disabled={isBusy}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isBusy}>
                    {createCompanyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth.selectCompany.creating")}
                      </>
                    ) : (
                      t("auth.selectCompany.createCompany")
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
