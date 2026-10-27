import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { releaseChecklistGroups, getReleaseChecklistProgress } from '@/lib/release-checklist';
export default function ReleaseChecklist() {
  const { checklist, updateChecklist } = useAppStore();

  const { progress } = getReleaseChecklistProgress(checklist);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Release Checklist</h1>
          <p className="text-muted-foreground mt-1">Track your progress from local build to Play Store review.</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shrink-0">
          <div className="text-sm font-bold text-foreground">{progress}% Complete</div>
          <div className="w-32 h-2 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {releaseChecklistGroups.map((group, idx) => (
          <Card key={idx} className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4 text-foreground">{group.category}</h2>
            <div className="space-y-4">
              {group.items.map((item) => (
                <label 
                  key={item.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    checklist[item.id] === true ? 'bg-primary/5 border-primary/20' : 'bg-transparent border-transparent hover:bg-white/5'
                  }`}
                >
                  <Checkbox 
                    className="mt-0.5" 
                    checked={checklist[item.id] === true}
                    onCheckedChange={(checked) => updateChecklist(item.id, checked === true)} 
                  />
                  <span className={`text-sm select-none ${checklist[item.id] === true ? 'text-foreground/80 line-through' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
