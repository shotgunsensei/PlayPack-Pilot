import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/lib/store';

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
}

interface ChecklistPanelProps {
  title: string;
  items: ChecklistItem[];
}

export function ChecklistPanel({ title, items }: ChecklistPanelProps) {
  const { checklist, updateChecklist } = useAppStore();

  const completedCount = items.filter(item => checklist[item.id]).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <Card className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <span className={`text-sm font-mono ${progress === 100 ? 'text-green-500' : 'text-muted-foreground'}`}>
          {completedCount}/{items.length}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-primary'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <label
            key={item.id}
            className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/[0.07] transition-colors"
          >
            <Checkbox
              checked={!!checklist[item.id]}
              onCheckedChange={(checked) => updateChecklist(item.id, !!checked)}
              className="mt-0.5"
            />
            <div>
              <p className={`text-sm font-medium ${checklist[item.id] ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {item.label}
              </p>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </Card>
  );
}
