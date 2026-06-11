import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Shield,
  XCircle,
} from "lucide-react";
import { authApi } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicLanguageSwitcher } from "@/components/layout/PublicLanguageSwitcher";
import { useI18n } from "@/hooks/useI18n";

export function ResetPassword() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    data: tokenCheck,
    isLoading: tokenLoading,
    error: tokenError,
  } = useQuery({
    queryKey: ["reset-token-valid", token],
    queryFn: () => authApi.validateResetToken(token),
    enabled: !!token,
    retry: false,
  });

  const resetMutation = useMutation({
    mutationFn: authApi.confirmPasswordReset,
    onSuccess: () => setSuccess(true),
  });

  useEffect(() => {
    if (!success) return undefined;
    const timeout = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(timeout);
  }, [success, navigate]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (newPassword.length < 8) {
      setLocalError(t("auth.resetPasswordFlow.tooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError(t("auth.resetPasswordFlow.mismatch"));
      return;
    }

    resetMutation.mutate({
      token,
      new_password: newPassword,
      new_password_confirm: confirmPassword,
    });
  };

  if (!token) {
    return <ErrorState message={t("auth.resetPasswordFlow.missingToken")} />;
  }

  if (tokenLoading) {
    return (
      <Shell title={t("auth.resetPasswordFlow.verifying")} description="">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (tokenError || tokenCheck?.valid === false) {
    return <ErrorState message={t("auth.resetPasswordFlow.invalidLink")} />;
  }

  if (success) {
    return (
      <Shell
        title={t("auth.resetPasswordFlow.successTitle")}
        description={t("auth.resetPasswordFlow.successDescription")}
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle className="h-14 w-14 text-green-500" />
          <p className="text-sm text-gray-500">
            {t("auth.resetPasswordFlow.redirectingLogin")}
          </p>
          <Button onClick={() => navigate("/login")}>
            {t("auth.resetPasswordFlow.goToLogin")}
          </Button>
        </div>
      </Shell>
    );
  }

  const apiError = resetMutation.error
    ? getErrorMessage(resetMutation.error)
    : null;

  return (
    <Shell
      title={t("auth.resetPasswordFlow.title")}
      description={t("auth.resetPasswordFlow.description")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(localError || apiError) && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {localError ?? apiError}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="new-password">{t("auth.resetPasswordFlow.newPassword")}</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.resetPasswordFlow.minCharacters")}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              autoFocus
              className="pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <PasswordStrength password={newPassword} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">
            {t("auth.resetPasswordFlow.confirmNewPassword")}
          </Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              placeholder={t("auth.resetPasswordFlow.repeatPassword")}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-600">
              {t("auth.resetPasswordFlow.passwordsDontMatchYet")}
            </p>
          )}
          {confirmPassword &&
            newPassword === confirmPassword &&
            newPassword.length >= 8 && (
              <p className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                {t("auth.resetPasswordFlow.passwordsMatch")}
              </p>
            )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("auth.resetPasswordFlow.resetting")}
            </>
          ) : (
            <>
              <KeyRound className="mr-2 h-4 w-4" />
              {t("auth.resetPasswordFlow.resetPassword")}
            </>
          )}
        </Button>
      </form>
    </Shell>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const { t } = useI18n();

  if (!password) return null;

  const checks = [
    { label: t("auth.resetPasswordFlow.strength.chars"), pass: password.length >= 8 },
    { label: t("auth.resetPasswordFlow.strength.uppercase"), pass: /[A-Z]/.test(password) },
    { label: t("auth.resetPasswordFlow.strength.number"), pass: /[0-9]/.test(password) },
    { label: t("auth.resetPasswordFlow.strength.symbol"), pass: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((check) => check.pass).length;
  const colors = [
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
    "bg-green-500",
  ];
  const labels = [
    "",
    t("auth.resetPasswordFlow.strength.weak"),
    t("auth.resetPasswordFlow.strength.fair"),
    t("auth.resetPasswordFlow.strength.good"),
    t("auth.resetPasswordFlow.strength.strong"),
  ];

  return (
    <div className="mt-1 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index < score ? colors[score] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {checks.map((check) => (
            <span
              key={check.label}
              className={`text-xs ${check.pass ? "text-green-600" : "text-gray-400"}`}
            >
              {check.pass ? "OK" : "."} {check.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span
            className={`text-xs font-medium ${colors[score].replace("bg-", "text-")}`}
          >
            {labels[score]}
          </span>
        )}
      </div>
    </div>
  );
}

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <PublicLanguageSwitcher />
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="justify-center">
          <Link
            to="/login"
            className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("common.backToLogin")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const { t } = useI18n();

  return (
    <Shell title={t("auth.resetPasswordFlow.invalidInviteTitle")} description="">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <XCircle className="h-12 w-12 text-red-400" />
        <p className="text-sm text-gray-600">{message}</p>
        <Button asChild>
          <Link to="/forgot-password">
            {t("auth.resetPasswordFlow.requestNewResetLink")}
          </Link>
        </Button>
      </div>
    </Shell>
  );
}
