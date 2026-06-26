import {
  ArrowUpDown,
  ChartColumnBig,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { MarianSaveLogo } from "@/components/brand/MarianSaveLogo";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowUpDown },
  { to: "/reports", label: "Reports", icon: ChartColumnBig },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden w-[208px] flex-shrink-0 flex-col border-r border-white/10 bg-sidebar text-white xl:flex">
      <div className="border-b border-white/10 px-4 py-4">
        <MarianSaveLogo />
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                isActive
                  ? "bg-white text-sidebar"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-white",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
