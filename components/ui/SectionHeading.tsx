import { cn } from "@/lib/utils";

export function SectionHeading({
  overline,
  title,
  description,
  align = "center",
  className,
}: {
  overline?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        align === "center" ? "text-center mx-auto max-w-2xl" : "max-w-2xl",
        className
      )}
    >
      {overline && (
        <p className="overline text-[var(--brand-primary)] mb-3">{overline}</p>
      )}
      <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-[var(--text-secondary)] text-lg leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
