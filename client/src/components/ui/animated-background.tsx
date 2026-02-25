interface AnimatedBackgroundProps {
  variant?: "dots" | "blueprint" | "none";
  showBlobs?: boolean;
  blobColor?: string;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedBackground({
  variant = "dots",
  showBlobs = true,
  children,
  className = "",
}: AnimatedBackgroundProps) {
  const gridClass =
    variant === "dots"
      ? "dark-dot-grid"
      : variant === "blueprint"
        ? "dark-blueprint-grid"
        : "";

  return (
    <div className={`relative overflow-hidden ${gridClass} ${className}`}>
      {showBlobs && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-primary/[0.03] to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-t from-primary/[0.02] to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
