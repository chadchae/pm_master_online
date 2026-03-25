"use client";

import { Briefcase, Clock } from "lucide-react";

const PLANNED_FEATURES = [
  { title: "프로젝트 포트폴리오 뷰", desc: "완료 프로젝트를 카드/갤러리 형태로 시각화" },
  { title: "성과 타임라인", desc: "연도별 프로젝트 진행 이력 및 주요 성과 표시" },
  { title: "통계 대시보드", desc: "유형별·협업별·단계별 프로젝트 분포 차트" },
  { title: "CV 내보내기", desc: "선택한 프로젝트를 PDF/마크다운으로 내보내기" },
];

export default function PortfolioPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="p-4 rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Briefcase className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">포트폴리오</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">추후 개발 예정입니다. 기대해주세요.</p>
      </div>

      <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
          <Clock size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">개발 예정 기능</span>
        </div>
        <ul className="space-y-3">
          {PLANNED_FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">{f.title}</p>
                <p className="text-xs text-neutral-400">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
