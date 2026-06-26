import type { AppSettings } from "@/lib/types";

export type ThemePreference = AppSettings["theme"];
export type DefaultViewPreference = AppSettings["default_view"];

export type ReportDefaults = {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveThemePreference(theme: ThemePreference) {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    return "light";
  }

  return theme;
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedTheme = resolveThemePreference(theme);
  const root = document.documentElement;

  root.classList.toggle("theme-dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
}

export function getDefaultRoute(defaultView: DefaultViewPreference) {
  return defaultView === "this_month" ? "/dashboard" : "/reports";
}

export function buildReportDefaults(
  defaultView: DefaultViewPreference,
  transactions: Array<{ transactionDate: string }>,
) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const endDate = formatDate(now);
  const startOfMonth = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));

  if (defaultView === "last_30_days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);

    return {
      month,
      year,
      startDate: formatDate(start),
      endDate,
    } satisfies ReportDefaults;
  }

  if (defaultView === "all_time") {
    const earliest = [...transactions]
      .sort((left, right) =>
        left.transactionDate.localeCompare(right.transactionDate),
      )[0]?.transactionDate;

    return {
      month,
      year,
      startDate: earliest ?? startOfMonth,
      endDate,
    } satisfies ReportDefaults;
  }

  return {
    month,
    year,
    startDate: startOfMonth,
    endDate,
  } satisfies ReportDefaults;
}
