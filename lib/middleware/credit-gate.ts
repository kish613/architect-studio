import { getCurrentUser } from "../auth";
import { canUserGenerate, getSubscriptionStatus } from "../subscription-manager";

/**
 * Error response for credit limit reached
 */
export class CreditLimitError extends Error {
  constructor(
    public remaining: number,
    public limit: number,
    public plan: string
  ) {
    super("Credit limit reached");
    this.name = "CreditLimitError";
  }
}

/**
 * Middleware to check if user has credits available before allowing access
 * Returns user if authorized, throws error otherwise
 */
export async function requireCredits(request: Request): Promise<{ userId: string; email: string }> {
  // Check authentication first
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check if user has credits available
  const hasCredits = await canUserGenerate(user.id);
  if (!hasCredits) {
    const status = await getSubscriptionStatus(user.id);
    throw new CreditLimitError(
      status.remaining,
      status.generationsLimit,
      status.plan
    );
  }

  return { userId: user.id, email: user.email || "" };
}

/**
 * Higher-order function to wrap API handlers with credit gating
 * Usage:
 *   export default withCreditGate(async (request, user) => {
 *     // Your handler code here
 *   });
 */
export function withCreditGate<T = any>(
  handler: (request: Request, user: { userId: string; email: string }) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    try {
      const user = await requireCredits(request);
      return await handler(request, user);
    } catch (error) {
      if (error instanceof CreditLimitError) {
        return new Response(
          JSON.stringify({
            error: "Credit limit reached",
            code: "LIMIT_REACHED",
            details: {
              remaining: error.remaining,
              limit: error.limit,
              plan: error.plan,
            },
            upgrade_url: "/pricing",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (error instanceof Error && error.message === "Unauthorized") {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.error("Credit gate error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}

/**
 * Check if user has credits and return warning if low
 */
export async function checkCreditWarning(userId: string): Promise<{
  warning?: {
    type: "low_credits" | "very_low_credits";
    remaining: number;
    limit: number;
    message: string;
  };
}> {
  const status = await getSubscriptionStatus(userId);

  if (status.usagePercentage >= 90) {
    return {
      warning: {
        type: "very_low_credits",
        remaining: status.remaining,
        limit: status.generationsLimit,
        message: `Only ${status.remaining} credit${status.remaining === 1 ? "" : "s"} remaining`,
      },
    };
  }

  if (status.usagePercentage >= 80) {
    return {
      warning: {
        type: "low_credits",
        remaining: status.remaining,
        limit: status.generationsLimit,
        message: `Running low on credits (${status.remaining} remaining)`,
      },
    };
  }

  return {};
}
