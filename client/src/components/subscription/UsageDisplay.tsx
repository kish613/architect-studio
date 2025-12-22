import { Progress } from "../ui/progress";
import { cn } from "../../lib/utils";

interface UsageDisplayProps {
  used: number;
  limit: number;
  className?: string;
  showPercentage?: boolean;
}

export function UsageDisplay({ used, limit, className, showPercentage = false }: UsageDisplayProps) {
  const percentage = Math.min((used / limit) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 90;
  const isExhausted = percentage >= 100;

  const getStatusColor = () => {
    if (isExhausted) return "text-red-600 dark:text-red-400";
    if (isCritical) return "text-orange-600 dark:text-orange-400";
    if (isWarning) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getProgressColor = () => {
    if (isExhausted) return "bg-red-500";
    if (isCritical) return "bg-orange-500";
    if (isWarning) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">Generations</span>
        <span className={cn("font-semibold", getStatusColor())}>
          {used} / {limit}
          {showPercentage && ` (${percentage.toFixed(0)}%)`}
        </span>
      </div>

      <Progress
        value={percentage}
        className={cn("h-2", getProgressColor())}
      />

      {isExhausted && (
        <p className="text-sm text-red-600 dark:text-red-400 font-medium">
          You've used all your credits
        </p>
      )}
      {isCritical && !isExhausted && (
        <p className="text-sm text-orange-600 dark:text-orange-400">
          Only {limit - used} credit{limit - used === 1 ? "" : "s"} remaining
        </p>
      )}
      {isWarning && !isCritical && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          Running low on credits
        </p>
      )}
    </div>
  );
}
