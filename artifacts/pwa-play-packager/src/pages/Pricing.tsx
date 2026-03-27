import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { Check, X, Rocket, ArrowLeft, Crown } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out PlayPack Pilot with a single project.',
    cta: 'Get Started',
    highlight: false,
    features: [
      { text: '1 saved project', included: true },
      { text: 'All generators', included: true },
      { text: 'Basic validation', included: true },
      { text: 'Individual file export', included: true },
      { text: 'Example project loader', included: true },
      { text: 'Unlimited projects', included: false },
      { text: 'Premium export package', included: false },
      { text: 'Branded documentation', included: false },
      { text: 'Signing profiles', included: false },
      { text: 'CI/CD presets', included: false },
      { text: 'Deployment report', included: false },
      { text: 'Project duplication', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For developers shipping multiple PWAs to the Play Store.',
    cta: 'Upgrade to Pro',
    highlight: true,
    features: [
      { text: 'Unlimited saved projects', included: true },
      { text: 'All generators', included: true },
      { text: 'Advanced validation with severity levels', included: true },
      { text: 'Complete ZIP export package', included: true },
      { text: 'Example project loader', included: true },
      { text: 'Unlimited projects', included: true },
      { text: 'Premium export package', included: true },
      { text: 'Branded documentation export', included: true },
      { text: 'Reusable signing profiles', included: true },
      { text: 'CI/CD presets', included: true },
      { text: 'Final deployment report', included: true },
      { text: 'Project duplication & archive', included: true },
    ],
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { isProUser, upgradePlan, user } = useAppStore();

  const handleUpgrade = () => {
    upgradePlan();
    setLocation('/projects');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-primary" />
            <span className="font-display font-bold">PlayPack Pilot</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade when you need unlimited projects and premium features.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`p-8 h-full flex flex-col ${plan.highlight ? 'border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5 shadow-xl shadow-primary/10' : 'glass-card'}`}>
                {plan.highlight && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-4 uppercase tracking-wider">
                    <Crown className="w-4 h-4" /> Most Popular
                  </div>
                )}
                <h2 className="text-2xl font-bold text-foreground">{plan.name}</h2>
                <div className="flex items-baseline gap-1 mt-2 mb-1">
                  <span className="text-4xl font-bold font-display text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                <Button
                  className={`w-full mb-6 ${plan.highlight ? 'bg-gradient-to-r from-primary to-accent border-0 shadow-lg' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                  onClick={() => {
                    if (plan.highlight && !isProUser) handleUpgrade();
                    else setLocation('/projects');
                  }}
                  disabled={plan.highlight && isProUser}
                >
                  {plan.highlight && isProUser ? 'Current Plan' : plan.cta}
                </Button>

                <div className="space-y-3 flex-1">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-3 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                      )}
                      <span className={f.included ? 'text-foreground' : 'text-muted-foreground/50'}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground/60 max-w-lg mx-auto">
            Payment processing is not yet connected. Upgrading to Pro currently activates features locally for demonstration purposes.
            Stripe integration will be available in a future release.
          </p>
        </div>
      </div>
    </div>
  );
}
