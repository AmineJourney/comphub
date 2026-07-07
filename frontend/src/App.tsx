import { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { complianceApi } from "./api/compliance";
import { AppLayout } from "./components/layout/AppLayout";
import { AcceptInvite } from "./features/auth/AcceptInvite";
import { CompanySelector } from "./features/auth/CompanySelector";
import { ForgotPassword } from "./features/auth/ForgotPassword";
import { Login } from "./features/auth/Login";
import { Register } from "./features/auth/Register";
import { ResetPassword } from "./features/auth/ResetPassword";
import { AuditLogPage } from "./features/audit/AuditLog";
import { ComplianceDashboard } from "./features/compliance/ComplianceDashboard";
import { ComplianceReports } from "./features/compliance/ComplianceReports";
import { FrameworkAdoptionList } from "./features/compliance/FrameworkAdoptionList";
import { FrameworkComplianceDetail } from "./features/compliance/FrameworkComplianceDetail";
import { GapAnalysis } from "./features/compliance/GapAnalysis";
import { ControlDashboard } from "./features/controls/ControlDashboard";
import { ControlDetail } from "./features/controls/ControlDetail";
import { ControlList } from "./features/controls/ControlList";
import { UnifiedControlBrowser } from "./features/controls/UnifiedControlsBrowser";
import { Dashboard } from "./features/dashboard/Dashboard";
import { EvidenceDetail } from "./features/evidence/EvidenceDetail";
import { EvidenceList } from "./features/evidence/EvidenceList";
import { useI18n } from "./hooks/useI18n";
import { FrameworkDetail } from "./features/library/FrameworkDetail";
import { FrameworkList } from "./features/library/FrameworkList";
import { DepartmentList } from "./features/organizations/DepartmentList";
import { DepartmentTree } from "./features/organizations/DepartmentTree";
import { Profile } from "./features/profile/Profile";
import { ProcessDetail } from "./features/processes/ProcessDetail";
import { ProcessList } from "./features/processes/ProcessList";
import { RiskDetail } from "./features/risk/RiskDetail";
import { RiskHeatMap } from "./features/risk/RiskHeatMap";
import { RiskRegister } from "./features/risk/RiskRegister";
import { Settings } from "./features/settings/Settings";
import { TeamManagement } from "./features/settings/TeamManagement";
import { useAuthStore } from "./stores/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, company } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!company) return <Navigate to="/select-company" replace />;

  return <>{children}</>;
}

function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { language } = useI18n();
  const routeQueryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.lang = language;
    void routeQueryClient.invalidateQueries();
  }, [language, routeQueryClient]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />

        <Route
          path="/select-company"
          element={
            <AuthenticatedRoute>
              <CompanySelector />
            </AuthenticatedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="controls">
            <Route index element={<ControlList />} />
            <Route path="dashboard" element={<ControlDashboard />} />
            <Route path="unified" element={<UnifiedControlBrowser />} />
            <Route path=":id" element={<ControlDetail />} />
          </Route>

          <Route path="evidence">
            <Route index element={<EvidenceList />} />
            <Route path=":id" element={<EvidenceDetail />} />
          </Route>

          <Route path="risks">
            <Route index element={<RiskRegister />} />
            <Route path="heat-map" element={<RiskHeatMap />} />
            <Route path=":id" element={<RiskDetail />} />
          </Route>

          <Route path="processes">
            <Route index element={<ProcessList />} />
            <Route path=":id" element={<ProcessDetail />} />
          </Route>

          <Route path="compliance">
            <Route index element={<ComplianceDashboard />} />
            <Route
              path="frameworks/:frameworkId"
              element={<FrameworkComplianceDetail />}
            />
            <Route path="adoptions" element={<FrameworkAdoptionList />} />
            <Route path="gaps" element={<GapPage />} />
            <Route path="reports" element={<ComplianceReports />} />
          </Route>

          <Route path="organizations/departments" element={<DepartmentList />} />
          <Route
            path="organizations/departments/tree"
            element={<DepartmentTree />}
          />

          <Route path="library/frameworks" element={<FrameworkList />} />
          <Route path="library/frameworks/:id" element={<FrameworkDetail />} />

          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/users" element={<TeamManagement />} />
          <Route path="audit" element={<AuditLogPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function GapPage() {
  const { t } = useI18n();
  const { data: overview, isLoading } = useQuery({
    queryKey: ["compliance-overview"],
    queryFn: complianceApi.getOverview,
  });
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(
    null,
  );

  const frameworks = overview?.frameworks ?? [];
  const frameworkId =
    selectedFrameworkId ?? frameworks[0]?.framework_id ?? null;

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-gray-400">
        {t("gap.loadingFrameworks")}
      </div>
    );
  }

  if (frameworks.length === 0) {
    return <div className="p-6 text-gray-500">{t("gap.noFrameworks")}</div>;
  }

  return (
    <div className="space-y-4">
      {frameworks.length > 1 && (
        <div className="flex items-center gap-3 pb-2">
          <label className="text-sm font-medium text-gray-700">
            {t("common.framework")}:
          </label>
          <select
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={frameworkId ?? ""}
            onChange={(e) => setSelectedFrameworkId(e.target.value)}
          >
            {frameworks.map(
              (framework: {
                framework_id: string;
                framework_code: string;
                framework_name?: string;
              }) => (
                <option key={framework.framework_id} value={framework.framework_id}>
                  {framework.framework_code}
                  {framework.framework_name ? ` - ${framework.framework_name}` : ""}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {frameworkId && <GapAnalysis frameworkId={frameworkId} />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}

export default App;
