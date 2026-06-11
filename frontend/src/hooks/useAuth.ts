import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import type { LoginRequest } from "@/types/auth.types";

export function useAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    company,
    membership,
    isAuthenticated,
    setAuth,
    setCompany,
    logout: logoutStore,
  } = useAuthStore();
  const nextPath = new URLSearchParams(location.search).get("next");

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const loginResponse = await authApi.login(credentials);
      setAuth(null, loginResponse.access, loginResponse.refresh);

      const [currentUser, companies] = await Promise.all([
        authApi.getCurrentUser(),
        authApi.getCompanies(),
      ]);

      return { tokens: loginResponse, user: currentUser, companies };
    },
    onSuccess: async ({ tokens, user, companies }) => {
      setAuth(user, tokens.access, tokens.refresh);

      if (nextPath) {
        navigate(nextPath);
        return;
      }

      if (companies.length === 0) {
        navigate("/select-company");
      } else if (companies.length === 1) {
        try {
          const membershipsResponse = await authApi.getMemberships({
            company: companies[0].id,
          });
          const mem = membershipsResponse.results[0];
          if (!mem) throw new Error("No membership");
          setCompany(companies[0], mem);
          navigate("/dashboard");
        } catch {
          navigate("/select-company");
        }
      } else {
        navigate("/select-company");
      }
    },
    onError: (error) => {
      console.error("Login failed:", error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      const loginTarget = nextPath
        ? `/login?next=${encodeURIComponent(nextPath)}`
        : "/login";
      navigate(loginTarget);
    },
    onError: (error) => console.error("Registration failed:", error),
  });

  const logoutUser = async () => {
    try {
      const { refreshToken } = useAuthStore.getState();
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Always clear local state on logout.
    } finally {
      logoutStore();
      navigate("/login");
    }
  };

  return {
    user,
    company,
    membership,
    isAuthenticated,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutUser,
    isLoading: loginMutation.isPending || registerMutation.isPending,
    error: loginMutation.error || registerMutation.error,
  };
}
