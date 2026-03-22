import { type RatingInputIcon } from "./types";

export function RatingInput({
  value,
  onChange,
  max = 5,
  icon: Icon,
  activeColor,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  icon: RatingInputIcon;
  activeColor: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(value === i + 1 ? 0 : i + 1)}
          className={`p-0.5 rounded transition-colors ${
            i < value ? activeColor : "text-neutral-300 dark:text-neutral-600 hover:text-neutral-400"
          }`}
        >
          <Icon className="w-4 h-4" fill={i < value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}
