"use client";

import { Briefcase } from "lucide-react";

export default function PortfolioPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
      <div className="p-4 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <Briefcase className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h1 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">포트폴리오</h1>
      <p className="text-sm text-neutral-400 dark:text-neutral-500">추후 개발 예정입니다.</p>
    </div>
  );
}
