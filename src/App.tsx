import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  applyThemePreference,
  getDefaultRoute,
} from "@/lib/appPreferences";
import { initializeDatabase } from "@/lib/db";
import { isTauriRuntime } from "@/lib/runtime";
import { getPreviewSettings, getSettings } from "@/lib/settings";
import { DashboardPage } from "@/pages/DashboardPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";

const isDesktop = isTauriRuntime();

function App() {
  const previewSettings = getPreviewSettings();
  const [defaultRoute, setDefaultRoute] = useState(
    getDefaultRoute(previewSettings.default_view),
  );

  useEffect(() => {
    void initializeDatabase();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAppSettings() {
      if (!isDesktop) {
        applyThemePreference(previewSettings.theme);
        return;
      }

      try {
        const settings = await getSettings();

        if (cancelled) {
          return;
        }

        applyThemePreference(settings.theme);
        setDefaultRoute(getDefaultRoute(settings.default_view));
      } catch {
        if (!cancelled) {
          applyThemePreference(previewSettings.theme);
          setDefaultRoute(getDefaultRoute(previewSettings.default_view));
        }
      }
    }

    void loadAppSettings();

    return () => {
      cancelled = true;
    };
  }, [previewSettings.default_view, previewSettings.theme]);

  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to={defaultRoute} replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
