import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  padding = "md",
}: {
  className?: string;
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pad = { none: "", sm: "p-4", md: "p-6", lg: "p-8" }[padding];
  return (
    <div className={cn("surface-card", pad, className)}>
      {children}
    </div>
  );
}
