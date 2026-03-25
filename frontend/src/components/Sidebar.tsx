"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  FolderKanban,
  StickyNote,
  BookOpen,
  AlertCircle,
  BookMarked,
  Clock,
  Server,
  Users,
  Briefcase,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Trash,
  Terminal,
  ClipboardList,
  FileText,
  CheckSquare,
  BarChart3,
  CalendarDays,
  Map,
} from "lucide-react";
import { PasswordChangeModal } from "./PasswordChangeModal";
import { QuickNotePanel } from "./QuickNotePanel";
import { ProjectMemoPanel } from "./ProjectMemoPanel";
import { WorkExecutionPanel } from "./WorkExecutionPanel";
import { WorkStatusPanel } from "./WorkStatusPanel";
import { TodoPanel } from "./TodoPanel";
import { useLocale } from "@/lib/i18n";

interface NavItemDef {
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItemDef[] = [
  { labelKey: "sidebar.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "sidebar.ideas", href: "/dashboard/ideas", icon: Lightbulb },
  { labelKey: "sidebar.projects", href: "/dashboard/projects", icon: FolderKanban },
  { labelKey: "sidebar.plans", href: "/dashboard/plans", icon: Map },
  { labelKey: "sidebar.todos", href: "/dashboard/todos", icon: ClipboardList },
  { labelKey: "sidebar.status", href: "/dashboard/status", icon: BarChart3 },
  { labelKey: "sidebar.notes", href: "/dashboard/notes", icon: StickyNote },
  { labelKey: "sidebar.learning", href: "/dashboard/learning", icon: BookOpen },
  { labelKey: "sidebar.issues", href: "/dashboard/issues", icon: AlertCircle },
  { labelKey: "sidebar.issueDocs", href: "/dashboard/issue-docs", icon: FileText },
  { labelKey: "sidebar.guidelines", href: "/dashboard/guidelines", icon: BookMarked },
  { labelKey: "sidebar.timeline", href: "/dashboard/timeline", icon: Clock },
  { labelKey: "sidebar.servers", href: "/dashboard/servers", icon: Server },
  { labelKey: "sidebar.people", href: "/dashboard/people", icon: Users },
  { labelKey: "sidebar.portfolio", href: "/dashboard/portfolio", icon: Briefcase },
  { labelKey: "sidebar.trash", href: "/dashboard/trash", icon: Trash },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showProjectMemo, setShowProjectMemo] = useState(false);
  const [showWorkExec, setShowWorkExec] = useState(false);
  const [showWorkStatus, setShowWorkStatus] = useState(false);
  const [showTodo, setShowTodo] = useState(false);

  const fromIdeas = searchParams.get("from") === "ideas";
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    // When viewing project detail from ideas, highlight Ideas instead of Projects
    if (href === "/dashboard/ideas" && fromIdeas && pathname.startsWith("/dashboard/projects/")) return true;
    if (href === "/dashboard/projects" && fromIdeas && pathname.startsWith("/dashboard/projects/")) return false;
    return pathname.startsWith(href);
  };

  return (
    <>
      <aside
        className={`flex flex-col h-screen border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 transition-all duration-200 ${
          collapsed ? "w-[60px]" : "w-[240px]"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
            PM
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
              PM Master Online <span className="text-[10px] font-normal text-neutral-400">v2.1.0</span>
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <ul className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const label = t(item.labelKey);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="leading-tight">
                        {label}
                        {item.labelKey === "sidebar.projects" && (
                          <span className="block text-[9px] text-neutral-400 leading-none">Dashboard + Ideas</span>
                        )}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-2 space-y-0.5">
          {/* Todo button */}
          <button
            onClick={() => setShowTodo(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors w-full"
            title={collapsed ? t("sidebar.todo") : undefined}
          >
            <CheckSquare className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t("sidebar.todo")}</span>}
          </button>

          {/* Work Execution button */}
          <button
            onClick={() => setShowWorkExec(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-green-300 transition-colors w-full"
            title={collapsed ? t("sidebar.execute") : undefined}
          >
            <Terminal className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t("sidebar.execute")}</span>}
          </button>

          {/* Work Status button */}
          <button
            onClick={() => setShowWorkStatus(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors w-full"
            title={collapsed ? t("sidebar.quickStatus") : undefined}
          >
            <ClipboardList className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t("sidebar.quickStatus")}</span>}
          </button>

          {/* Quick Note button */}
          <button
            onClick={() => setShowQuickNote(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-700 dark:hover:text-amber-300 transition-colors w-full"
            title={collapsed ? t("sidebar.quickNote") : undefined}
          >
            <Pencil className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t("sidebar.quickNote")}</span>}
          </button>

          {/* 프로젝트메모 button */}
          <button
            onClick={() => setShowProjectMemo(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors w-full"
            title={collapsed ? t("sidebar.projectMemo") : undefined}
          >
            <FolderKanban className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t("sidebar.projectMemo")}</span>}
          </button>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors w-full"
            title={collapsed ? t("sidebar.settings") : undefined}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t("sidebar.settings")}</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors w-full"
            title={collapsed ? t("sidebar.collapse") : t("sidebar.collapse")}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5 flex-shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5 flex-shrink-0" />
                <span>{t("sidebar.collapse")}</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}

      <WorkExecutionPanel
        open={showWorkExec}
        onClose={() => setShowWorkExec(false)}
      />

      <WorkStatusPanel
        open={showWorkStatus}
        onClose={() => setShowWorkStatus(false)}
      />

      <QuickNotePanel
        open={showQuickNote}
        onClose={() => setShowQuickNote(false)}
      />

      <ProjectMemoPanel
        open={showProjectMemo}
        onClose={() => setShowProjectMemo(false)}
      />

      <TodoPanel open={showTodo} onClose={() => setShowTodo(false)} />
    </>
  );
}
