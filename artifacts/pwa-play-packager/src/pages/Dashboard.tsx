import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Settings, Key, Send, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { calculateReadiness } from '@/lib/validators';
import { ScoreRing } from '@/components/ScoreRing';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';

export default function Dashboard() {
  const { project, signing } = useAppStore();
  const readiness = calculateReadiness(project, signing);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={item}>
        <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">Project overview and deployment readiness.</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 glass-card p-8 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Deployment Readiness</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Your overall score indicating how ready your project is for Google Play generation and submission.
          </p>
          <div className="flex items-center gap-8">
            <ScoreRing percentage={readiness.overallPercentage} size={140} strokeWidth={12} />
            <div className="space-y-3 flex-1">
              {readiness.scores.map(s => (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-muted-foreground">{s.score}/{s.maxScore}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${s.percentage === 100 ? 'bg-green-500' : 'bg-primary'}`} 
                      style={{ width: `${s.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6 flex flex-col">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" /> Action Items
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {readiness.scores.flatMap(s => s.missingItems).length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-muted-foreground text-sm flex-col gap-2">
                <ShieldCheck className="w-8 h-8 text-green-500/50" />
                All basic checks passed!
              </div>
            ) : (
              readiness.scores.flatMap(s => s.missingItems).slice(0, 5).map((issue, idx) => (
                <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                  {issue}
                </div>
              ))
            )}
            {readiness.scores.flatMap(s => s.missingItems).length > 5 && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                + {readiness.scores.flatMap(s => s.missingItems).length - 5} more issues
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Project Setup", icon: Settings, link: "/setup", desc: "Configure manifest & details", active: true },
          { title: "Signing & Keys", icon: Key, link: "/signing", desc: "Manage Keystore details", active: true },
          { title: "Validation", icon: ShieldCheck, link: "/validation", desc: "Verify URLs and formats", active: true },
          { title: "Release Prep", icon: Send, link: "/checklist", desc: "Final pre-flight checks", active: true },
        ].map((card, i) => (
          <Link key={i} href={card.link}>
            <Card className="p-5 glass-card hover:bg-white/5 cursor-pointer transition-all duration-300 hover:border-primary/50 group hover:-translate-y-1">
              <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <card.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-foreground mb-1">{card.title}</h3>
              <p className="text-xs text-muted-foreground">{card.desc}</p>
            </Card>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}
