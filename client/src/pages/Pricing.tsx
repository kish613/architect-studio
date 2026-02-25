import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Sparkles, Building2, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/ui/page-transition';

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
    price: '£0',
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
    price: '£7',
    priceId: 'price_1ShCuEKa4ONQEKZdgxUo8zFM',
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
    price: '£23',
    priceId: 'price_1ShCuFKa4ONQEKZdIkYue80S',
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
    price: '£63',
    priceId: 'price_1ShCuGKa4ONQEKZdrJgImeWA',
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
  price: '£2.50',
  priceId: 'price_1ShCuGKa4ONQEKZdA5jz5rwe',
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
      setLocation('/api/auth/login');
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
      setLocation('/api/auth/login');
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
    <Layout>
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 dark-blueprint-grid">
          <div className="container mx-auto px-4 py-16">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Simple, Transparent Pricing
              </h1>
              <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto mb-4" />
              <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                Choose the plan that works for you. Start with 2 free generations, then upgrade when you're ready.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.1 }}
                >
                  <Card
                    data-testid={`card-plan-${plan.name.toLowerCase()}`}
                    className={`relative bg-zinc-900/50 border-zinc-800 hover:border-orange-500/50 hover:translate-y-[-4px] transition-all duration-300 rounded-2xl h-full ${
                      plan.popular ? 'ring-2 ring-orange-500 scale-105 shadow-xl shadow-orange-500/10' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg shadow-orange-500/30">
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
                          <motion.li
                            key={i}
                            className="flex items-center text-zinc-300 text-sm"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + i * 0.05 + 0.3 }}
                          >
                            <Check className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
                            {feature}
                          </motion.li>
                        ))}
                      </ul>
                      <Button
                        data-testid={`button-subscribe-${plan.name.toLowerCase()}`}
                        className={`w-full ${
                          plan.popular
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
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
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
            >
              <Card className="dark-glass-card rounded-2xl border-zinc-800 max-w-2xl mx-auto hover:border-primary/20 transition-all duration-300">
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
                        className="border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500 transition-all duration-200"
                        onClick={() => handlePayPerUse(count)}
                        disabled={processingPlan === 'pay_per_use'}
                      >
                        Buy {count} for £{(count * 2.5).toFixed(2)}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
}
