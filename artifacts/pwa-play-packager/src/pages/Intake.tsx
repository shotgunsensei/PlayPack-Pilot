import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Globe, Upload, PenTool, BookOpen, Crown, Lock, ArrowRight, Sparkles } from 'lucide-react';

const modes = [
  {
    id: 'website',
    title: 'Scan a Live Website',
    description: 'Paste any URL. We fetch the page and look for a web manifest, theme colors, icons, service worker, and other PWA signals.',
    hint: 'Best for: existing websites you want to package as an Android app',
    icon: Globe,
    color: 'from-blue-500 to-cyan-500',
    route: '/analyze/site',
    free: true,
    recommended: true,
  },
  {
    id: 'repo',
    title: 'Upload a Project ZIP',
    description: 'Upload your project source as a ZIP. We inspect the file tree for manifest files, framework configs, icons, and service workers.',
    hint: 'Best for: source code not yet deployed, or projects behind a login',
    icon: Upload,
    color: 'from-violet-500 to-purple-500',
    route: '/analyze/repo',
    free: false,
    recommended: false,
  },
  {
    id: 'manual',
    title: 'Set Up Manually',
    description: 'Skip the analysis and fill in every field yourself. You can always run analysis later on a different project.',
    hint: 'Best for: users who already know their app details',
    icon: PenTool,
    color: 'from-emerald-500 to-green-500',
    route: '/projects',
    free: true,
    recommended: false,
  },
  {
    id: 'example',
    title: 'Explore with an Example',
    description: 'Load a pre-filled sample project to see every step of the workflow before committing to your own app.',
    hint: 'Best for: first-time users exploring the tool',
    icon: BookOpen,
    color: 'from-amber-500 to-orange-500',
    route: null,
    free: true,
    recommended: false,
  },
];

export default function Intake() {
  const [, setLocation] = useLocation();
  const { loadExampleProject, isProUser } = useAppStore();

  const handleMode = (mode: typeof modes[0]) => {
    if (mode.id === 'example') {
      loadExampleProject();
      setLocation('/');
      return;
    }
    if (!mode.free && !isProUser) {
      setLocation('/pricing');
      return;
    }
    if (mode.route) {
      setLocation(mode.route);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-8 px-4"
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-3">Create a New Project</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Start by scanning a website or uploading source files. We will extract what we can and let you review everything before applying it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {modes.map((mode, i) => {
          const Icon = mode.icon;
          const locked = !mode.free && !isProUser;
          return (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card
                className={`relative p-6 cursor-pointer border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 group ${locked ? 'opacity-75 border-border/40 hover:border-border/60' : 'border-border/50 hover:border-primary/50'} ${mode.recommended ? 'ring-1 ring-primary/30' : ''}`}
                onClick={() => handleMode(mode)}
              >
                {mode.recommended && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                      <Sparkles className="w-3 h-3" /> Recommended
                    </span>
                  </div>
                )}
                {locked && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full font-medium">
                      <Crown className="w-3 h-3" /> Pro
                    </span>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  {locked ? <Lock className="w-6 h-6 text-white" /> : <Icon className="w-6 h-6 text-white" />}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{mode.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{mode.description}</p>
                <p className="text-xs text-muted-foreground/70 italic">{mode.hint}</p>
                <div className="flex items-center gap-1 text-xs text-primary font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {locked ? 'View plans' : mode.id === 'example' ? 'Load example' : 'Get started'} <ArrowRight className="w-3 h-3" />
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center mt-10 space-y-1">
        <p className="text-xs text-muted-foreground">
          Website scans run through a secure proxy. ZIP files are analyzed in your browser. Nothing is stored on our servers.
        </p>
        <p className="text-xs text-muted-foreground/60">
          PlayPack Pilot helps you prepare packaging files. It does not build, sign, or publish Android apps directly.
        </p>
      </div>
    </motion.div>
  );
}
