import { Link, useLocation } from 'wouter';
import { Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { calculateReadiness } from '@/lib/validators';

const steps = [
  { path: '/setup', label: 'Project Setup', step: 1 },
  { path: '/validation', label: 'PWA Validation', step: 2 },
  { path: '/signing', label: 'Signing Planner', step: 3 },
  { path: '/asset-links', label: 'Asset Links', step: 4 },
  { path: '/bubblewrap', label: 'Bubblewrap Build', step: 5 },
  { path: '/github-actions', label: 'GitHub Actions', step: 6 },
  { path: '/checklist', label: 'Release Checklist', step: 7 },
  { path: '/docs', label: 'Docs Export', step: 8 },
  { path: '/export', label: 'File Export', step: 9 },
];

export function StepWizard() {
  const [location] = useLocation();
  const { project, signing } = useAppStore();
  const readiness = calculateReadiness(project, signing);

  const currentStepIndex = steps.findIndex(s => s.path === location);

  const getStepStatus = (index: number) => {
    if (index < currentStepIndex) return 'complete';
    if (index === currentStepIndex) return 'current';
    return 'upcoming';
  };

  if (location === '/') return null;

  return (
    <div className="mb-6 pb-6 border-b border-border/50">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
        <p className="text-xs text-muted-foreground">
          Overall Readiness: <span className="text-primary font-bold">{readiness.overallPercentage}%</span>
        </p>
      </div>
      <div className="flex gap-1">
        {steps.map((step, idx) => {
          const status = getStepStatus(idx);
          return (
            <Link key={step.path} href={step.path} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-colors cursor-pointer ${
                  status === 'complete' ? 'bg-green-500' :
                  status === 'current' ? 'bg-primary' :
                  'bg-white/10'
                }`}
                title={step.label}
              />
            </Link>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        {currentStepIndex > 0 && (
          <Link href={steps[currentStepIndex - 1].path}>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              &larr; {steps[currentStepIndex - 1].label}
            </button>
          </Link>
        )}
        <div className="flex-1" />
        {currentStepIndex < steps.length - 1 && (
          <Link href={steps[currentStepIndex + 1].path}>
            <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
              {steps[currentStepIndex + 1].label} &rarr;
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
