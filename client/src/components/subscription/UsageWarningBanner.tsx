import { useState } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { X, AlertTriangle, CreditCard, Clock } from "lucide-react";
import { useSubscription } from "../../hooks/use-subscription";
import { cn } from "../../lib/utils";

interface UsageWarningBannerProps {
  className?: string;
}

export function UsageWarningBanner({ className }: UsageWarningBannerProps) {
  const { subscription, isLoading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !subscription || dismissed) {
    return null;
  }

  // Check for grace period (payment failed)
  const isInGracePeriod = subscription.subscriptionStatus === 'past_due' && subscription.gracePeriodEndsAt;
  const gracePeriodEnd = isInGracePeriod ? new Date(subscription.gracePeriodEndsAt!) : null;
  const daysUntilExpiry = gracePeriodEnd
    ? Math.ceil((gracePeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // Check for low credits
  const isLowCredits = subscription.usagePercentage >= 80 && subscription.usagePercentage < 100;
  const isVeryLowCredits = subscription.usagePercentage >= 90 && subscription.usagePercentage < 100;
  const isExhausted = subscription.remaining <= 0;

  // Priority: Grace period > Exhausted > Very Low > Low
  let variant: "default" | "destructive" | "warning" = "default";
  let icon: React.ReactNode;
  let title: string;
  let description: string;
  let actionLabel: string;
  let actionUrl: string;

  if (isInGracePeriod) {
    variant = "destructive";
    icon = <Clock className="h-4 w-4" />;
    title = "Payment Failed - Grace Period Active";
    description = `Your payment failed. You have ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} to update your payment method before your subscription is suspended.`;
    actionLabel = "Update Payment";
    actionUrl = "/settings";
  } else if (isExhausted) {
    variant = "destructive";
    icon = <AlertTriangle className="h-4 w-4" />;
    title = "No Credits Remaining";
    description = `You've used all ${subscription.generationsLimit} credits for this billing period.`;
    actionLabel = "Upgrade Plan";
    actionUrl = "/pricing";
  } else if (isVeryLowCredits) {
    variant = "warning";
    icon = <AlertTriangle className="h-4 w-4" />;
    title = "Almost Out of Credits";
    description = `Only ${subscription.remaining} credit${subscription.remaining === 1 ? "" : "s"} remaining out of ${subscription.generationsLimit}.`;
    actionLabel = "Upgrade Plan";
    actionUrl = "/pricing";
  } else if (isLowCredits) {
    variant = "warning";
    icon = <CreditCard className="h-4 w-4" />;
    title = "Running Low on Credits";
    description = `You've used ${subscription.generationsUsed} of ${subscription.generationsLimit} credits (${Math.round(subscription.usagePercentage)}%).`;
    actionLabel = "View Plans";
    actionUrl = "/pricing";
  } else {
    return null; // No warning needed
  }

  return (
    <Alert
      variant={variant as any}
      className={cn("relative pr-12", className)}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1">
          <div className="font-semibold mb-1">{title}</div>
          <AlertDescription className="text-sm">
            {description}
          </AlertDescription>
          <Button
            asChild
            variant={variant === "destructive" ? "secondary" : "outline"}
            size="sm"
            className="mt-3"
          >
            <a href={actionUrl}>{actionLabel}</a>
          </Button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-current opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Alert>
  );
}
