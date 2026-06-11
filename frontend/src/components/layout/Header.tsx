import { Link } from "react-router-dom";
import { Bell, LogOut, Menu, Settings, User as UserIcon } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useI18n } from "../../hooks/useI18n";
import { getInitials } from "../../lib/utils";
import { useUIStore } from "../../stores/uiStore";
import { useAuth } from "../../hooks/useAuth";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const { user, membership, logout } = useAuth();
  const { toggleSidebar } = useUIStore();
  const { t } = useI18n();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center space-x-4">
        <LanguageSwitcher />

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                {user ? getInitials(`${user.first_name} ${user.last_name}`) : "?"}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs capitalize text-gray-500">
                  {membership?.role ? t(`roles.${membership.role}`) : ""}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("common.myAccount")}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <Link to="/profile" className="flex items-center">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>{t("common.profile")}</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Link to="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>{t("common.settings")}</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("common.logOut")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
