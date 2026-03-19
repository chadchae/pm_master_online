"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { clearToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useLocale, LocaleToggle } from "@/lib/i18n";

// Map paths to page title translation keys
function getPageTitle(
  pathname: string,
  t: (key: string) => string
): { title: string; breadcrumbs: { label: string; href?: string }[] } {
  const segments = pathname.split("/").filter(Boolean);

  const titleMap: Record<string, string> = {
    "/dashboard": t("breadcrumb.dashboard"),
    "/dashboard/ideas": t("breadcrumb.ideas"),
    "/dashboard/projects": t("breadcrumb.projects"),
    "/dashboard/documents": t("breadcrumb.documents"),
    "/dashboard/notes": t("breadcrumb.notes"),
    "/dashboard/learning": t("breadcrumb.learning"),
    "/dashboard/issues": t("breadcrumb.issues"),
    "/dashboard/guidelines": t("breadcrumb.guidelines"),
    "/dashboard/timeline": t("breadcrumb.timeline"),
    "/dashboard/servers": t("breadcrumb.servers"),
    "/dashboard/people": t("breadcrumb.people"),
    "/dashboard/trash": t("breadcrumb.trash"),
  };

  // Project detail page
  if (segments.length >= 3 && segments[1] === "projects") {
    const projectName = decodeURIComponent(segments[2]);
    return {
      title: projectName,
      breadcrumbs: [
        { label: t("breadcrumb.dashboard"), href: "/dashboard" },
        { label: t("breadcrumb.projects"), href: "/dashboard/projects" },
        { label: projectName },
      ],
    };
  }

  const title = titleMap[pathname] || segments[segments.length - 1] || t("breadcrumb.dashboard");
  const breadcrumbs: { label: string; href?: string }[] = [
    { label: t("breadcrumb.dashboard"), href: pathname === "/dashboard" ? undefined : "/dashboard" },
  ];

  if (pathname !== "/dashboard") {
    breadcrumbs.push({ label: title });
  }

  return { title, breadcrumbs };
}

export function PageHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const { breadcrumbs } = getPageTitle(pathname, t);

  const handleLogout = () => {
    clearToken();
    router.replace("/");
  };

  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-neutral-900 dark:text-white font-medium">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <LocaleToggle />
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          title={t("auth.logout")}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
