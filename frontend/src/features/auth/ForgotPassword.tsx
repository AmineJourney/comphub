import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  Copy,
  Loader2,
  Mail,
  Shield,
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

export function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: authApi.requestPasswordReset,
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.reset_link) {
        setResetLink(data.reset_link);
      }
    },
  });

  const handleCopy = () => {
    if (!resetLink) return;
    navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    mutation.mutate(email.trim().toLowerCase());
  };

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
          <CardTitle className="text-2xl font-bold">
            {submitted
              ? t("auth.forgotPasswordFlow.submittedTitle")
              : t("auth.forgotPasswordFlow.title")}
          </CardTitle>
          <CardDescription>
            {submitted
              ? t("auth.forgotPasswordFlow.submittedDescription")
              : t("auth.forgotPasswordFlow.description")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mutation.error && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {getErrorMessage(mutation.error)}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  {t("auth.forgotPasswordFlow.emailAddress")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.forgotPasswordFlow.sending")}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    {t("auth.forgotPasswordFlow.sendResetLink")}
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-sm text-gray-600">
                  {t("auth.forgotPasswordFlow.sentTo")} <strong>{email}</strong>
                </p>
              </div>

              {resetLink && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    {t("auth.forgotPasswordFlow.devModeBanner")}
                  </p>
                  <p className="text-xs text-amber-700">
                    {t("auth.forgotPasswordFlow.devModeBody")}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded border border-amber-200 bg-white px-2 py-1.5 font-mono text-xs text-gray-700">
                      {resetLink}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      className="flex-shrink-0 gap-1"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? t("common.copied") : t("common.copy")}
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600">
                    {t("auth.forgotPasswordFlow.devModeFooter")}
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSubmitted(false);
                  setResetLink(null);
                  setEmail("");
                  mutation.reset();
                }}
              >
                {t("auth.forgotPasswordFlow.tryDifferentEmail")}
              </Button>
            </div>
          )}
        </CardContent>

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
