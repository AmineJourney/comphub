import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle, Loader2, Shield } from "lucide-react";
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
import { getErrorMessage } from "@/api/client";
import { PublicLanguageSwitcher } from "@/components/layout/PublicLanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";

export function Register() {
  const location = useLocation();
  const { register, isLoading, error } = useAuth();
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>(
    {},
  );
  const [success] = useState(false);

  const next = new URLSearchParams(location.search).get("next");
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = t("auth.validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t("auth.validation.emailInvalid");
    }

    if (!formData.username) {
      errors.username = t("auth.validation.usernameRequired");
    } else if (formData.username.length < 3) {
      errors.username = t("auth.validation.usernameShort");
    }

    if (!formData.first_name) {
      errors.first_name = t("auth.validation.firstNameRequired");
    }

    if (!formData.last_name) {
      errors.last_name = t("auth.validation.lastNameRequired");
    }

    if (!formData.password) {
      errors.password = t("auth.validation.passwordRequired");
    } else if (formData.password.length < 8) {
      errors.password = t("auth.validation.passwordShort");
    }

    if (!formData.password_confirm) {
      errors.password_confirm = t("auth.validation.passwordConfirmRequired");
    } else if (formData.password !== formData.password_confirm) {
      errors.password_confirm = t("auth.validation.passwordsMismatch");
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    register(formData);
  };

  const handleChange =
    (field: keyof typeof formData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: event.target.value });
      if (validationErrors[field]) {
        setValidationErrors({ ...validationErrors, [field]: "" });
      }
    };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {t("auth.accountCreated")}
            </CardTitle>
            <CardDescription>
              {t("auth.accountCreatedDescription")}
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center">
            <p className="text-gray-600">{t("auth.accountCreatedBody")}</p>
          </CardContent>

          <CardFooter>
            <Link to={loginHref} className="w-full">
              <Button className="w-full">{t("auth.continueToSignIn")}</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <PublicLanguageSwitcher />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("auth.createAccount")}
          </CardTitle>
          <CardDescription>{t("auth.registerDescription")}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {getErrorMessage(error)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium">
                  {t("auth.firstName")} *
                </label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={handleChange("first_name")}
                  className={validationErrors.first_name ? "border-red-500" : ""}
                  required
                />
                {validationErrors.first_name && (
                  <p className="text-xs text-red-600">
                    {validationErrors.first_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium">
                  {t("auth.lastName")} *
                </label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={handleChange("last_name")}
                  className={validationErrors.last_name ? "border-red-500" : ""}
                  required
                />
                {validationErrors.last_name && (
                  <p className="text-xs text-red-600">{validationErrors.last_name}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t("auth.email")} *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange("email")}
                className={validationErrors.email ? "border-red-500" : ""}
                required
              />
              {validationErrors.email && (
                <p className="text-xs text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                {t("auth.username")} *
              </label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={formData.username}
                onChange={handleChange("username")}
                className={validationErrors.username ? "border-red-500" : ""}
                required
              />
              {validationErrors.username && (
                <p className="text-xs text-red-600">{validationErrors.username}</p>
              )}
              <p className="text-xs text-gray-500">{t("auth.usernameHint")}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t("auth.password")} *
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange("password")}
                className={validationErrors.password ? "border-red-500" : ""}
                required
              />
              {validationErrors.password && (
                <p className="text-xs text-red-600">{validationErrors.password}</p>
              )}
              <p className="text-xs text-gray-500">
                {t("auth.passwordMinLength")}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password_confirm" className="text-sm font-medium">
                {t("auth.confirmPassword")} *
              </label>
              <Input
                id="password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={handleChange("password_confirm")}
                className={
                  validationErrors.password_confirm ? "border-red-500" : ""
                }
                required
              />
              {validationErrors.password_confirm && (
                <p className="text-xs text-red-600">
                  {validationErrors.password_confirm}
                </p>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 rounded border-gray-300"
                required
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                {t("auth.termsPrefix")}{" "}
                <a href="#" className="text-primary hover:underline">
                  {t("auth.termsOfService")}
                </a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">
                  {t("auth.privacyPolicy")}
                </a>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.creatingAccount")}
                </>
              ) : (
                t("auth.createAccountCta")
              )}
            </Button>

            <p className="text-center text-sm text-gray-600">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link to={loginHref} className="font-medium text-primary hover:underline">
                {t("auth.signIn")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
