import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Sparkles, Building2, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface PricingPlan {
  name: string;
  price: string;
  priceId?: string;
  generations: number | string;
  description: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
  type: 'free' | 'subscription' | 'pay_per_use';
}

const plans: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    generations: 2,
    description: 'Try it out with 2 free generations',
    features: [
      '2 floorplan-to-3D conversions',
      'Basic isometric generation',
      '3D model with textures',
      'Download GLB files',
    ],
    icon: <Sparkles className="w-6 h-6" />,
    type: 'free',
  },
  {
    name: 'Starter',
    price: '$9',
    priceId: 'price_1SfMrG2c02b28KeeDxvZduFi',
    generations: 5,
    description: 'Perfect for personal projects',
    features: [
      '5 generations per month',
      'Isometric + 3D models',
      'PBR textures',
      'One-time retexturing',
      'Email support',
    ],
    icon: <Zap className="w-6 h-6" />,
    type: 'subscription',
  },
  {
    name: 'Pro',
    price: '$29',
    priceId: 'price_1SfMrG2c02b28Kee7LYF9lMB',
    generations: 20,
    description: 'For professionals and small studios',
    features: [
      '20 generations per month',
      'Everything in Starter',
      'Priority processing',
      'Advanced texture options',
      'Priority support',
    ],
    popular: true,
    icon: <Building2 className="w-6 h-6" />,
    type: 'subscription',
  },
  {
    name: 'Studio',
    price: '$79',
    priceId: 'price_1SfMrH2c02b28KeeVuN2W2fE',
    generations: 60,
    description: 'For architecture firms and teams',
    features: [
      '60 generations per month',
      'Everything in Pro',
      'Team collaboration',
      'Bulk processing',
      'Dedicated support',
    ],
    icon: <Building2 className="w-6 h-6" />,
    type: 'subscription',
  },
];

const payPerUse = {
  name: 'Pay Per Use',
  price: '$3',
  priceId: 'price_1SfMrH2c02b28KeenQ4hN86Y',
  description: 'Need just a few more? Buy individual generations',
  icon: <CreditCard className="w-6 h-6" />,
};

export function Pricing() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast({
        title: 'Success!',
        description: 'Your purchase was successful. Your account has been updated.',
      });
      window.history.replaceState({}, '', '/pricing');
    }
    if (params.get('canceled') === 'true') {
      toast({
        title: 'Canceled',
        description: 'Your purchase was canceled.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/pricing');
    }
  }, [toast]);

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!user) {
      setLocation('/api/login');
      return;
    }

    if (plan.type === 'free') {
      setLocation('/upload');
      return;
    }

    if (!plan.priceId) return;

    setProcessingPlan(plan.name);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const handlePayPerUse = async (count: number) => {
    if (!user) {
      setLocation('/api/login');
      return;
    }

    setProcessingPlan('pay_per_use');
    try {
      const response = await fetch('/api/subscription/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: payPerUse.priceId, count }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Choose the plan that works for you. Start with 2 free generations, then upgrade when you're ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              data-testid={`card-plan-${plan.name.toLowerCase()}`}
              className={`relative bg-zinc-900/50 border-zinc-800 hover:border-orange-500/50 transition-all duration-300 ${
                plan.popular ? 'ring-2 ring-orange-500 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 mx-auto mb-3 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                  {plan.icon}
                </div>
                <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-zinc-400">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.type === 'subscription' && (
                    <span className="text-zinc-400">/month</span>
                  )}
                </div>
                <div className="text-orange-500 font-medium mb-4">
                  {plan.generations} generations{plan.type === 'subscription' ? '/mo' : ''}
                </div>
                <ul className="text-left space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-zinc-300 text-sm">
                      <Check className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  data-testid={`button-subscribe-${plan.name.toLowerCase()}`}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                  onClick={() => handleSubscribe(plan)}
                  disabled={processingPlan === plan.name}
                >
                  {processingPlan === plan.name
                    ? 'Processing...'
                    : plan.type === 'free'
                    ? 'Get Started'
                    : 'Subscribe'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
              {payPerUse.icon}
            </div>
            <CardTitle className="text-white text-xl">{payPerUse.name}</CardTitle>
            <CardDescription className="text-zinc-400">
              {payPerUse.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">{payPerUse.price}</span>
              <span className="text-zinc-400"> per generation</span>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {[1, 5, 10].map((count) => (
                <Button
                  key={count}
                  data-testid={`button-buy-${count}`}
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500"
                  onClick={() => handlePayPerUse(count)}
                  disabled={processingPlan === 'pay_per_use'}
                >
                  Buy {count} for ${count * 3}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
