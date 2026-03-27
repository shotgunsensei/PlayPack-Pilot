import { ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useLocation } from 'wouter';

interface PlanGateProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
}

export function PlanGate({ children, feature, fallback }: PlanGateProps) {
  const { isProUser } = useAppStore();
  const [, setLocation] = useLocation();

  if (isProUser) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <Card className="glass-card p-8 flex flex-col items-center text-center border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">Pro Feature</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {feature} is available on the Pro plan. Upgrade to unlock unlimited projects, premium exports, and more.
      </p>
      <Button onClick={() => setLocation('/pricing')} className="bg-gradient-to-r from-primary to-accent border-0">
        View Plans
      </Button>
    </Card>
  );
}

export function UpgradePrompt({ message }: { message: string }) {
  const { isProUser } = useAppStore();
  const [, setLocation] = useLocation();

  if (isProUser) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl">
      <Lock className="w-4 h-4 text-primary shrink-0" />
      <p className="text-sm text-muted-foreground flex-1">{message}</p>
      <Button size="sm" variant="outline" className="shrink-0 border-primary/30 text-primary" onClick={() => setLocation('/pricing')}>
        Upgrade
      </Button>
    </div>
  );
}
