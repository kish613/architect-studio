import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { UsageDisplay } from "./UsageDisplay";
import { useSubscription } from "../../hooks/use-subscription";
import { Spinner } from "../ui/spinner";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: "limit_reached" | "upgrade_prompt" | "feature_locked";
}

const PLAN_DETAILS = {
  free: { name: "Free", price: "$0", generations: 2, features: ["2 generations/month", "Basic features"] },
  starter: { name: "Starter", price: "$9", generations: 5, features: ["5 generations/month", "Priority support"] },
  pro: { name: "Pro", price: "$29", generations: 20, features: ["20 generations/month", "Advanced features", "Priority support"] },
  studio: { name: "Studio", price: "$79", generations: 60, features: ["60 generations/month", "All features", "Priority support", "API access"] },
};

export function PaywallModal({ isOpen, onClose, trigger = "limit_reached" }: PaywallModalProps) {
  const { subscription, isLoading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: "starter" | "pro" | "studio") => {
    try {
      setCheckoutLoading(plan);
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
      setCheckoutLoading(null);
    }
  };

  const handleBuyCredits = async () => {
    try {
      setCheckoutLoading("pay_per_use");
      const response = await fetch("/api/subscription/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ count: 1 }),
      });

      if (!response.ok) {
        throw new Error("Failed to create purchase session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Failed to start purchase. Please try again.");
      setCheckoutLoading(null);
    }
  };

  const getTitle = () => {
    switch (trigger) {
      case "limit_reached":
        return "You've reached your generation limit";
      case "feature_locked":
        return "Upgrade to unlock this feature";
      default:
        return "Upgrade your plan";
    }
  };

  const getDescription = () => {
    switch (trigger) {
      case "limit_reached":
        return "Upgrade your plan or purchase additional credits to continue generating.";
      case "feature_locked":
        return "This feature is available on paid plans.";
      default:
        return "Choose a plan that fits your needs.";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="w-8 h-8" />
          </div>
        ) : subscription ? (
          <div className="space-y-6">
            {/* Current Usage */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-semibold mb-3">Current Plan: {PLAN_DETAILS[subscription.plan].name}</h3>
              <UsageDisplay
                used={subscription.generationsUsed}
                limit={subscription.generationsLimit}
                showPercentage
              />
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["starter", "pro", "studio"] as const).map((plan) => {
                const details = PLAN_DETAILS[plan];
                const isCurrentPlan = subscription.plan === plan;
                const isDowngrade = ["starter", "pro", "studio"].indexOf(subscription.plan) > ["starter", "pro", "studio"].indexOf(plan);

                return (
                  <div
                    key={plan}
                    className={`border-2 rounded-lg p-6 ${
                      plan === "pro"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {plan === "pro" && (
                      <div className="text-xs font-semibold text-primary mb-2">MOST POPULAR</div>
                    )}
                    <h3 className="text-xl font-bold mb-2">{details.name}</h3>
                    <div className="text-3xl font-bold mb-4">
                      {details.price}
                      <span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {details.features.map((feature, idx) => (
                        <li key={idx} className="text-sm flex items-start">
                          <svg
                            className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleUpgrade(plan)}
                      disabled={isCurrentPlan || checkoutLoading !== null}
                      className="w-full"
                      variant={plan === "pro" ? "default" : "outline"}
                    >
                      {checkoutLoading === plan ? (
                        <Spinner className="w-4 h-4 mr-2" />
                      ) : null}
                      {isCurrentPlan
                        ? "Current Plan"
                        : isDowngrade
                        ? "Downgrade"
                        : "Upgrade"}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* One-time Purchase Option */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">Or purchase credits one-time</h3>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div>
                  <p className="font-medium">1 Generation Credit</p>
                  <p className="text-sm text-gray-500">No subscription required</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold">$3</span>
                  <Button
                    onClick={handleBuyCredits}
                    disabled={checkoutLoading !== null}
                    variant="outline"
                  >
                    {checkoutLoading === "pay_per_use" ? (
                      <Spinner className="w-4 h-4 mr-2" />
                    ) : null}
                    Buy Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
