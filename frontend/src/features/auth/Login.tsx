import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { getErrorMessage } from "../../api/client";
import { PublicLanguageSwitcher } from "../../components/layout/PublicLanguageSwitcher";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../hooks/useI18n";

export function Login() {
  const location = useLocation();
  const { login, isLoading, error } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const next = new URLSearchParams(location.search).get("next");
  const registerHref = next
    ? `/register?next=${encodeURIComponent(next)}`
    : "/register";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    login({ email, password });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <PublicLanguageSwitcher />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("auth.welcomeBack")}
          </CardTitle>
          <CardDescription>{t("auth.signInDescription")}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {getErrorMessage(error)}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t("auth.password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="rounded border-gray-300" />
                <span>{t("auth.rememberMe")}</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.signingIn")}
                </>
              ) : (
                t("auth.signIn")
              )}
            </Button>

            <p className="text-center text-sm text-gray-600">
              {t("auth.noAccount")}{" "}
              <Link
                to={registerHref}
                className="font-medium text-primary hover:underline"
              >
                {t("auth.signUp")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
