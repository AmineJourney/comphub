import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useI18n } from "../../hooks/useI18n";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";

const navigation = [
  { key: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "nav.controls", href: "/controls", icon: Shield },
  { key: "nav.unifiedControls", href: "/controls/unified", icon: Layers },
  { key: "nav.evidence", href: "/evidence", icon: FileText },
  { key: "nav.risks", href: "/risks", icon: AlertTriangle },
  { key: "nav.compliance", href: "/compliance", icon: CheckSquare },
  { key: "nav.auditLog", href: "/audit", icon: Activity },
  { key: "nav.departments", href: "/organizations/departments", icon: Building2 },
  { key: "nav.frameworkLibrary", href: "/library/frameworks", icon: BookOpen },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { company } = useAuthStore();
  const { t } = useI18n();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          {sidebarOpen ? (
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-gray-900">
                {t("common.appName")}
              </span>
            </div>
          ) : (
            <Shield className="mx-auto h-8 w-8 text-primary" />
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden md:flex"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {sidebarOpen && company && (
          <div className="border-b bg-gray-50 px-4 py-3">
            <p className="truncate text-sm font-medium text-gray-900">
              {company.name}
            </p>
            <p className="text-xs capitalize text-gray-500">
              {company.plan} {t("common.planSuffix")}
            </p>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            const Icon = item.icon;
            const label = t(item.key);

            return (
              <Link
                key={item.key}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                )}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    sidebarOpen ? "mr-3" : "mx-auto",
                  )}
                />
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <p className="text-center text-xs text-gray-500">
              Copyright 2026 {t("common.appName")}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
