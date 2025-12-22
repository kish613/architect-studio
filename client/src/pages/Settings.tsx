import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsageDisplay } from "@/components/subscription/UsageDisplay";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, CreditCard, User, Calendar, ExternalLink, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { subscription, isLoading: subLoading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal. Please try again.");
      setPortalLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>;
      case "trialing":
        return <Badge variant="default">Trial</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (authLoading || subLoading) {
    return (
      <div className="container mx-auto py-16 flex justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-16 text-center">
        <p>Please log in to view settings.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <SettingsIcon className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account and subscription</p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-base">
                  {user.firstName} {user.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Information */}
        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription
              </CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Current Plan</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold capitalize">{subscription.plan}</p>
                    {subscription.subscriptionStatus && getStatusBadge(subscription.subscriptionStatus)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Generation Limit</p>
                  <p className="text-lg font-semibold">{subscription.generationsLimit} / month</p>
                </div>
              </div>

              <Separator />

              {/* Usage Display */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Current Usage</p>
                <UsageDisplay
                  used={subscription.generationsUsed}
                  limit={subscription.generationsLimit}
                  showPercentage
                />
              </div>

              {/* Grace Period Warning */}
              {subscription.subscriptionStatus === 'past_due' && subscription.gracePeriodEndsAt && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-destructive mb-1">Payment Failed</h4>
                      <p className="text-sm text-muted-foreground">
                        Your payment failed. Please update your payment method by{" "}
                        {formatDate(subscription.gracePeriodEndsAt)} to avoid service interruption.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Billing Period */}
              {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Billing Period Start
                    </p>
                    <p className="text-base">{formatDate(subscription.currentPeriodStart)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Next Billing Date
                    </p>
                    <p className="text-base">{formatDate(subscription.currentPeriodEnd)}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {subscription.plan !== "free" && subscription.stripeCustomerId ? (
                  <Button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="gap-2"
                  >
                    {portalLoading ? (
                      <Spinner className="w-4 h-4" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Manage Billing
                  </Button>
                ) : null}

                <Link href="/pricing">
                  <Button variant={subscription.plan === "free" ? "default" : "outline"} className="w-full sm:w-auto">
                    {subscription.plan === "free" ? "Upgrade Plan" : "Change Plan"}
                  </Button>
                </Link>
              </div>

              {subscription.plan !== "free" && (
                <p className="text-xs text-muted-foreground">
                  * Use "Manage Billing" to update payment methods, view invoices, or cancel your subscription
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Danger Zone - Future feature */}
        {/* <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
