import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle,
  Loader2,
  LogIn,
  Shield,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { authApi } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { teamApi } from "@/api/team";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicLanguageSwitcher } from "@/components/layout/PublicLanguageSwitcher";
import { useI18n } from "@/hooks/useI18n";
import { useAuthStore } from "@/stores/authStore";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  manager: "bg-indigo-100 text-indigo-800 border-indigo-200",
  analyst: "bg-green-100 text-green-800 border-green-200",
  auditor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  viewer: "bg-gray-100 text-gray-800 border-gray-200",
};

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, setCompany } = useAuthStore();
  const { t, formatDate } = useI18n();
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () => teamApi.previewInvitation(token!),
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => teamApi.acceptInvitation(token!),
    onSuccess: async (data) => {
      try {
        const memberships = await authApi.getMemberships({
          company: data.company.id,
        });
        const membership = memberships.results[0];
        if (membership) {
          setCompany(data.company, membership);
        }
      } catch {
        // The user can still select the company manually if this refresh fails.
      }
      setAccepted(true);
    },
    onError: (error) => {
      setAcceptError(getErrorMessage(error));
    },
  });

  useEffect(() => {
    if (!accepted) return undefined;
    const timeout = setTimeout(() => navigate("/dashboard"), 2500);
    return () => clearTimeout(timeout);
  }, [accepted, navigate]);

  const redirectToLogin = () => navigate(`/login?next=/invite/${token}`);
  const redirectToRegister = () => navigate(`/register?next=/invite/${token}`);

  if (!token) {
    return <InviteError message={t("auth.invite.invalidToken")} />;
  }

  if (previewLoading) {
    return (
      <InviteShell>
        <div className="flex flex-col items-center gap-3 py-8 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">{t("auth.invite.loading")}</p>
        </div>
      </InviteShell>
    );
  }

  if (previewError || !preview) {
    return <InviteError message={t("auth.invite.invalid")} />;
  }

  if (!preview.is_valid) {
    return (
      <InviteError
        message={
          preview.is_valid === false
            ? t("auth.invite.expired")
            : t("auth.invite.noLongerValid")
        }
      />
    );
  }

  if (accepted) {
    return (
      <InviteShell>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <CheckCircle className="h-14 w-14 text-green-500" />
          <h2 className="text-xl font-semibold text-gray-900">
            {t("auth.invite.joined", { company: preview.company_name })}
          </h2>
          <p className="text-sm text-gray-500">
            {t("auth.invite.redirectingDashboard")}
          </p>
          <Button onClick={() => navigate("/dashboard")} className="mt-2">
            {t("auth.invite.goToDashboard")}
          </Button>
        </div>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <div className="flex flex-col items-center gap-2 pb-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          {t("auth.invite.invitedToJoin")}
        </h2>
        <p className="text-2xl font-semibold text-primary">
          {preview.company_name}
        </p>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-gray-500">{t("auth.invite.as")}</span>
          <Badge
            variant="outline"
            className={`capitalize text-sm ${ROLE_COLORS[preview.role] ?? ""}`}
          >
            {t(`roles.${preview.role}`)}
          </Badge>
        </div>

        <p className="mt-1 text-xs text-gray-400">
          {t("auth.invite.invitedBy")} <strong>{preview.invited_by_name}</strong>
          {" - "}
          {t("auth.invite.expires")}{" "}
          {formatDate(preview.expires_at, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        {preview.email && (
          <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-600">
            {t("auth.invite.restrictedTo", { email: preview.email })}
          </p>
        )}
      </div>

      {acceptError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {acceptError}
        </div>
      )}

      {isAuthenticated ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <UserCheck className="h-4 w-4 flex-shrink-0" />
            <span>{t("auth.invite.signedInAs", { email: user?.email ?? "" })}</span>
          </div>

          <Button
            className="w-full"
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.invite.joining")}
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("auth.invite.acceptAndJoin", { company: preview.company_name })}
              </>
            )}
          </Button>

          <p className="text-center text-xs text-gray-400">
            {t("auth.invite.notEmail", { email: user?.email ?? "" })}{" "}
            <button
              className="text-primary underline underline-offset-2"
              onClick={redirectToLogin}
            >
              {t("auth.invite.signInDifferent")}
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-gray-600">
            {t("auth.invite.guestPrompt")}
          </p>

          <Button className="w-full" onClick={redirectToLogin}>
            <LogIn className="mr-2 h-4 w-4" />
            {t("auth.invite.signInToAccept")}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={redirectToRegister}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t("auth.invite.createAccountAndAccept")}
          </Button>
        </div>
      )}
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <PublicLanguageSwitcher />
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-2 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Shield className="h-5 w-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-base font-medium text-gray-500">
            {t("auth.invite.shellTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="justify-center">
          <p className="text-xs text-gray-400">
            {t("auth.invite.alreadyHaveAccess")}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {t("auth.invite.goToLogin")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function InviteError({ message }: { message: string }) {
  const { t } = useI18n();

  return (
    <InviteShell>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <XCircle className="h-12 w-12 text-red-400" />
        <h2 className="text-lg font-semibold text-gray-900">
          {t("auth.invite.invalidInvitation")}
        </h2>
        <p className="text-sm text-gray-500">{message}</p>
        <Button asChild className="mt-2">
          <Link to="/login">{t("auth.invite.backToLogin")}</Link>
        </Button>
      </div>
    </InviteShell>
  );
}
