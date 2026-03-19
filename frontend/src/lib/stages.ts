// Stage configuration: folder names, display names, and colors

export interface StageConfig {
  folder: string;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const STAGES: StageConfig[] = [
  {
    folder: "1_idea_stage",
    label: "Idea",
    color: "gray",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
    borderColor: "border-gray-300 dark:border-gray-600",
  },
  {
    folder: "2_initiation_stage",
    label: "Initiation",
    color: "blue",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-300 dark:border-blue-700",
  },
  {
    folder: "3_in_development",
    label: "Development",
    color: "amber",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  {
    folder: "4_in_testing",
    label: "Testing",
    color: "purple",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    textColor: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300 dark:border-purple-700",
  },
  {
    folder: "5_completed",
    label: "Completed",
    color: "green",
    bgColor: "bg-green-50 dark:bg-green-950",
    textColor: "text-green-700 dark:text-green-300",
    borderColor: "border-green-300 dark:border-green-700",
  },
  {
    folder: "6_archived",
    label: "Archived",
    color: "neutral",
    bgColor: "bg-neutral-100 dark:bg-neutral-800",
    textColor: "text-neutral-600 dark:text-neutral-400",
    borderColor: "border-neutral-300 dark:border-neutral-600",
  },
];

// Kanban stages: exclude idea stage (ideas have their own page)
export const KANBAN_STAGES = STAGES.filter((s) => s.folder !== "1_idea_stage");

export function getStageByFolder(folder: string): StageConfig | undefined {
  return STAGES.find((s) => s.folder === folder);
}

export function getStageBadgeClasses(stage: string): string {
  const config = getStageByFolder(stage);
  if (!config) return "bg-gray-100 text-gray-600";
  return `${config.bgColor} ${config.textColor}`;
}
