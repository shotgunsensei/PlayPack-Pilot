import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  description?: string;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

const statusColors = {
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  neutral: 'text-primary',
};

export function StatusCard({ icon: Icon, title, value, description, status = 'neutral' }: StatusCardProps) {
  return (
    <Card className="glass-card p-5">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 ${statusColors[status]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-lg font-bold ${statusColors[status]}`}>{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
    </Card>
  );
}
