import { Globe, Link2, Lock } from "lucide-react";

type Visibility = "public" | "unlisted" | "private";

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (visibility: Visibility) => void;
  className?: string;
}

const visibilityOptions: {
  value: Visibility;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "public",
    label: "Public",
    icon: <Globe size={14} />,
    description: "Visible in feeds and search",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    icon: <Link2 size={14} />,
    description: "Only accessible via direct link",
  },
  {
    value: "private",
    label: "Private",
    icon: <Lock size={14} />,
    description: "Only you can see this",
  },
];

export default function VisibilitySelector({
  value,
  onChange,
  className = "",
}: VisibilitySelectorProps) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {visibilityOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={opt.description}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/50 hover:bg-muted text-muted-foreground"
          }`}
        >
          {opt.icon}
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export type { Visibility };
