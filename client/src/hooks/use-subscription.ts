import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface SubscriptionStatus {
  plan: "free" | "starter" | "pro" | "studio";
  generationsUsed: number;
  generationsLimit: number;
  remaining: number;
  canGenerate: boolean;
  usagePercentage: number;
  isNearLimit: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  subscriptionStatus?: "active" | "past_due" | "canceled" | "unpaid" | "trialing";
  gracePeriodEndsAt?: string | null;
}

export function useSubscription() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<SubscriptionStatus>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetch("/api/subscription", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }

      return response.json();
    },
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
  };

  return {
    subscription: data,
    isLoading,
    error,
    refetch,
    invalidate,
  };
}
