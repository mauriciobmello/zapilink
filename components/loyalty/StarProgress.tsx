import { StarIcon } from "@/components/icons";

interface StarProgressProps {
  current: number;
  required: number;
  accentColor?: string;
  size?: number;
}

export default function StarProgress({
  current,
  required,
  accentColor = "#F97316",
  size = 28,
}: StarProgressProps) {
  const total = Math.max(required, 0);
  const filled = Math.min(Math.max(current, 0), total);

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="img"
      aria-label={`${filled} de ${total} estrelas`}
    >
      {Array.from({ length: total }).map((_, index) => {
        const active = index < filled;
        return (
          <StarIcon
            key={index}
            style={{
              width: size,
              height: size,
              color: active ? accentColor : "#D1D5DB",
              fill: active ? accentColor : "transparent",
            }}
          />
        );
      })}
    </div>
  );
}
