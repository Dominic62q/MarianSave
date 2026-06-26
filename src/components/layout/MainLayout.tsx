import { Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";

const pageMeta: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Monthly income, expenses, and balance overview.",
  },
  "/transactions": {
    title: "Transactions",
    description: "Browse and filter your transaction history.",
  },
  "/reports": {
    title: "Reports",
    description: "Monthly summaries, trends, and data exports.",
  },
  "/settings": {
    title: "Settings",
    description: "Manage categories and preferences.",
  },
};

export function MainLayout() {
  const location = useLocation();
  const page = pageMeta[location.pathname] ?? pageMeta["/dashboard"];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader title={page.title} description={page.description} />
        <main className="flex-1 overflow-auto p-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
